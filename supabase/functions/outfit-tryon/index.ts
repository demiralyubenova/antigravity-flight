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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Creating outfit try-on with', clothingItems.length, 'items');

    // Analyze the person image using GPT-4o vision
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    const personAnalysis = await fetch('https://api.openai.com/v1/chat/completions', {
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
            { type: 'text', text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, facial features, and overall appearance. Be specific so an image can be accurately recreated. Keep under 200 words.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${personImageBase64}` } }
          ]
        }],
        max_tokens: 300
      }),
    });

    if (!personAnalysis.ok) {
      const errorText = await personAnalysis.text();
      console.error('Person analysis failed:', errorText);
      throw new Error('Failed to analyze person image');
    }

    const personData = await personAnalysis.json();
    const personDescription = personData.choices?.[0]?.message?.content || 'a person';

    // Build outfit description from item names
    const itemDescriptions = clothingItems.map((item: any) => 
      `${item.name} (${item.category})`
    ).join(', ');

    console.log('Generating outfit try-on with items:', itemDescriptions);

    // Generate the try-on image using DALL-E 3
    const prompt = `Professional fashion photography of ${personDescription.substring(0, 500)} wearing a complete outfit consisting of: ${itemDescriptions}. Full body shot, natural confident pose, studio lighting with soft shadows, clean neutral background. High quality fashion editorial style. The clothing items fit perfectly and complement each other beautifully. Photorealistic style.`;

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
        size: '1024x1792',
        quality: 'standard',
        response_format: 'b64_json'
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('DALL-E error:', errorText);
      
      if (dalleResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (dalleResponse.status === 402 || dalleResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'API key issue. Please check your OpenAI billing.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Image generation not available. Please try again later.');
    }

    const dalleData = await dalleResponse.json();
    const generatedImageBase64 = dalleData.data?.[0]?.b64_json;

    if (!generatedImageBase64) {
      console.error('No image in response:', JSON.stringify(dalleData));
      throw new Error('No try-on image generated');
    }

    const tryOnImageUrl = `data:image/png;base64,${generatedImageBase64}`;
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
