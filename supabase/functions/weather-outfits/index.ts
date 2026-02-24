import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

interface ClothingItem {
  id: string;
  ai_description: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, wardrobeItems, coldTolerance = 'normal' } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Location coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);

    // Fetch weather from Open-Meteo (free, no API key needed)
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm`
    );

    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const weatherJson = await weatherResponse.json();
    const current = weatherJson.current;

    // Map weather codes to conditions
    const getCondition = (code: number): string => {
      if (code === 0) return 'Clear sky';
      if (code <= 3) return 'Partly cloudy';
      if (code <= 49) return 'Foggy';
      if (code <= 59) return 'Drizzle';
      if (code <= 69) return 'Rain';
      if (code <= 79) return 'Snow';
      if (code <= 99) return 'Thunderstorm';
      return 'Unknown';
    };

    const weather: WeatherData = {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      condition: getCondition(current.weather_code),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      precipitation: current.precipitation,
    };

    console.log('Weather data:', weather);

    // Build wardrobe context for AI
    const wardrobeSummary = wardrobeItems?.length > 0
      ? wardrobeItems.map((item: ClothingItem) =>
        `- ID: ${item.id} | Items Description: ${item.ai_description || 'No description available'}`
      ).join('\n')
      : 'No wardrobe items available';

    // Adjust temperature perception based on cold tolerance
    const toleranceAdjustment = coldTolerance === 'cold-blooded' ? 5 : coldTolerance === 'warm-blooded' ? -5 : 0;
    const perceivedTemp = weather.feelsLike + toleranceAdjustment;

    const systemPrompt = `You are a personal fashion stylist AI. Generate weather-appropriate outfit suggestions based on the user's actual wardrobe items.

Current Weather:
- Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} km/h
- Precipitation: ${weather.precipitation} mm

User's Cold Tolerance: ${coldTolerance} (perceived temperature adjusted to ${perceivedTemp}°C)

User's Wardrobe:
${wardrobeSummary}

Guidelines:
- Suggest 2-3 complete outfit options using ONLY items from the user's wardrobe based on the descriptions provided.
- Consider layering for variable conditions.
- Account for rain/snow protection if needed.
- Match the formality to typical daily activities.
- For cold-blooded users, suggest warmer options; for warm-blooded, suggest lighter options.
- You must return ONLY a JSON response in the exact format shown below, with no markdown formatting or other text:
{
  "selected_wardrobe_ids": ["id1", "id2", "id3"],
  "suggested_purchases": [
     "A suggestion for an item that would pair well with the selected wardrobe items but is missing",
     "Another purchase suggestion"
  ]
}`;

    const userPrompt = `Based on today's weather and my wardrobe descriptions, what should I wear? Give me outfit options and what I am missing.`;

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('Failed to get AI suggestions');
    }

    const data = await response.json();

    // Calculate and log request cost
    if (data.usageMetadata) {
      const inputTokens = data.usageMetadata.promptTokenCount || 0;
      const outputTokens = data.usageMetadata.candidatesTokenCount || 0;
      // gemini-2.5-flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
      const inputCost = (inputTokens / 1_000_000) * 0.075;
      const outputCost = (outputTokens / 1_000_000) * 0.30;
      const totalCost = (inputCost + outputCost).toFixed(6);
      console.log(`🤑 Gemini Request Cost [weather-outfits]: $${totalCost} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error('Unable to generate suggestions');
    }

    let parsedReply;
    try {
      // Find the JSON block in the reply if it contains markdown formatting
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedReply = JSON.parse(jsonMatch[0]);
      } else {
        parsedReply = JSON.parse(reply);
      }
    } catch (e) {
      console.error('Failed to parse Gemini JSON output', reply, e);
      throw new Error('Invalid JSON from AI');
    }

    console.log('Generated outfit suggestions successfully');

    return new Response(
      JSON.stringify({
        weather,
        ...parsedReply,
        perceivedTemperature: perceivedTemp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in weather-outfits function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
