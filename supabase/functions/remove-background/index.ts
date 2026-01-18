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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    console.log('Removing background from image...');

    // Fetch image as base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    // Use Gemini to describe and recreate the clothing item with white background
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Analyze this clothing item in detail. Describe the exact item including: type of clothing, color, pattern, style, brand if visible, and any distinctive features. Be very specific and detailed so the image can be recreated accurately.',
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!description) {
      throw new Error('Failed to analyze image');
    }

    console.log('Image analyzed, generating clean version...');

    // Use Imagen to generate a clean product photo
    const imagenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: `Professional product photography of ${description}. Clean white background, studio lighting, high quality e-commerce style photo. The clothing item is displayed flat or on invisible mannequin. No models, no shadows, pure white background.`,
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
        },
      }),
    });

    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text();
      console.error('Imagen API error:', errorText);
      
      // Fallback: return original image if Imagen is not available
      console.log('Imagen not available, returning original image');
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imagenData = await imagenResponse.json();
    const generatedImage = imagenData.predictions?.[0]?.bytesBase64Encoded;
    
    if (!generatedImage) {
      console.log('No image generated, returning original');
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedImageUrl = `data:image/png;base64,${generatedImage}`;

    return new Response(
      JSON.stringify({ processedImageUrl }),
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
