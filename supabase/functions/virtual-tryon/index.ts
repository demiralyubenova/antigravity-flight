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

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with', items.length, 'items using Gemini');

    // Fetch person image as base64
    const { base64: personImageBase64, mimeType: personMimeType } = await fetchImageAsBase64WithMime(personImageUrl);
    
    // Build image parts for all clothing items
    const clothingParts: any[] = [];
    for (const item of items) {
      const { base64, mimeType } = await fetchImageAsBase64WithMime(item.imageUrl);
      clothingParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64
        }
      });
    }

    // Build the prompt for Gemini
    const clothingDescriptions = items.map((item, i) => 
      `Item ${i + 1}: ${item.name || item.type || 'clothing item'} (${item.category || 'clothing'})`
    ).join(', ');

    console.log('Calling Gemini for virtual try-on with items:', clothingDescriptions);

    // Use Gemini 2.0 Flash with image generation for virtual try-on
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Create a professional fashion photography image showing the person from the first image wearing ALL of the clothing items shown in the subsequent images. 

The person should:
- Maintain their exact appearance (face, body type, skin tone, hair)
- Be shown in a natural, confident pose
- Be photographed full-body with studio lighting

The clothing should:
- Fit the person naturally and realistically
- Maintain their exact colors, patterns, and details from the original images
- Be styled together as a cohesive outfit

Background: Clean, neutral studio background.
Style: High-quality fashion editorial photography.

Clothing items to dress the person in: ${clothingDescriptions}`
              },
              {
                inlineData: {
                  mimeType: personMimeType,
                  data: personImageBase64
                }
              },
              ...clothingParts
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Image generation failed. Please try again.');
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');

    // Extract the generated image from the response
    const candidates = geminiData.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const tryOnImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          console.log('Virtual try-on completed successfully');
          return new Response(
            JSON.stringify({ tryOnImageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.error('No image in response:', JSON.stringify(geminiData));
    throw new Error('No try-on image generated');
  } catch (error) {
    console.error('Error in virtual try-on:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
