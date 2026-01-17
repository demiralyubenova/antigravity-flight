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
    const { itemName, itemCategory, description, maxBudget, preferredStyle } = await req.json();

    if (!itemName) {
      return new Response(
        JSON.stringify({ error: 'Item name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finding shopping options for: ${itemName} (budget: $${maxBudget || 'any'})`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a fashion shopping assistant. Help users find where to buy clothing items within their budget. Provide specific, actionable shopping suggestions.

Your response should include:
1. **Budget-Friendly Options** - Suggest 3-5 specific retailers/websites where they can find this item or similar alternatives within budget
2. **Search Tips** - Keywords to search for to find similar items
3. **Timing Tips** - Best times to shop for deals (sales seasons, etc.)
4. **Alternative Suggestions** - If the exact item is expensive, suggest similar styles that achieve the same look for less

For each retailer, include:
- Store name
- Price range for this type of item
- Why it's a good option
- Specific search terms to use on their site

Focus on popular, accessible retailers that ship widely. Include both online-only and stores with physical locations.`;

    const userPrompt = `I'm looking for: ${itemName}
Category: ${itemCategory || 'clothing'}
${description ? `Description: ${description}` : ''}
${maxBudget ? `My budget: $${maxBudget} or less` : 'No specific budget, but looking for good value'}
${preferredStyle ? `Style preference: ${preferredStyle}` : ''}

Where can I find this item or similar alternatives? Give me specific stores and price expectations.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to get shopping suggestions');
    }

    const aiJson = await aiResponse.json();
    const suggestions = aiJson.choices?.[0]?.message?.content || 'Unable to generate suggestions';

    console.log('Generated shopping suggestions successfully');

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-shopping function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
