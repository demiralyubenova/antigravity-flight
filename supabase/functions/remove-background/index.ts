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

    console.log('Removing background from image using Gemini...');

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

    // Use Gemini 2.0 Flash Exp with image generation capabilities
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Remove the background from this image completely. Replace the background with pure white (#FFFFFF). Keep only the main subject (the clothing item, shoe, or accessory) with clean, crisp edges. The result should look like a professional e-commerce product photo with a clean white background. Output only the edited image.'
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      
      // Try with alternative model name
      console.log('Trying alternative model gemini-2.0-flash-exp...');
      
      const altResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Edit this image: Remove the background completely and replace it with pure white (#FFFFFF). Keep only the clothing item/product with clean edges. Return the edited image.'
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }),
      });

      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error('Alternative model error:', altErrorText);
        console.log('Returning original image as fallback');
        return new Response(
          JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const altData = await altResponse.json();
      const altParts = altData.candidates?.[0]?.content?.parts || [];
      const altImagePart = altParts.find((part: any) => part.inlineData);
      
      if (altImagePart?.inlineData) {
        const generatedImage = `data:${altImagePart.inlineData.mimeType || 'image/png'};base64,${altImagePart.inlineData.data}`;
        console.log('Background removed successfully with alternative model');
        
        return new Response(
          JSON.stringify({ processedImageUrl: generatedImage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('No image in alternative response, returning original');
      return new Response(
        JSON.stringify({ processedImageUrl: imageUrl, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Gemini API response received');

    // Extract the generated image from the response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: any) => part.inlineData);
    
    if (imagePart?.inlineData) {
      const generatedImage = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
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
