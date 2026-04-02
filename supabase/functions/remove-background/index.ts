// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('--- Remove Background Request Received ---');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    console.log('Image URL received:', imageUrl?.substring(0, 50) + '...');

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    // Convert image URL to blob
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
    formData.append('file', imageBlob, 'image.png');

    // Try multiple possible URLs for the local Python rembg service
    const possibleUrls = [
      Deno.env.get('VISION_SERVICE_URL')?.replace(/\/analyze$/, '/remove-bg'),
      'http://192.168.0.5:8000/remove-bg',
      'http://host.docker.internal:8000/remove-bg',
      'http://localhost:8000/remove-bg',
      'http://127.0.0.1:8000/remove-bg'
    ].filter(Boolean) as string[];

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const url of possibleUrls) {
      try {
        console.log(`Attempting to reach rembg service at ${url}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for bg removal

        const attempt = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (attempt.ok) {
          response = attempt;
          console.log(`Successfully reached rembg service at ${url}`);
          break;
        } else {
          console.warn(`rembg service at ${url} returned ${attempt.status}`);
        }
      } catch (err: unknown) {
        console.warn(`Failed to reach rembg service at ${url}: ${(err as Error).message}`);
        lastError = err as Error;
      }
    }

    if (!response) {
      const errorDetail = `Could not reach rembg service. Tried: ${possibleUrls.join(', ')}. Last error: ${lastError?.message}`;
      console.error(errorDetail);
      // Return fallback with original image
      return new Response(
        JSON.stringify({
          processedImageUrl: imageUrl,
          fallback: true,
          error: errorDetail
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The Python service returns PNG binary
    const imageBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binary);
    const processedImageUrl = `data:image/png;base64,${base64Image}`;

    console.log('Background removed successfully with local rembg service');

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
