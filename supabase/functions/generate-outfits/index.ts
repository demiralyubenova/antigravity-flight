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
    const { occasion, wardrobeItems, recentOutfits } = await req.json();

    if (!occasion) {
      throw new Error('Occasion is required');
    }

    if (!wardrobeItems || wardrobeItems.length === 0) {
      throw new Error('Wardrobe items are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context about recent outfits to avoid
    let recentOutfitsContext = '';
    if (recentOutfits && recentOutfits.length > 0) {
      recentOutfitsContext = `\n\nRecently worn outfits (AVOID suggesting these same combinations):\n${recentOutfits.map((outfit: any) => {
        const date = new Date(outfit.worn_at).toLocaleDateString();
        const items = outfit.items?.map((i: any) => i.name).join(', ') || outfit.name;
        return `- ${date}: ${items}`;
      }).join('\n')}`;
    }

    const systemPrompt = `You are a fashion stylist AI. Generate exactly 3 outfit options from the user's wardrobe for the given occasion.

IMPORTANT RULES:
1. Only use items from the provided wardrobe list
2. Each outfit should be complete and appropriate for the occasion
3. Each outfit should be DIFFERENT from the others
4. Avoid recently worn combinations${recentOutfitsContext}

Available wardrobe items (use EXACT IDs):
${wardrobeItems.map((item: any) => `ID: "${item.id}" - ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''})`).join('\n')}

Return ONLY a valid JSON object with this exact structure:
{
  "outfits": [
    {
      "name": "Outfit name",
      "description": "Brief style description",
      "itemIds": ["id1", "id2", "id3"]
    }
  ]
}`;

    console.log('Generating outfit suggestions for:', occasion);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create 3 outfit options for: ${occasion}` },
        ],
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
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', reply);

    // Parse the JSON from the response
    let outfits;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outfits = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse outfit suggestions');
    }

    console.log('Parsed outfits:', outfits);

    return new Response(
      JSON.stringify(outfits),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating outfits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
