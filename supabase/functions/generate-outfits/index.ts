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
    const { occasion, wardrobeItems, recentOutfits, userFeedback } = await req.json();

    if (!occasion) {
      throw new Error('Occasion is required');
    }

    if (!wardrobeItems || wardrobeItems.length === 0) {
      throw new Error('Wardrobe items are required');
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
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

    // Build user feedback context
    let feedbackContext = '';
    if (userFeedback && userFeedback.totalFeedbackCount > 0) {
      feedbackContext = '\n\nUSER PREFERENCES (learned from feedback):';
      
      if (userFeedback.lovedItemIds?.length > 0) {
        const lovedItems = wardrobeItems.filter((i: any) => userFeedback.lovedItemIds.includes(i.id));
        if (lovedItems.length > 0) {
          feedbackContext += `\n- FAVORITE ITEMS (include more often): ${lovedItems.map((i: any) => i.name).join(', ')}`;
        }
      }
      
      if (userFeedback.hatedItemIds?.length > 0) {
        const hatedItems = wardrobeItems.filter((i: any) => userFeedback.hatedItemIds.includes(i.id));
        if (hatedItems.length > 0) {
          feedbackContext += `\n- DISLIKED ITEMS (avoid using): ${hatedItems.map((i: any) => i.name).join(', ')}`;
        }
      }
      
      if (userFeedback.prefersWarmer) {
        feedbackContext += '\n- User often feels cold - suggest warmer/layered options';
      }
      if (userFeedback.prefersCooler) {
        feedbackContext += '\n- User often feels warm - suggest lighter/breathable options';
      }
      if (userFeedback.prefersMoreFormal) {
        feedbackContext += '\n- User prefers more formal/polished looks';
      }
      if (userFeedback.prefersMoreCasual) {
        feedbackContext += '\n- User prefers more casual/relaxed looks';
      }
    }

    const systemPrompt = `You are a professional fashion stylist AI. Analyze the user's wardrobe and generate outfit options for the given occasion.

DRESS CODE RULES BY OCCASION:
- Business Meeting / Job Interview / Work: Blazers, dress shirts, blouses, slacks, pencil skirts, dress shoes. NO hoodies, sneakers, jeans, casual t-shirts.
- Date Night / Night Out: Elegant dresses, nice blouses, stylish tops, dress pants, heels. Can be more glamorous.
- Casual Weekend / Beach Day: Relaxed clothes - jeans, t-shirts, sneakers, sandals, casual dresses.
- Gym Session / Workout: Athletic wear - leggings, sports bras, tank tops, sneakers. NO regular clothes.
- Wedding Guest: Formal attire - elegant dresses, suits, dress shoes. NO casual items.
- Formal Event / Gala: Most elegant items - evening gowns, suits, formal accessories.

IMPORTANT RULES:
1. ONLY use items from the provided wardrobe list - use exact IDs
2. Each outfit MUST be appropriate for the occasion's dress code
3. Each outfit should be complete (top + bottom OR dress, plus shoes if available)
4. Each outfit should be DIFFERENT from the others
5. Avoid recently worn combinations
6. CRITICAL: If the wardrobe does NOT have appropriate items for the occasion, set "insufficient" to true and explain what's missing in "missingItems"
7. PAY ATTENTION to user preferences learned from their feedback${recentOutfitsContext}${feedbackContext}

Available wardrobe items (use EXACT IDs):
${wardrobeItems.map((item: any) => `ID: "${item.id}" - ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''})`).join('\n')}

Return ONLY a valid JSON object with this exact structure:
{
  "insufficient": false,
  "missingItems": [],
  "outfits": [
    {
      "name": "Outfit name",
      "description": "Brief style description explaining why it works for the occasion",
      "itemIds": ["id1", "id2", "id3"]
    }
  ]
}

If wardrobe lacks appropriate items, return:
{
  "insufficient": true,
  "missingItems": ["blazer or suit jacket", "dress shoes", "dress pants"],
  "outfits": []
}`;

    console.log('Generating outfit suggestions for:', occasion);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nCreate 3 outfit options for: ${occasion}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', reply);

    // Parse the JSON from the response
    let outfits;
    try {
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
