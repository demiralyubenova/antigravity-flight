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
    const { personImageUrl, clothingItems } = await req.json();

    if (!personImageUrl || !clothingItems || clothingItems.length === 0) {
      throw new Error('Person image and at least one clothing item are required');
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    console.log('Creating outfit try-on with', clothingItems.length, 'items');

    // Analyze the person image
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    const personAnalysis = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, facial features, and overall appearance. Be specific so an image can be accurately recreated.' },
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

    // Build outfit description from item names
    const itemDescriptions = clothingItems.map((item: any) => 
      `${item.name} (${item.category})`
    ).join(', ');

    console.log('Generating outfit try-on with items:', itemDescriptions);

    // Generate the try-on image using Imagen
    const prompt = `Professional fashion photography of ${personDescription} wearing a complete outfit consisting of: ${itemDescriptions}. Full body shot, natural confident pose, studio lighting with soft shadows, clean neutral background. High quality fashion editorial style. The clothing items fit perfectly and complement each other beautifully. Photorealistic, 8k quality.`;

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
      
      if (imagenResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Image generation not available. Please try again later.');
    }

    const imagenData = await imagenResponse.json();
    const generatedImage = imagenData.predictions?.[0]?.bytesBase64Encoded;

    if (!generatedImage) {
      throw new Error('No try-on image generated');
    }

    const tryOnImageUrl = `data:image/png;base64,${generatedImage}`;
    console.log('Outfit try-on completed successfully');

    return new Response(
      JSON.stringify({ tryOnImageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in outfit try-on:', error);
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
