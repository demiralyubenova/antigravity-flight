import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShoppingResult {
  storeName: string;
  storeUrl: string;
  priceRange: string;
  searchUrl: string;
  reason: string;
}

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

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const searchQuery = encodeURIComponent(`${itemName} ${itemCategory || ''} ${description || ''}`);
    const budgetNum = maxBudget ? parseFloat(maxBudget) : null;

    // Define stores by price tier
    const budgetStores = [
      { name: 'Shein', url: 'https://www.shein.com', searchBase: 'https://www.shein.com/pdsearch/', tier: 'Budget', priceRange: '$5-$30' },
      { name: 'H&M', url: 'https://www.hm.com', searchBase: 'https://www2.hm.com/en_us/search-results.html?q=', tier: 'Budget', priceRange: '$10-$50' },
      { name: 'Primark', url: 'https://www.primark.com', searchBase: 'https://www.primark.com/en-us/search?text=', tier: 'Budget', priceRange: '$5-$30' },
      { name: 'Forever 21', url: 'https://www.forever21.com', searchBase: 'https://www.forever21.com/us/shop/search?q=', tier: 'Budget', priceRange: '$10-$40' },
    ];

    const midRangeStores = [
      { name: 'Zara', url: 'https://www.zara.com', searchBase: 'https://www.zara.com/us/en/search?searchTerm=', tier: 'Mid-Range', priceRange: '$30-$100' },
      { name: 'Mango', url: 'https://shop.mango.com', searchBase: 'https://shop.mango.com/us/search?kw=', tier: 'Mid-Range', priceRange: '$30-$120' },
      { name: 'ASOS', url: 'https://www.asos.com', searchBase: 'https://www.asos.com/us/search/?q=', tier: 'Mid-Range', priceRange: '$20-$100' },
      { name: 'Uniqlo', url: 'https://www.uniqlo.com', searchBase: 'https://www.uniqlo.com/us/en/search?q=', tier: 'Mid-Range', priceRange: '$20-$80' },
      { name: 'Nordstrom Rack', url: 'https://www.nordstromrack.com', searchBase: 'https://www.nordstromrack.com/sr?keyword=', tier: 'Mid-Range', priceRange: '$20-$100' },
    ];

    const premiumStores = [
      { name: 'Nordstrom', url: 'https://www.nordstrom.com', searchBase: 'https://www.nordstrom.com/sr?keyword=', tier: 'Premium', priceRange: '$50-$300' },
      { name: 'Bloomingdales', url: 'https://www.bloomingdales.com', searchBase: 'https://www.bloomingdales.com/shop/search?keyword=', tier: 'Premium', priceRange: '$80-$400' },
      { name: 'Net-a-Porter', url: 'https://www.net-a-porter.com', searchBase: 'https://www.net-a-porter.com/en-us/shop/search/', tier: 'Luxury', priceRange: '$200-$1000+' },
      { name: 'Farfetch', url: 'https://www.farfetch.com', searchBase: 'https://www.farfetch.com/shopping/women/search/items.aspx?q=', tier: 'Luxury', priceRange: '$150-$1000+' },
    ];

    const secondHandStores = [
      { name: 'ThredUp', url: 'https://www.thredup.com', searchBase: 'https://www.thredup.com/products?search_text=', tier: 'Secondhand', priceRange: '$5-$50' },
      { name: 'Poshmark', url: 'https://poshmark.com', searchBase: 'https://poshmark.com/search?query=', tier: 'Secondhand', priceRange: '$10-$100' },
      { name: 'Depop', url: 'https://www.depop.com', searchBase: 'https://www.depop.com/search/?q=', tier: 'Secondhand', priceRange: '$10-$80' },
      { name: 'The RealReal', url: 'https://www.therealreal.com', searchBase: 'https://www.therealreal.com/products?keywords=', tier: 'Luxury Secondhand', priceRange: '$50-$500' },
    ];

    // Select stores based on budget
    let selectedStores: typeof budgetStores = [];

    if (!budgetNum || budgetNum >= 100) {
      // No budget or high budget - show all tiers
      selectedStores = [...budgetStores.slice(0, 2), ...midRangeStores.slice(0, 2), ...premiumStores.slice(0, 2), ...secondHandStores.slice(0, 2)];
    } else if (budgetNum >= 50) {
      // Medium budget
      selectedStores = [...budgetStores.slice(0, 2), ...midRangeStores.slice(0, 3), ...secondHandStores.slice(0, 2)];
    } else if (budgetNum >= 25) {
      // Low-medium budget
      selectedStores = [...budgetStores, ...secondHandStores.slice(0, 2)];
    } else {
      // Very low budget - focus on budget & secondhand
      selectedStores = [...budgetStores.slice(0, 3), ...secondHandStores];
    }

    // Build results with search URLs
    const storeResults: ShoppingResult[] = selectedStores.map(store => ({
      storeName: store.name,
      storeUrl: store.url,
      priceRange: store.priceRange,
      searchUrl: `${store.searchBase}${searchQuery}`,
      reason: `${store.tier} option - ${store.priceRange}`,
    }));

    // Also get AI-powered personalized suggestions
    const systemPrompt = `You are a fashion shopping assistant. Based on the item the user wants, provide brief shopping tips in 3-4 sentences. Focus on:
1. Keywords to search for similar items
2. Best time to shop for deals
3. Any specific style tips for this type of item

Keep it brief and actionable.`;

    const userPrompt = `Item: ${itemName}
Category: ${itemCategory || 'clothing'}
${description ? `Description: ${description}` : ''}
${maxBudget ? `Budget: $${maxBudget}` : ''}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    });

    let tips = '';
    if (response.ok) {
      const data = await response.json();

      // Calculate and log request cost
      if (data.usageMetadata) {
        const inputTokens = data.usageMetadata.promptTokenCount || 0;
        const outputTokens = data.usageMetadata.candidatesTokenCount || 0;
        // gemini-2.5-flash pricing: $0.075 per 1M input tokens, $0.30 per 1M output tokens
        const inputCost = (inputTokens / 1_000_000) * 0.075;
        const outputCost = (outputTokens / 1_000_000) * 0.30;
        const totalCost = (inputCost + outputCost).toFixed(6);
        console.log(`🤑 Gemini Request Cost [find-shopping]: $${totalCost} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
      }

      tips = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    console.log('Generated shopping suggestions successfully');

    return new Response(
      JSON.stringify({
        stores: storeResults,
        tips,
        budget: maxBudget ? `$${maxBudget}` : null,
      }),
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
