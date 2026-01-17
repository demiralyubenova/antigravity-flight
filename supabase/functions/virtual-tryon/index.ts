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
    const { personImageUrl, clothingImageUrl, clothingType } = await req.json();

    if (!personImageUrl || !clothingImageUrl) {
      throw new Error('Both person image and clothing image URLs are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with:', { personImageUrl: personImageUrl.substring(0, 50), clothingType });

    // Use AI to create virtual try-on composite
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a virtual try-on assistant. Take the person from the first image and realistically dress them in the clothing item (${clothingType || 'clothing'}) from the second image. 

Create a photorealistic result where:
1. The person's face, pose, and body proportions are preserved exactly
2. The clothing item naturally fits their body with proper perspective and lighting
3. Shadows and highlights match the original photo's lighting
4. The result looks like an actual photo of the person wearing that item

Generate the final image of the person wearing the clothing.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: personImageUrl,
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: clothingImageUrl,
                },
              },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response structure:', JSON.stringify(data, null, 2).substring(0, 500));

    // Try multiple possible response structures for image data
    let tryOnImageUrl: string | undefined;
    
    const choice = data.choices?.[0];
    if (choice?.message) {
      // Check for inline_data format (base64)
      const parts = choice.message.content;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inline_data?.data) {
            // Convert base64 to data URL
            const mimeType = part.inline_data.mime_type || 'image/png';
            tryOnImageUrl = `data:${mimeType};base64,${part.inline_data.data}`;
            break;
          }
          if (part.image_url?.url) {
            tryOnImageUrl = part.image_url.url;
            break;
          }
        }
      }
      
      // Check for images array
      if (!tryOnImageUrl && choice.message.images?.[0]) {
        const img = choice.message.images[0];
        if (img.image_url?.url) {
          tryOnImageUrl = img.image_url.url;
        } else if (img.url) {
          tryOnImageUrl = img.url;
        } else if (typeof img === 'string') {
          tryOnImageUrl = img;
        }
      }
      
      // Check for image field directly
      if (!tryOnImageUrl && choice.message.image) {
        tryOnImageUrl = choice.message.image;
      }
    }

    if (!tryOnImageUrl) {
      console.error('Full AI response:', JSON.stringify(data));
      throw new Error('No try-on image returned from AI. The model may not support image generation for this request.');
    }

    console.log('Try-on image generated successfully');

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
