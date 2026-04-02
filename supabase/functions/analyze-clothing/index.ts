// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('--- Analyze Clothing Request Received ---');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    console.log('Image URL received:', imageUrl?.substring(0, 50) + '...');

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const VISION_SERVICE_URL = Deno.env.get('VISION_SERVICE_URL') || 'http://192.168.0.5:8000/analyze';
    console.log('Using Vision Service URL:', VISION_SERVICE_URL);

    let imageBlob: Blob;
    if (imageUrl.startsWith('data:')) {
      console.log('Processing data URL...');
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    } else {
      console.log('Fetching image from URL...');
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
      }
      imageBlob = await imageResponse.blob();
    }
    console.log('Image converted to blob, size:', imageBlob.size);

    // Prepare multipart form data
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.jpg');

    const possibleUrls = [
      Deno.env.get('VISION_SERVICE_URL'),
      'http://192.168.0.5:8000/analyze',
      'http://host.docker.internal:8000/analyze',
      'http://localhost:8000/analyze',
      'http://127.0.0.1:8000/analyze'
    ].filter(Boolean) as string[];

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const url of possibleUrls) {
      try {
        console.log(`Attempting to reach Vision Service at ${url}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const attempt = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (attempt.ok) {
          response = attempt;
          console.log(`Successfully reached Vision Service at ${url}`);
          break;
        } else {
          console.warn(`Vision Service at ${url} returned ${attempt.status}`);
        }
      } catch (err: unknown) {
        console.warn(`Failed to reach Vision Service at ${url}: ${(err as Error).message}`);
        lastError = err as Error;
      }
    }

    if (!response) {
      const errorDetail = `Could not reach Vision Service. Tried: ${possibleUrls.join(', ')}. Last error: ${lastError?.message}`;
      console.error(errorDetail);
      throw new Error(errorDetail);
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
