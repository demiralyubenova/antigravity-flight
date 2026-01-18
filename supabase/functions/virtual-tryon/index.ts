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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with', items.length, 'items');

    // Build description of all items
    const clothingDescription = items.map((item, index) => {
      const name = item.name || item.type || `Item ${index + 1}`;
      const category = item.category || 'clothing';
      return `${name} (${category})`;
    }).join(', ');

    // Build the prompt
    const prompt = `You are a virtual try-on AI. Create a photorealistic image of the person wearing ALL of these clothing items: ${clothingDescription}.

IMPORTANT INSTRUCTIONS:
1. Keep the person's face, body shape, and pose EXACTLY as in the original photo
2. Replace their current clothing with the provided clothing items
3. Ensure proper fit and natural draping of the clothes on their body
4. Maintain realistic lighting and shadows consistent with the original photo
5. Layer items appropriately (e.g., jacket over shirt)
6. The result should look like an actual photograph, not a collage

Generate the final try-on image.`;

    // Prepare the content parts with all images
    const parts: any[] = [{ text: prompt }];
    
    // Add person image
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: personImageBase64,
      },
    });

    // Add all clothing item images
    for (const item of items) {
      const clothingImageBase64 = await fetchImageAsBase64(item.imageUrl);
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
    console.log('AI response received');

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

    console.log('Virtual try-on completed successfully');

    return new Response(
      JSON.stringify({ tryOnImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in virtual try-on:', error);
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
