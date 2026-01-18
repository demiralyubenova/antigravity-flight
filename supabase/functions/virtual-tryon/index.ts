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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!OPENAI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No API key configured for image generation');
    }

    console.log('Starting virtual try-on with', items.length, 'items');

    // First, analyze the person image using GPT-4o vision
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            { type: 'text', text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, and any visible features. Be specific so an image can be accurately recreated. Keep the description under 200 words.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${personImageBase64}` } }
          ]
        }],
        max_tokens: 300
      }),
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Person analysis failed:', errorText);
      throw new Error('Failed to analyze person image');
    }

    const analysisData = await analysisResponse.json();
    const personDescription = analysisData.choices?.[0]?.message?.content || 'a person';
    console.log('Person analyzed:', personDescription.substring(0, 100) + '...');

    // Analyze each clothing item
    const clothingDescriptions: string[] = [];
    for (const item of items) {
      const clothingBase64 = await fetchImageAsBase64(item.imageUrl);
      
      const clothingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              { type: 'text', text: 'Describe this clothing item in precise detail: type, color, pattern, material, style, and any distinctive features. Keep it under 100 words.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${clothingBase64}` } }
            ]
          }],
          max_tokens: 150
        }),
      });

      if (clothingResponse.ok) {
        const clothingData = await clothingResponse.json();
        const desc = clothingData.choices?.[0]?.message?.content;
        if (desc) clothingDescriptions.push(desc);
      }
    }

    console.log('Generating try-on image with DALL-E 3...');

    // Generate the try-on image using DALL-E 3
    const outfitDescription = clothingDescriptions.join('. Also wearing: ');
    const prompt = `Professional fashion photography of ${personDescription.substring(0, 500)} wearing ${outfitDescription.substring(0, 500)}. Full body shot, natural pose, studio lighting, clean background. High quality fashion editorial style photo. The clothing fits perfectly and looks natural.`;

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
      
      throw new Error('Image generation failed. Please try again.');
    }

    const dalleData = await dalleResponse.json();
    const generatedImageBase64 = dalleData.data?.[0]?.b64_json;

    if (!generatedImageBase64) {
      console.error('No image in response:', JSON.stringify(dalleData));
      throw new Error('No try-on image generated');
    }

    const tryOnImageUrl = `data:image/png;base64,${generatedImageBase64}`;
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
