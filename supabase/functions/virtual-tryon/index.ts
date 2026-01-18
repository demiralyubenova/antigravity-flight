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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    
    if (!LOVABLE_API_KEY && !GOOGLE_API_KEY) {
      throw new Error('No API key configured for image generation');
    }

    console.log('Starting virtual try-on with', items.length, 'items');

    // First, analyze the person image using Gemini
    const personImageBase64 = await fetchImageAsBase64(personImageUrl);
    
    // Use Lovable AI for analysis
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            { type: 'text', text: 'Describe this person in detail for a fashion context: their pose, body type, skin tone, hair style and color, and any visible features. Be specific so an image can be accurately recreated.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${personImageBase64}` } }
          ]
        }]
      }),
    });

    if (!analysisResponse.ok) {
      console.error('Person analysis failed:', await analysisResponse.text());
      throw new Error('Failed to analyze person image');
    }

    const analysisData = await analysisResponse.json();
    const personDescription = analysisData.choices?.[0]?.message?.content || 'a person';
    console.log('Person analyzed:', personDescription.substring(0, 100) + '...');

    // Analyze each clothing item
    const clothingDescriptions: string[] = [];
    for (const item of items) {
      const clothingBase64 = await fetchImageAsBase64(item.imageUrl);
      
      const clothingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              { type: 'text', text: 'Describe this clothing item in precise detail: type, color, pattern, material, style, and any distinctive features. Be very specific.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${clothingBase64}` } }
            ]
          }]
        }),
      });

      if (clothingResponse.ok) {
        const clothingData = await clothingResponse.json();
        const desc = clothingData.choices?.[0]?.message?.content;
        if (desc) clothingDescriptions.push(desc);
      }
    }

    console.log('Generating try-on image with Lovable AI...');

    // Generate the try-on image using Lovable AI image generation
    const outfitDescription = clothingDescriptions.join('. Wearing also: ');
    const prompt = `Professional fashion photography of ${personDescription} wearing ${outfitDescription}. Full body shot, natural pose, studio lighting, clean background. High quality fashion editorial style photo. The clothing fits perfectly and looks natural on the person. Photorealistic, 8k quality.`;

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
      
      throw new Error('Image generation failed. Please try again.');
    }

    const imageGenData = await imageGenResponse.json();
    const generatedImageUrl = imageGenData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error('No image in response:', JSON.stringify(imageGenData));
      throw new Error('No try-on image generated');
    }

    console.log('Virtual try-on completed successfully');

    return new Response(
      JSON.stringify({ tryOnImageUrl: generatedImageUrl }),
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
