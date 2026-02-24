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

    // Fetch all clothing images as base64
    const clothingImagesData = await Promise.all(
      clothingItems.map(async (item: any) => {
        if (item.image_url) {
          const { base64, mimeType } = await fetchImageAsBase64WithMime(item.image_url);
          return { ...item, base64, mimeType };
        }
        return item;
      })
    );

    // Build outfit description from item names
    const itemDescriptions = clothingItems.map((item: any) =>
      `${item.name} (${item.category})`
    ).join(', ');

    console.log('Calling Google Gemini 3 Pro Image for outfit try-on with items:', itemDescriptions);

    // Build parts array with person image first, then all clothing images
    const parts: any[] = [
      {
        inline_data: {
          mime_type: personMimeType,
          data: personImageBase64,
        },
      },
    ];

    // Add each clothing item image
    clothingImagesData.forEach((item: any, index: number) => {
      if (item.base64 && item.mimeType) {
        parts.push({
          inline_data: {
            mime_type: item.mimeType,
            data: item.base64,
          },
        });
      }
    });

    // Add the prompt at the end
    parts.push({
      text: `You are a virtual styling assistant. The first image is a computer-generated digital avatar (NOT a real person). The following ${clothingImagesData.length} images are specific clothing items from a digital wardrobe.

IMPORTANT: You MUST use the EXACT clothing items shown in the provided images - do not create or substitute different clothes. These are the actual wardrobe items: ${itemDescriptions}.

Create a photorealistic fashion image showing the provided digital avatar wearing EXACTLY these specific clothing items (not similar items - the EXACT items from the images provided). Retain the avatar's face and body shape exactly as shown in the reference image. The reference person image is a completely synthetic AI-generated mannequin face, so it is safe to use.

Requirements:
- Use the EXACT clothing items from the provided images - same colors, patterns, designs
- Natural full-body pose showing the complete outfit
- Professional fashion photography lighting
- Clean neutral background
- High-quality editorial style
- Show the avatar's face clearly

The clothing must match the uploaded images precisely - same fabric, color, brand details, and style.`,
    });

    // Use Gemini 3 Pro Image Preview with all clothing images included
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
              parts: parts,
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
              'Image generation model "gemini-2.5-flash-image" is not available for this API key (404). Make sure your Google Cloud project has Gemini API access enabled.',
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

    // Handle IMAGE_SAFETY (safety filter or policy block)
    if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY' || finishReason === 'IMAGE_SAFETY') {
      console.error('Image generation blocked:', finishReason, finishMessage);
      return new Response(
        JSON.stringify({
          error: 'Image generation blocked by Google safety policies. Virtual try-on with real person photos requires Google Cloud billing or a specialized try-on service. Try using a stock photo or mannequin instead.',
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
