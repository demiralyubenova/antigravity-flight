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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Creating outfit try-on with', clothingItems.length, 'items');

    // Analyze the person image
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    const personAnalysis = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, facial features, and overall appearance. Be specific so an image can be accurately recreated.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${personImageBase64}` } }
          ]
        }]
      }),
    });

    if (!personAnalysis.ok) {
      console.error('Person analysis failed:', await personAnalysis.text());
      throw new Error('Failed to analyze person image');
    }

    const personData = await personAnalysis.json();
    const personDescription = personData.choices?.[0]?.message?.content || 'a person';

    // Build outfit description from item names
    const itemDescriptions = clothingItems.map((item: any) => 
      `${item.name} (${item.category})`
    ).join(', ');

    console.log('Generating outfit try-on with items:', itemDescriptions);

    // Generate the try-on image using Lovable AI
    const prompt = `Professional fashion photography of ${personDescription} wearing a complete outfit consisting of: ${itemDescriptions}. Full body shot, natural confident pose, studio lighting with soft shadows, clean neutral background. High quality fashion editorial style. The clothing items fit perfectly and complement each other beautifully. Photorealistic, 8k quality.`;

    const imageGenResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: prompt
        }],
        modalities: ['image', 'text']
      }),
    });

    if (!imageGenResponse.ok) {
      const errorText = await imageGenResponse.text();
      console.error('Image generation error:', errorText);
      
      if (imageGenResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (imageGenResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Image generation not available. Please try again later.');
    }

    const imageGenData = await imageGenResponse.json();
    const generatedImageUrl = imageGenData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error('No image in response:', JSON.stringify(imageGenData));
      throw new Error('No try-on image generated');
    }

    console.log('Outfit try-on completed successfully');

    return new Response(
      JSON.stringify({ tryOnImageUrl: generatedImageUrl }),
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
