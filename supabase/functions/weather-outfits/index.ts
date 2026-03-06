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
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[weather-outfits] Failed to parse request JSON:", e);
      return new Response(JSON.stringify({ error: "Invalid JSON in request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { latitude, longitude, wardrobeItems, coldTolerance = "normal" } = body;
    console.log(`[weather-outfits] Request for coordinates: ${latitude}, ${longitude}`);
    console.log(`[weather-outfits] Wardrobe items count: ${wardrobeItems?.length || 0}`);

    if (latitude === undefined || longitude === undefined) {
      console.error("[weather-outfits] Missing coordinates:", { latitude, longitude });
      return new Response(JSON.stringify({ error: "Missing latitude or longitude" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Fetch weather from Open-Meteo
    let weather: WeatherData;
    let perceivedTemp: number;
    try {
      console.log(`[weather-outfits] Fetching weather from Open-Meteo...`);
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm`
      );

      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error("[weather-outfits] Open-Meteo error:", weatherResponse.status, errorText);
        throw new Error(`Weather service error: ${weatherResponse.status}`);
      }

      const weatherJson = await weatherResponse.json();
      const current = weatherJson.current;

      if (!current) {
        console.error("[weather-outfits] Open-Meteo returned no 'current' data:", weatherJson);
        throw new Error("Missing weather data in response");
      }

      // Map weather codes to conditions
      const getCondition = (code: number): string => {
        if (code === 0) return "Clear sky";
        if (code <= 3) return "Partly cloudy";
        if (code <= 49) return "Foggy";
        if (code <= 59) return "Drizzle";
        if (code <= 69) return "Rain";
        if (code <= 79) return "Snow";
        if (code <= 99) return "Thunderstorm";
        return "Unknown";
      };

      weather = {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        condition: getCondition(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        precipitation: current.precipitation,
      };

      const toleranceAdjustment = coldTolerance === "cold-blooded" ? 5 : coldTolerance === "warm-blooded" ? -5 : 0;
      perceivedTemp = weather.feelsLike + toleranceAdjustment;
      console.log("[weather-outfits] Weather data processed:", weather);
    } catch (e) {
      console.error("[weather-outfits] Error fetching/processing weather:", e);
      return new Response(JSON.stringify({ error: "Failed to fetch weather data", details: e instanceof Error ? e.message : "Unknown error" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Prepare Wardrobe Context
    let wardrobeSummary = "";
    try {
      wardrobeSummary = (wardrobeItems && wardrobeItems.length > 0)
        ? wardrobeItems.map((item: ClothingItem) =>
          `- ID: ${item.id} | Items Description: ${item.ai_description || "No description available"}`
        ).join("\n")
        : "No wardrobe items available";
    } catch (e) {
      console.error("[weather-outfits] Error processing wardrobe items:", e);
      return new Response(JSON.stringify({ error: "Invalid wardrobe items format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[weather-outfits] GOOGLE_GEMINI_API_KEY is not set in Deno.env");
      return new Response(JSON.stringify({ error: "Gemini API key not configured on server" }), { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log(`[weather-outfits] API Key found (length: ${GEMINI_API_KEY.length}, prefix: ${GEMINI_API_KEY.substring(0, 4)}...)`);

    // 3. Call Gemini
    console.log("[weather-outfits] Sending request to Gemini...");
    let reply = "";
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 10000,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                selected_wardrobe_ids: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                suggested_purchases: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
              },
              required: ["selected_wardrobe_ids", "suggested_purchases"],
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[weather-outfits] Gemini API error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errorText }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      // Calculate and log request cost
      if (data.usageMetadata) {
        const inputTokens = data.usageMetadata.promptTokenCount || 0;
        const outputTokens = data.usageMetadata.candidatesTokenCount || 0;
        const inputCost = (inputTokens / 1_000_000) * 0.075;
        const outputCost = (outputTokens / 1_000_000) * 0.30;
        const totalCost = (inputCost + outputCost).toFixed(6);
        console.log(`🤑 Gemini Request Cost [weather-outfits]: $${totalCost} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
      }

      reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        throw new Error("No response content from Gemini");
      }
    } catch (e) {
      console.error("[weather-outfits] Unexpected error during Gemini call:", e);
      return new Response(JSON.stringify({ error: "AI generation failed", details: e instanceof Error ? e.message : "Unknown error" }), { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Parse AI Response
    let parsedReply: any;
    try {
      const jsonContent = reply.trim();
      console.log(`[weather-outfits] AI Output Length: ${jsonContent.length} chars`);

      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedReply = JSON.parse(jsonMatch[0]);
      } else {
        parsedReply = JSON.parse(jsonContent);
      }
    } catch (e) {
      console.error("[weather-outfits] Failed to parse AI response. AI Output:", reply);
      return new Response(JSON.stringify({ error: "Invalid AI response format", details: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[weather-outfits] Successfully generated suggestions");

    return new Response(
      JSON.stringify({
        weather,
        ...parsedReply,
        perceivedTemperature: perceivedTemp
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in weather-outfits function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
