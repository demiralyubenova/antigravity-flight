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

    const VISION_SERVICE_URL = Deno.env.get('VISION_SERVICE_URL') || 'http://host.docker.internal:8000/analyze';

    console.log(`Analyzing clothing image with local Vision Service at ${VISION_SERVICE_URL}...`);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
    }
    const imageBlob = await imageResponse.blob();

    // Prepare multipart form data
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.jpg');

    // Call local Python microservice
    const response = await fetch(VISION_SERVICE_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision Service error:', response.status, errorText);
      throw new Error(`Vision Service error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Vision Service response:', JSON.stringify(result));

    // Construct the response expected by the frontend/DB
    const clothingInfo = {
      name: result.name,
      category: result.category.toLowerCase(),
      type: result.type,
      color: result.color.charAt(0).toUpperCase() + result.color.slice(1).toLowerCase(),
      brand: "", // Local classifier doesn't handle brands yet
      ai_description: `${result.color.charAt(0).toUpperCase() + result.color.slice(1).toLowerCase()} ${result.type.toLowerCase()} classified as ${result.category.toLowerCase()}.`,
      confidence: result.confidence
    };

    console.log('Processed clothing info:', clothingInfo);

    return new Response(
      JSON.stringify(clothingInfo),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing clothing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
