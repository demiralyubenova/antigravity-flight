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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Removing background from image using OpenAI...');

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

    // Step 1: Use GPT-4o to analyze the clothing item in detail
    console.log('Analyzing image with GPT-4o...');
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this clothing item/accessory in precise detail for recreating it: type, exact colors, patterns, textures, materials, brand logos if visible, stitching, buttons, zippers, and all distinctive features. Be extremely specific about every visual detail. Keep under 300 words.'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }],
        max_tokens: 400
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('GPT-4o analysis error:', errorText);
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysisData = await analysisResponse.json();
    const itemDescription = analysisData.choices?.[0]?.message?.content || '';
    console.log('Item analyzed:', itemDescription.substring(0, 100) + '...');

    // Step 2: Use DALL-E 3 to generate the item on white background
    console.log('Generating clean product image with DALL-E 3...');
    const prompt = `Professional e-commerce product photography of ${itemDescription.substring(0, 3500)}. Clean pure white background (#FFFFFF). The item is centered, well-lit with soft studio lighting, no shadows on background. Photorealistic, high resolution product shot. Only the clothing item/accessory visible, nothing else.`;

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.substring(0, 4000),
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json'
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('DALL-E error:', errorText);
      
      if (dalleResponse.status === 429) {
        return new Response(
          JSON.stringify({ processedImageUrl: imageUrl, fallback: true, error: 'Rate limit exceeded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dalleData = await dalleResponse.json();
    const generatedImageBase64 = dalleData.data?.[0]?.b64_json;

    if (generatedImageBase64) {
      const processedImageUrl = `data:image/png;base64,${generatedImageBase64}`;
      console.log('Background removed successfully');
      return new Response(
        JSON.stringify({ processedImageUrl }),
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
