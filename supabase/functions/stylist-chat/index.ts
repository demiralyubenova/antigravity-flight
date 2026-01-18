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
    const { message, wardrobeItems, recentOutfits } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Build context about the user's wardrobe and recent outfits
    let wardrobeContext = '';
    if (wardrobeItems && wardrobeItems.length > 0) {
      wardrobeContext = `\n\nThe user's wardrobe contains these items:\n${wardrobeItems.map((item: any) => 
        `- ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''}${item.brand ? `, ${item.brand}` : ''})`
      ).join('\n')}`;
    }

    let recentOutfitsContext = '';
    if (recentOutfits && recentOutfits.length > 0) {
      recentOutfitsContext = `\n\nRecently worn outfits (avoid suggesting these same combinations):\n${recentOutfits.map((outfit: any) => {
        const date = new Date(outfit.worn_at).toLocaleDateString();
        const items = outfit.items?.map((i: any) => i.name).join(', ') || outfit.name;
        return `- ${date}: ${items}${outfit.occasion ? ` (${outfit.occasion})` : ''}`;
      }).join('\n')}`;
    }

    const systemPrompt = `You are Aura, a sophisticated personal style advisor with expertise in fashion and wardrobe styling. You have an elegant, warm, and encouraging personality.

Your role is to:
1. Help users create stylish outfit combinations from their wardrobe
2. Suggest new items that would complement their existing wardrobe
3. Provide styling tips and fashion advice
4. Consider the occasion, weather, and personal style preferences
5. IMPORTANT: When suggesting outfits, always try to suggest DIFFERENT combinations from what the user has recently worn. Variety is key to a great wardrobe!

Keep responses concise but helpful. Be specific when referencing items from their wardrobe.${wardrobeContext}${recentOutfitsContext}`;

    console.log('Sending request to Google AI...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: message },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error('No response from AI');
    }

    console.log('AI response received');

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stylist chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
