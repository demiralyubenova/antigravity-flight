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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with', items.length, 'items using Lovable AI');

    // Fetch person image as base64
    const { base64: personImageBase64, mimeType: personMimeType } = await fetchImageAsBase64WithMime(personImageUrl);
    
    // Build clothing descriptions
    const clothingDescriptions = items.map((item, i) => 
      `Item ${i + 1}: ${item.name || item.type || 'clothing item'} (${item.category || 'clothing'})`
    ).join(', ');

    // Build content array with person image and all clothing images
    const contentParts: any[] = [
      {
        type: 'text',
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
        type: 'image_url',
        image_url: {
          url: `data:${personMimeType};base64,${personImageBase64}`
        }
      }
    ];

    // Add all clothing images
    for (const item of items) {
      const { base64, mimeType } = await fetchImageAsBase64WithMime(item.imageUrl);
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64}`
        }
      });
    }

    console.log('Calling Lovable AI for virtual try-on with items:', clothingDescriptions);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: contentParts
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Image generation failed. Please try again.');
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Extract the generated image from the response
    const content = data.choices?.[0]?.message?.content;
    
    // Check if content is an array (multimodal response)
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          console.log('Virtual try-on completed successfully');
          return new Response(
            JSON.stringify({ tryOnImageUrl: part.image_url.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Check for inline image data in the response
    if (data.choices?.[0]?.message?.image) {
      const imageData = data.choices[0].message.image;
      const tryOnImageUrl = `data:${imageData.mime_type || 'image/png'};base64,${imageData.data}`;
      console.log('Virtual try-on completed successfully');
      return new Response(
        JSON.stringify({ tryOnImageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('No image in response:', JSON.stringify(data));
    throw new Error('No try-on image generated. Image generation may not be available for this model.');
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
