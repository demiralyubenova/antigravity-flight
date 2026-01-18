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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Removing background from image using Lovable AI...');

    // Fetch the image and convert to base64 data URL
    let imageDataUrl: string;
    
    if (imageUrl.startsWith('data:')) {
      imageDataUrl = imageUrl;
    } else {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.split(';')[0];
      const arrayBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const imageBase64 = btoa(binary);
      imageDataUrl = `data:${mimeType};base64,${imageBase64}`;
    }

    // Use Lovable AI image editing with Gemini
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Remove the background from this image completely. Replace the background with pure white (#FFFFFF). Keep only the main subject (the clothing item, shoe, or accessory) with clean, crisp edges. The result should look like a professional e-commerce product photo with a clean white background.'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      
      if (response.status === 429) {
        console.log('Rate limited, returning original image');
        return new Response(
          JSON.stringify({ processedImageUrl: imageUrl, fallback: true, error: 'Rate limit exceeded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.log('Credits exhausted, returning original image');
        return new Response(
          JSON.stringify({ processedImageUrl: imageUrl, fallback: true, error: 'AI credits exhausted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Returning original image as fallback');
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Extract the generated image from the response
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (generatedImageUrl) {
      console.log('Background removed successfully');
      return new Response(
        JSON.stringify({ processedImageUrl: generatedImageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No image generated, returning original');
    return new Response(
      JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error removing background:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
