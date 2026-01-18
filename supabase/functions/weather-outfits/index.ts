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
  name: string;
  category: string;
  color: string | null;
  tags: string[] | null;
  image_url: string;
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
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`
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
          `- ${item.name} (${item.category}${item.color ? `, ${item.color}` : ''}${item.tags?.length ? `, tags: ${item.tags.join(', ')}` : ''})`
        ).join('\n')
      : 'No wardrobe items available';

    // Adjust temperature perception based on cold tolerance
    const toleranceAdjustment = coldTolerance === 'cold-blooded' ? 5 : coldTolerance === 'warm-blooded' ? -5 : 0;
    const perceivedTemp = weather.feelsLike + toleranceAdjustment;

    const systemPrompt = `You are a personal fashion stylist AI. Generate weather-appropriate outfit suggestions based on the user's actual wardrobe items.

Current Weather:
- Temperature: ${weather.temperature}°F (feels like ${weather.feelsLike}°F)
- Condition: ${weather.condition}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} mph
- Precipitation: ${weather.precipitation} inches

User's Cold Tolerance: ${coldTolerance} (perceived temperature adjusted to ${perceivedTemp}°F)

User's Wardrobe:
${wardrobeSummary}

Guidelines:
- Suggest 2-3 complete outfit options using ONLY items from the user's wardrobe
- Consider layering for variable conditions
- Account for rain/snow protection if needed
- Match the formality to typical daily activities
- For cold-blooded users, suggest warmer options; for warm-blooded, suggest lighter options
- Be specific about which items to combine
- Keep suggestions practical and stylish`;

    const userPrompt = `Based on today's weather and my wardrobe, what should I wear? Give me 2-3 outfit options with brief explanations of why each works for the conditions.`;

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: userPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('Google API error:', aiResponse.status, errorText);
      throw new Error('Failed to get AI suggestions');
    }

    const aiJson = await aiResponse.json();
    const suggestions = aiJson.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate suggestions';

    console.log('Generated outfit suggestions successfully');

    return new Response(
      JSON.stringify({ 
        weather, 
        suggestions,
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
