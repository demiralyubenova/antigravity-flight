import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personImageUrl, clothingItems } = await req.json();

    if (!personImageUrl || !clothingItems || clothingItems.length === 0) {
      throw new Error('Person image and at least one clothing item are required');
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    console.log('Creating outfit try-on with', clothingItems.length, 'items using Google Gemini');

    // Fetch person image as base64
    const { base64: personImageBase64, mimeType: personMimeType } = await fetchImageAsBase64WithMime(personImageUrl);

    // Build outfit description from item names
    const itemDescriptions = clothingItems.map((item: any) => 
      `${item.name} (${item.category})`
    ).join(', ');

    console.log('Generating outfit try-on with items:', itemDescriptions);

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
              parts: [
                {
                  text: `Generate a high-quality fashion photography image based on this reference photo. The model should wear: ${itemDescriptions}.

Requirements:
- Use the reference photo as inspiration for body type, pose, and setting
- Create professional full-body fashion photography
- Show the clothing items styled together naturally
- Use studio lighting with a clean neutral background
- Maintain a confident, natural pose
- Photorealistic quality

Style: Editorial fashion photography`,
                },
                {
                  inline_data: {
                    mime_type: personMimeType,
                    data: personImageBase64,
                  },
                },
              ],
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
    console.error('Error in outfit try-on:', error);
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
          console.log('Outfit try-on completed successfully');
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
