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

    // Use gemini-2.5-flash-image for image generation
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (errorText.includes('not available in your country')) {
        return new Response(
          JSON.stringify({ error: 'Image generation is not available in your region. Please try again later.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Try fallback to gemini-2.0-flash-exp model
      console.log('Trying fallback model gemini-2.0-flash-exp...');
      const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }),
      });
      
      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.text();
        console.error('Fallback also failed:', fallbackResponse.status, fallbackError);
        throw new Error('Image generation failed. The model may not support image generation.');
      }
      
      const fallbackData = await fallbackResponse.json();
      return processGeminiResponse(fallbackData, corsHeaders);
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

  // Extract the generated image from the response
  const candidates = data.candidates;
  if (candidates && candidates.length > 0) {
    const content = candidates[0].content;
    if (content && content.parts) {
      for (const part of content.parts) {
        if (part.inline_data) {
          const tryOnImageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
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
  throw new Error('No try-on image generated. Image generation may not be available for this model.');
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
