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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    console.log('Starting virtual try-on with', items.length, 'items');

    // First, analyze the person image
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    const personAnalysis = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, and any visible features. Be specific so an image can be accurately recreated.' },
            { inlineData: { mimeType: 'image/jpeg', data: personImageBase64 } },
          ],
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
    });

    if (!personAnalysis.ok) {
      throw new Error('Failed to analyze person image');
    }

    const personData = await personAnalysis.json();
    const personDescription = personData.candidates?.[0]?.content?.parts?.[0]?.text || 'a person';

    // Analyze each clothing item
    const clothingDescriptions: string[] = [];
    for (const item of items) {
      const clothingBase64 = await fetchImageAsBase64(item.imageUrl);
      
      const clothingAnalysis = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Describe this clothing item in precise detail: type, color, pattern, material, style, and any distinctive features. Be very specific.' },
              { inlineData: { mimeType: 'image/jpeg', data: clothingBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      });

      if (clothingAnalysis.ok) {
        const clothingData = await clothingAnalysis.json();
        const desc = clothingData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (desc) clothingDescriptions.push(desc);
      }
    }

    console.log('Generating try-on image with Imagen...');

    // Generate the try-on image using Imagen
    const outfitDescription = clothingDescriptions.join('. Wearing also: ');
    const prompt = `Professional fashion photography of ${personDescription} wearing ${outfitDescription}. Full body shot, natural pose, studio lighting, clean background. High quality fashion editorial style photo. The clothing fits perfectly and looks natural on the person.`;

    const imagenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '3:4',
        },
      }),
    });

    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text();
      console.error('Imagen API error:', errorText);
      throw new Error('Image generation not available. Please try again later.');
    }

    const imagenData = await imagenResponse.json();
    const generatedImage = imagenData.predictions?.[0]?.bytesBase64Encoded;

    if (!generatedImage) {
      throw new Error('No try-on image generated');
    }

    const tryOnImageUrl = `data:image/png;base64,${generatedImage}`;
    console.log('Virtual try-on completed successfully');

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
