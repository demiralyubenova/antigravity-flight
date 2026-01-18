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

    console.log('Removing background from image using Imagen 3...');

    // Fetch the image and convert to base64
    let imageBase64: string;
    let mimeType: string = 'image/jpeg';
    
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBase64 = matches[2];
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      const contentType = imageResponse.headers.get('content-type');
      if (contentType) {
        mimeType = contentType.split(';')[0];
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      imageBase64 = btoa(binary);
    }

    // Use Imagen 3 for image editing (background removal)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-capability-001:predict?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: "Remove the background completely and replace with pure white (#FFFFFF). Keep only the clothing item with clean, crisp edges. Professional e-commerce product photo style.",
            image: {
              bytesBase64Encoded: imageBase64
            }
          }
        ],
        parameters: {
          sampleCount: 1,
          editMode: "inpaint-remove",
          editConfig: {
            editSubjectSegmentation: {
              segmentBackground: true
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Imagen API error:', errorText);
      
      // Try alternative: Use Gemini Flash Thinking for image editing
      console.log('Trying Gemini Flash with image generation...');
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Analyze this image and extract only the main clothing item/product. I want you to describe what you see.'
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        }),
      });

      if (!geminiResponse.ok) {
        console.log('Gemini analysis failed, returning original image');
        return new Response(
          JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If we can't do image editing with user's API, return original with fallback flag
      console.log('Image editing not available with current API, returning original');
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Imagen API response received');

    // Extract the generated image from the response
    const predictions = data.predictions || [];
    if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
      const generatedImage = `data:image/png;base64,${predictions[0].bytesBase64Encoded}`;
      console.log('Background removed successfully');
      
      return new Response(
        JSON.stringify({ processedImageUrl: generatedImage }),
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
