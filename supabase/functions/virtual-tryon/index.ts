import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClothingItemInput {
  imageUrl: string;
  type?: string;
  name?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { personImageUrl, clothingItems } = body;
    
    // Support legacy single-item format
    const items: ClothingItemInput[] = clothingItems || (body.clothingImageUrl ? [{
      imageUrl: body.clothingImageUrl,
      type: body.clothingType || 'clothing'
    }] : []);

    if (!personImageUrl || items.length === 0) {
      throw new Error('Person image and at least one clothing item are required');
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with', items.length, 'items using Google Gemini');

    // Fetch person image as base64
    const { base64: personImageBase64, mimeType: personMimeType } = await fetchImageAsBase64WithMime(personImageUrl);
    
    // Build clothing descriptions
    const clothingDescriptions = items.map((item, i) => 
      `Item ${i + 1}: ${item.name || item.type || 'clothing item'} (${item.category || 'clothing'})`
    ).join(', ');

    // Build parts array with person image and all clothing images
    const parts: any[] = [
      {
        text: `Generate a high-quality fashion photography image based on this reference photo. The model should wear: ${clothingDescriptions}.

Requirements:
- Use the reference photo as inspiration for body type, pose, and setting
- Create professional full-body fashion photography
- Show the clothing items styled together naturally
- Use studio lighting with a clean neutral background
- Maintain a confident, natural pose
- Photorealistic quality

Style: Editorial fashion photography`
      },
      {
        inline_data: {
          mime_type: personMimeType,
          data: personImageBase64
        }
      }
    ];

    // Add all clothing images
    for (const item of items) {
      const { base64, mimeType } = await fetchImageAsBase64WithMime(item.imageUrl);
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64
        }
      });
    }

    console.log('Calling Google Gemini for virtual try-on with items:', clothingDescriptions);

    // Use Gemini 2.5 Flash Image ("Nano Banana") for image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);

      if (errorText.includes('not available in your country')) {
        return new Response(
          JSON.stringify({ error: 'Image generation is not available in your region. Please try again later.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            error:
              'Image generation model "gemini-2.5-flash-image" is not available for this API key (404). Enable Gemini image generation in your Google project or use a key with access.',
            details: errorText,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Image generation request failed.', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return processGeminiResponse(data, corsHeaders);
  } catch (error) {
    console.error('Error in virtual try-on:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function processGeminiResponse(data: any, corsHeaders: Record<string, string>): Response {
  console.log('Gemini response received');

  // Check for safety/policy blocks first
  const candidates = data.candidates;
  if (candidates && candidates.length > 0) {
    const candidate = candidates[0];
    const finishReason = candidate.finishReason;
    const finishMessage = candidate.finishMessage;

    // Handle IMAGE_OTHER (safety filter or policy block)
    if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
      console.error('Image generation blocked:', finishReason, finishMessage);
      return new Response(
        JSON.stringify({
          error: 'Unable to generate image. The photo or clothing combination may have triggered safety filters. Try with a different photo or rephrasing your request.',
          details: finishMessage || 'Content policy restriction',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the generated image from the response
    const content = candidate.content;
    if (content && content.parts) {
      for (const part of content.parts) {
        const inline = part.inline_data ?? part.inlineData;
        const mimeType = inline?.mime_type ?? inline?.mimeType;
        const b64 = inline?.data;

        if (mimeType && b64) {
          const tryOnImageUrl = `data:${mimeType};base64,${b64}`;
          console.log('Virtual try-on completed successfully');
          return new Response(
            JSON.stringify({ tryOnImageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }

  console.error('No image in response:', JSON.stringify(data));
  throw new Error('No try-on image generated. Please try with a different photo.');
}

async function fetchImageAsBase64WithMime(url: string): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return { mimeType: matches[1], base64: matches[2] };
    }
    return { mimeType: 'image/jpeg', base64: url.split(',')[1] };
  }
  
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const mimeType = contentType.split(';')[0];
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { base64: btoa(binary), mimeType };
}
