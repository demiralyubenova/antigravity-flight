import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('--- Analyze Clothing Request Received ---');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) throw new Error('Image URL is required');

    let base64String = '';
    let mimeType = 'image/jpeg';
    
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64String = match[2];
      }
    } else {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      base64String = btoa(binary);
      mimeType = response.headers.get('content-type') || 'image/jpeg';
    }

    const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY');

    // Use gemini-2.5-flash as the fallback 
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: "Analyze this clothing item and return a JSON object with the following schema exactly (no markdown formatting, just pure JSON): {\"name\": \"Descriptive name\", \"category\": \"one of: tops, bottoms, dresses, outerwear, shoes, accessories, bags, other\", \"type\": \"Specific type (e.g. T-shirt, Jeans, Sneaker)\", \"color\": \"Main color\", \"confidence\": 0.95}" },
            { inlineData: { mimeType, data: base64String } }
          ]
        }
      ],
      generation_config: { response_mime_type: "application/json" }
    };

    const resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Gemini API Error:', err);
      throw new Error(`Gemini API failed: ${err}`);
    }

    const genData = await resp.json();
    const resultText = genData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('No valid response from Gemini');

    const result = JSON.parse(resultText);
    console.log('Gemini categorization success:', result);

    const clothingInfo = {
      name: result.name || 'Unknown Item',
      category: (result.category || 'other').toLowerCase(),
      type: result.type || 'Clothing',
      color: result.color ? result.color.charAt(0).toUpperCase() + result.color.slice(1).toLowerCase() : 'Unknown',
      brand: "", 
      ai_description: `${result.color || ''} ${result.type || ''} classified as ${result.category || ''}.`.trim(),
      confidence: result.confidence || 0.9
    };

    return new Response(JSON.stringify(clothingInfo), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error analyzing clothing:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
