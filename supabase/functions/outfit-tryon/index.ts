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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    // Build the prompt with all clothing items
    const itemDescriptions = clothingItems.map((item: any, index: number) => 
      `Item ${index + 1}: ${item.name} (${item.category})`
    ).join(', ');

    console.log('Creating outfit try-on with items:', itemDescriptions);

    const prompt = `You are a virtual try-on assistant. Dress the person in the first image with ALL the clothing items shown in the subsequent images. 

The outfit consists of: ${itemDescriptions}

Create a photorealistic result where:
1. The person's face, pose, and body proportions are preserved exactly
2. ALL clothing items are applied together as a complete outfit
3. Items are layered correctly (e.g., jacket over shirt)
4. Shadows and highlights match the original photo's lighting
5. The result looks like an actual photo of the person wearing the complete outfit

Generate the final image.`;

    // Build content array with person image and all clothing images
    const parts: any[] = [{ text: prompt }];
    
    // Add person image
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: personImageBase64,
      },
    });

    // Add each clothing item image
    for (const item of clothingItems) {
      const clothingImageBase64 = await fetchImageAsBase64(item.image_url);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: clothingImageBase64,
        },
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["image", "text"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the generated image
    let tryOnImageUrl = null;
    const parts_response = data.candidates?.[0]?.content?.parts;
    
    if (parts_response) {
      for (const part of parts_response) {
        if (part.inlineData?.data) {
          tryOnImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!tryOnImageUrl) {
      throw new Error('No try-on image returned from AI');
    }

    console.log('Outfit try-on completed successfully');

    return new Response(
      JSON.stringify({ tryOnImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in outfit try-on:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchImageAsBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
