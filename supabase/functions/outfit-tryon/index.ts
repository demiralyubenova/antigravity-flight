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

    // Build the prompt with all clothing items
    const itemDescriptions = clothingItems.map((item: any, index: number) => 
      `Item ${index + 1}: ${item.name} (${item.category})`
    ).join(', ');

    console.log('Creating outfit try-on with items:', itemDescriptions);

    // Build content array with person image and all clothing images
    const content: any[] = [
      {
        type: 'text',
        text: `You are a virtual try-on assistant. Dress the person in the first image with ALL the clothing items shown in the subsequent images. 

The outfit consists of: ${itemDescriptions}

Create a photorealistic result where:
1. The person's face, pose, and body proportions are preserved exactly
2. ALL clothing items are applied together as a complete outfit
3. Items are layered correctly (e.g., jacket over shirt)
4. Shadows and highlights match the original photo's lighting
5. The result looks like an actual photo of the person wearing the complete outfit

Generate the final image.`,
      },
      {
        type: 'image_url',
        image_url: { url: personImageUrl },
      },
    ];

    // Add each clothing item image
    for (const item of clothingItems) {
      content.push({
        type: 'image_url',
        image_url: { url: item.image_url },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{ role: 'user', content }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const tryOnImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!tryOnImageUrl) {
      throw new Error('No try-on image returned from AI');
    }

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
