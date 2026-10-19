// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANSPORT_BASE_RATES = {
  "truck-light": 25,
  "truck-heavy": 45,
  "cargo-train": 15,
  "boat-barge": 20,
  "air-freight": 90,
  "donkey-cart": 10,
};

const LABOR_DEFAULT_RATES = {
  "handyman": 150,
  "plumbing": 200,
  "electrical": 220,
  "masonry": 180,
  "carpentry": 200,
  "painting": 160,
  "heavy-haulage": 300,
  "cleaning": 120,
  "custom": 150,
};

const TRANSPORT_LABELS = {
  "truck-light": "Light truck",
  "truck-heavy": "Heavy truck / lorry",
  "cargo-train": "Cargo train",
  "boat-barge": "Boat / barge",
  "air-freight": "Air freight",
  "donkey-cart": "Donkey cart",
};

const TRADE_LABELS = {
  "handyman": "Handyman / general repairs",
  "plumbing": "Plumbing",
  "electrical": "Electrical work",
  "masonry": "Masonry / concreting",
  "carpentry": "Carpentry / joinery",
  "painting": "Painting & decorating",
  "heavy-haulage": "Heavy haulage / freight",
  "cleaning": "Cleaning services",
  "custom": "Custom work",
};

function buildFallback(body) {
  const materialsTotal = (body.materials || []).reduce((sum, m) => sum + (m.unitPrice || 100) * m.quantity, 0);
  const laborRate = LABOR_DEFAULT_RATES[body.trade] || 150;
  const transportRate = TRANSPORT_BASE_RATES[body.transportMode] || 25;
  const contingencyPct = body.contingencyPercent ?? 15;

  const materialsItems = (body.materials || []).map((m) => ({
    name: m.name,
    quantity: m.quantity,
    unit: m.unit,
    unitPriceETB: m.unitPrice || 100,
    totalETB: (m.unitPrice || 100) * m.quantity,
    confidence: "low",
    source: "User-provided price"
  }));

  const laborTotal = body.laborHours * laborRate;
  const transportTotal = body.transportKm * transportRate;
  const subtotal = materialsTotal + laborTotal + transportTotal;
  const contingencyTotal = Math.round(subtotal * contingencyPct / 100);
  const grandTotal = subtotal + contingencyTotal;

  return {
    materials: materialsItems,
    labor: {
      description: `${body.laborHours} hours of ${TRADE_LABELS[body.trade] || body.trade}`,
      hours: body.laborHours,
      hourlyRateETB: laborRate,
      totalETB: laborTotal,
      confidence: "low",
      source: "Default rate"
    },
    transport: {
      mode: body.transportMode,
      description: `${TRANSPORT_LABELS[body.transportMode] || body.transportMode} over ${body.transportKm} km`,
      distanceKm: body.transportKm,
      ratePerKmETB: transportRate,
      totalETB: transportTotal,
      confidence: "low",
      source: "Default rate"
    },
    contingency: { percent: contingencyPct, amountETB: contingencyTotal },
    subtotalETB: subtotal,
    grandTotalETB: grandTotal,
    currency: "ETB",
    exchangeRateUsed: "",
    region: body.region,
    tips: [],
    sources: ["Default rates — AI pricing unavailable"],
    notes: "AI pricing unavailable, using default rates. For live market prices, check local suppliers in " + body.region + "."
  };
}

function repairJson(str) {
  // Remove trailing commas before } or ]
  let s = str.replace(/,(\s*[}\]])/g, "$1");
  // If truncated (unbalanced braces), try to close them
  let open = 0;
  for (const c of s) { if (c === "{") open++; if (c === "}") open--; }
  while (open > 0) { s += "}"; open--; }
  // Remove trailing commas again
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

function normalizeAiResponse(aiData, body) {
  const contingencyPct = body.contingencyPercent ?? 15;
  const result = { ...aiData };

  result.currency = "ETB";
  result.region = body.region;

  if (!Array.isArray(result.materials)) result.materials = [];
  result.materials = result.materials.map((m) => ({
    name: String(m.name || "Unknown"),
    quantity: Number(m.quantity) || 1,
    unit: String(m.unit || "pcs"),
    unitPriceETB: Number(m.unitPriceETB) || 0,
    totalETB: Number(m.totalETB) || (Number(m.quantity) || 1) * (Number(m.unitPriceETB) || 0),
    confidence: String(m.confidence || "medium"),
    source: String(m.source || ""),
    cheaperAlternative: m.cheaperAlternative || null
  }));

  if (result.labor) {
    result.labor = {
      description: String(result.labor.description || ""),
      hours: Number(result.labor.hours) || body.laborHours,
      hourlyRateETB: Number(result.labor.hourlyRateETB) || 0,
      totalETB: Number(result.labor.totalETB) || 0,
      confidence: String(result.labor.confidence || "medium"),
      source: String(result.labor.source || "")
    };
  }

  if (result.transport) {
    result.transport = {
      mode: String(result.transport.mode || body.transportMode),
      description: String(result.transport.description || ""),
      distanceKm: Number(result.transport.distanceKm) || body.transportKm,
      ratePerKmETB: Number(result.transport.ratePerKmETB) || 0,
      totalETB: Number(result.transport.totalETB) || 0,
      confidence: String(result.transport.confidence || "medium"),
      source: String(result.transport.source || "")
    };
  }

  const matTotal = result.materials.reduce((s, m) => s + m.totalETB, 0);
  const labTotal = result.labor?.totalETB || 0;
  const traTotal = result.transport?.totalETB || 0;
  const sub = matTotal + labTotal + traTotal;
  const contAmount = result.contingency?.amountETB || Math.round(sub * contingencyPct / 100);

  result.subtotalETB = sub;
  result.contingency = { percent: contingencyPct, amountETB: contAmount };
  result.grandTotalETB = sub + contAmount;

  if (!Array.isArray(result.sources)) result.sources = [];
  if (!Array.isArray(result.tips)) result.tips = [];
  if (!result.notes) result.notes = "";

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const materialsList = (body.materials || []).length > 0
      ? body.materials.map((m) => "  - " + m.name + ": " + m.quantity + " " + m.unit + (m.unitPrice ? " (user price: " + m.unitPrice + " ETB each)" : "")).join("\n")
      : "  None provided — please suggest typical materials for this job.";

    const prompt = [
      "You are an expert construction and logistics cost estimator specializing in Ethiopia.",
      "",
      "CRITICAL RULES:",
      "- ALL monetary values MUST be in Ethiopian Birr (ETB). NEVER use USD, EUR, or any other currency.",
      "- If you find prices online in USD or another currency, convert them to ETB using the current exchange rate and include the rate in exchangeRateUsed.",
      "- Use Google Search to find CURRENT market prices in Ethiopia.",
      "- Be realistic: use actual Ethiopian market prices, not Western prices.",
      "- Every price must have a source.",
      "",
      "JOB INPUT:",
      "- Trade: " + (TRADE_LABELS[body.trade] || body.trade),
      "- Labor hours: " + body.laborHours,
      "- Transport: " + body.transportKm + " km via " + (TRANSPORT_LABELS[body.transportMode] || body.transportMode),
      "- Region: " + body.region + ", Ethiopia",
      "- Contingency: " + (body.contingencyPercent ?? 15) + "%",
      "",
      "MATERIALS PROVIDED BY USER:",
      materialsList,
      "",
      "TASKS:",
      "1. Search for current Ethiopian market prices for each material (in ETB). If user provided a price, use it but note if it seems off.",
      "2. If no materials were provided, suggest 3-8 typical materials needed for a " + (TRADE_LABELS[body.trade] || body.trade) + " job, with realistic quantities.",
      "3. Find current labor rates for " + (TRADE_LABELS[body.trade] || body.trade) + " workers in " + body.region + " (ETB per hour).",
      "4. Find current transport rates for " + (TRANSPORT_LABELS[body.transportMode] || body.transportMode) + " in Ethiopia (ETB per km).",
      "5. For each material, suggest a cheaper alternative if one exists.",
      "6. Add " + (body.contingencyPercent ?? 15) + "% contingency on the subtotal.",
      "7. Provide 2-3 practical money-saving tips for this type of job in Ethiopia.",
      "",
      "Return ONLY valid JSON (no markdown fences, no explanation):",
      "{",
      '  "materials": [',
      '    { "name": "...", "quantity": ..., "unit": "...", "unitPriceETB": ..., "totalETB": ..., "confidence": "high|medium|low", "source": "...", "cheaperAlternative": { "name": "...", "unitPriceETB": ..., "note": "..." } }',
      "  ],",
      '  "labor": { "description": "...", "hours": ..., "hourlyRateETB": ..., "totalETB": ..., "confidence": "...", "source": "..." },',
      '  "transport": { "mode": "...", "description": "...", "distanceKm": ..., "ratePerKmETB": ..., "totalETB": ..., "confidence": "...", "source": "..." },',
      '  "contingency": { "percent": ..., "amountETB": ... },',
      '  "subtotalETB": ...,',
      '  "grandTotalETB": ...,',
      '  "currency": "ETB",',
      '  "exchangeRateUsed": "1 USD = X ETB (only if you converted from USD)",',
      '  "region": "...",',
      '  "tips": ["tip1", "tip2"],',
      '  "sources": ["source name: description", "..."],',
      '  "notes": "Important observations"',
      "}"
    ].join("\n");

    let geminiErr = "";
    try {
      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
          })
        }
      );

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = geminiText.replace(/```json/g, "").replace(/```/g, "").trim();
        // Extract JSON from between first { and last }
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        const jsonStr = (firstBrace >= 0 && lastBrace > firstBrace) ? cleaned.substring(firstBrace, lastBrace + 1) : cleaned;
        let aiRaw;
        try { aiRaw = JSON.parse(jsonStr); }
        catch { aiRaw = JSON.parse(repairJson(jsonStr)); }
        const aiEstimate = normalizeAiResponse(aiRaw, body);
        return new Response(JSON.stringify({
          success: true,
          estimate: aiEstimate,
          generatedAt: new Date().toISOString()
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        geminiErr = "HTTP " + geminiResponse.status + ": " + (await geminiResponse.text()).slice(0, 300);
      }
    } catch (aiErr) {
      geminiErr = String(aiErr?.message || aiErr);
    }

    const estimate = buildFallback(body);
    if (geminiErr) estimate.notes = "AI error: " + geminiErr;
    return new Response(JSON.stringify({
      success: true,
      estimate,
      generatedAt: new Date().toISOString()
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});