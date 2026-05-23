const router = require("express").Router();
const { searchPlaces, getCachedSearch, setCachedSearch } = require("../repositories/places.repo");
const { callGemini } = require("../services/ai/geminiClient");
const { makeValidator } = require("../services/ai/validate");
const authMiddleware = require("../middleware/authMiddleware");
const ChatHistory = require("../models/ChatHistory");
const googleMapsService = require("../services/googleMapsService");
const { supabase } = require("../config/supabaseClient");

// --- Prompts ---
const {
  systemPrompt: ragKeywordsSystemPrompt,
  responseSchema: ragKeywordsResponseSchema,
} = require("../services/ai/prompts/ragKeywords.prompt");

const {
  systemPrompt: itinerarySystemPrompt,
  responseSchema: itineraryResponseSchema,
} = require("../services/ai/prompts/itinerary.prompt");

const {
  systemPrompt: searchSystemPrompt,
  responseSchema: searchResponseSchema,
} = require("../services/ai/prompts/search.prompt");

const {
  systemPrompt: multiItinerarySystemPrompt,
  responseSchema: multiItineraryResponseSchema,
} = require("../services/ai/prompts/multiItinerary.prompt");

// --- Validators ---
const validateRagKeywords = makeValidator(ragKeywordsResponseSchema);
const validateItinerary = makeValidator(itineraryResponseSchema);
const validateSearch = makeValidator(searchResponseSchema);
const validateMultiItinerary = makeValidator(multiItineraryResponseSchema);

// --- Config ---
const RAG_THRESHOLD = 3; // If DB has >= this many results, skip AI supplement

// ═══════════════════════════════════════════════════════════════
// STEP 1: Extract keywords from user message via Gemini
// ═══════════════════════════════════════════════════════════════
async function extractKeywords(message) {
  try {
    const keywordsJson = await callGemini({
      system: ragKeywordsSystemPrompt,
      user: { message },
    });

    const v = validateRagKeywords(keywordsJson);
    if (v.ok) {
      console.log("[RAG] Keywords extracted:", JSON.stringify(keywordsJson));
      return keywordsJson;
    }

    console.warn("[RAG] Keyword extraction validation failed:", v.errors);
  } catch (err) {
    console.error("[RAG] Keyword extraction error:", err.message);
  }

  // Fallback: basic extraction from message
  const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return {
    searchQueries: words.slice(0, 3),
    country: null,
    city: null,
    category: null,
    intent: message.toLowerCase().includes("itinerary") || message.toLowerCase().includes("plan")
      ? "generate_itinerary"
      : "search_places",
  };
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Hierarchical DB search with caching
// ═══════════════════════════════════════════════════════════════
async function ragSearch(keywords) {
  const cacheKey = keywords.searchQueries.sort().join("|");

  // Check cache first
  const cached = await getCachedSearch(cacheKey);
  if (cached) return cached;

  // Real search
  const results = await searchPlaces(keywords);

  // Cache if we got results
  if (results.length > 0) {
    await setCachedSearch(cacheKey, results);
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// Format DB results for the AI and frontend
// ═══════════════════════════════════════════════════════════════
function formatDbResultsForAI(dbResults) {
  return dbResults.map(r => ({
    placeId: r.id || r.place_id || null,
    name: r.name,
    category: r.category || r.primary_category || r.macro_category || "urban",
    shortDesc: r.short_description || r.short_desc || r.description || "",
    country: r.country_name || r.country || "",
    city: r.city_name || r.city || "",
    type: r._type || "POI",
    source: "db",
    latitude: r.latitude,
    longitude: r.longitude,
    average_rating: r.average_rating,
    total_reviews: r.total_reviews,
    popularity_score: r.popularity_score,
    estCostPerDay: r.est_cost_per_day ?? null,
    entryFee: r.entry_fee ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// POST /api/ai/chat  — Main RAG pipeline
// ═══════════════════════════════════════════════════════════════
router.post("/chat", async (req, res) => {
  try {
    const { message, userContext, selectedPlaces, conversationHistory: clientHistory } = req.body;

    // Auth (optional)
    let userId = null;
    let conversationHistory = [];

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        conversationHistory = await ChatHistory.getConversationContext(userId, 10);
      } catch (err) {
        console.log("Auth optional - continuing without user context");
      }
    }

    if (conversationHistory.length === 0 && clientHistory && Array.isArray(clientHistory)) {
      conversationHistory = clientHistory;
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required (string)" });
    }

    // Save user message to history
    if (userId) {
      await ChatHistory.saveMessage(userId, message, "user", null, {});
    }

    // ──── STEP 1: Extract keywords + intent ────
    const keywords = await extractKeywords(message);
    const intent = keywords.intent;

    // General chat — no RAG needed
    if (intent === "general_chat") {
      const payload = {
        message,
        userContext: userContext ?? null,
        dbResults: [],
        conversationHistory,
      };

      const searchJson = await getValidSearchJson(payload);
      if (!searchJson) {
        return res.status(502).json({
          message: "AI response was invalid. Please try again.",
          bullets: [], cards: [], itineraryPreview: null, source: "ai",
        });
      }

      const aiMessage = searchJson.overviewParagraph ?? "Here are some suggestions.";
      if (userId) {
        await ChatHistory.saveMessage(userId, aiMessage, "ai", null, {
          bullets: searchJson.overviewBullets, cards: searchJson.cards
        });
      }

      return res.json({
        message: aiMessage,
        bullets: searchJson.overviewBullets ?? [],
        cards: searchJson.cards ?? [],
        itineraryPreview: null,
        source: "ai",
      });
    }

    // ──── STEP 2: Hierarchical DB search ────
    const dbResults = await ragSearch(keywords);
    const formattedDbResults = formatDbResultsForAI(dbResults);

    console.log(`[RAG] Intent: ${intent}, DB results: ${formattedDbResults.length}, Threshold: ${RAG_THRESHOLD}`);

    // ──── STEP 3: DB-only response (if enough results for search intent) ────
    if (intent === "search_places" && formattedDbResults.length >= RAG_THRESHOLD) {
      console.log("[RAG] DB has enough results — returning directly without AI call");

      const aiMessage = `I found ${formattedDbResults.length} places from our database! Here are the best matches:`;

      if (userId) {
        await ChatHistory.saveMessage(userId, aiMessage, "ai", null, { cards: formattedDbResults });
      }

      return res.json({
        message: aiMessage,
        cards: formattedDbResults,
        itineraryPreview: null,
        source: "db",
      });
    }

    // ──── STEP 4: AI with DB context ────

    // 4a) Itinerary intent
    if (intent === "generate_itinerary") {
      const payload = {
        message,
        userContext: userContext ?? null,
        selectedPlaces: selectedPlaces ?? [],
        dbResults: formattedDbResults,
        conversationHistory,
      };

      const itineraryJson = await callGemini({
        system: itinerarySystemPrompt,
        user: payload,
      });

      const v = validateItinerary(itineraryJson);
      if (!v.ok) {
        console.error("Invalid itinerary JSON from AI:", v.errors);
        return res.status(502).json({
          message: "AI response was invalid. Please try again.",
          cards: [], itineraryPreview: null, source: "ai",
        });
      }

      const aiMessage = itineraryJson.reply ?? "Here is an itinerary preview.";
      if (userId) {
        await ChatHistory.saveMessage(userId, aiMessage, "ai", null, {
          itineraryPreview: itineraryJson.itineraryPreview,
          cards: itineraryJson.cards
        });
      }

      return res.json({
        message: aiMessage,
        itineraryPreview: itineraryJson.itineraryPreview ?? null,
        cards: itineraryJson.cards ?? [],
        source: formattedDbResults.length > 0 ? "mixed" : "ai",
      });
    }

    // 4b) Search/discovery — AI supplements DB results
    const payload = {
      message,
      userContext: userContext ?? null,
      dbResults: formattedDbResults,
      dbResultCount: formattedDbResults.length,
      supplementNeeded: formattedDbResults.length < RAG_THRESHOLD,
      conversationHistory,
    };

    const searchJson = await getValidSearchJson(payload);

    if (!searchJson) {
      return res.status(502).json({
        message: "AI response was invalid. Please try again.",
        bullets: [], cards: [], itineraryPreview: null, source: "ai",
      });
    }

    const aiMessage = searchJson.overviewParagraph ?? "Here are some suggestions.";

    if (userId) {
      await ChatHistory.saveMessage(userId, aiMessage, "ai", null, {
        bullets: searchJson.overviewBullets,
        cards: searchJson.cards
      });
    }

    return res.json({
      message: aiMessage,
      bullets: searchJson.overviewBullets ?? [],
      cards: searchJson.cards ?? [],
      itineraryPreview: null,
      source: formattedDbResults.length > 0 ? "mixed" : "ai",
    });

  } catch (err) {
    console.error("AI /chat error:", err);
    return res.status(500).json({ error: err.message || "AI error" });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/ai/generatePlaces  — Admin bulk import (NO RAG)
// Generates brand-new place data from Gemini without touching the DB.
// ═══════════════════════════════════════════════════════════════
router.post("/generatePlaces", async (req, res) => {
  try {
    const { prompt, country, city, count = 5 } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    const locationContext = city && country
      ? `in ${city}, ${country}`
      : country
        ? `in ${country}`
        : "";

    const systemInstruction = `You are a travel data expert helping populate a tourism database.
The admin will describe what kinds of places they want to add ${locationContext}.
Your job is to generate detailed, accurate, factual place data for real-world locations.
Do NOT reference any existing database — generate fresh, high-quality place records.

IMPORTANT: You MUST respond with ONLY valid JSON in this exact shape:
{
  "places": [
    {
      "name": "Full official place name",
      "short_desc": "2-3 sentence factual description",
      "primary_category": "e.g. Museum, Park, Restaurant, Temple, Market, Beach",
      "secondary_category": "e.g. Art Museum, National Park, Street Food Market",
      "macro_category": "Urban | Nature | History",
      "address": "Full street address if known, else neighbourhood/district",
      "latitude": 12.3456,
      "longitude": 78.9012,
      "google_place_id": "ChIJ... (The actual Google Place ID if known, else leave empty string)",
      "tags": ["tag1", "tag2", "tag3"],
      "visit_duration_min": 90,
      "est_cost_per_day": 15
    }
  ]
}

Generate exactly ${count} places. Use real GPS coordinates and real Google Place IDs where possible. If unsure of exact coordinates, provide an approximate value. All fields are required.`;

    const userInstruction = `Admin request: "${prompt}"${locationContext ? ` (Location: ${city || ""}${city && country ? ", " : ""}${country || ""})` : ""}
Generate ${count} real, factual places matching this description. Each place must have all required fields filled in.`;

    // Internal helper to get valid JSON with 1 retry
    async function getValidPlacesJson(payload) {
      // 1st attempt
      try {
        const first = await callGemini({
          system: systemInstruction,
          user: payload,
        });
        if (first && Array.isArray(first.places) && first.places.length > 0) {
          return first;
        }
      } catch (err) {
        console.warn("Invalid places JSON from AI (attempt 1):", err.message);
      }

      // 2nd attempt (retry with strict instruction)
      const retryInstruction = payload + '\n\nIMPORTANT: Your previous response failed to parse as valid JSON. Ensure EVERY object is correctly closed with curly braces } and separated by commas. Return ONLY valid JSON.';
      try {
        const second = await callGemini({
          system: systemInstruction,
          user: retryInstruction,
        });
        if (second && Array.isArray(second.places) && second.places.length > 0) {
          return second;
        }
      } catch (err) {
        console.error("Invalid places JSON from AI (attempt 2):", err.message);
      }
      return null;
    }

    const raw = await getValidPlacesJson(userInstruction);

    if (!raw) {
      return res.status(502).json({ error: "AI did not return valid places data. Please try again." });
    }

    // Normalise the places array
    const places = raw.places.map((p) => ({
      name: p.name || "Unknown Place",
      short_desc: p.short_desc || p.description || "",
      primary_category: p.primary_category || p.category || "Place",
      secondary_category: p.secondary_category || "",
      macro_category: ["Urban", "Nature", "History"].includes(p.macro_category) ? p.macro_category : "Urban",
      address: p.address || "",
      latitude: typeof p.latitude === "number" ? p.latitude.toString() : (p.latitude || ""),
      longitude: typeof p.longitude === "number" ? p.longitude.toString() : (p.longitude || ""),
      google_place_id: p.google_place_id || p.place_id || "",
      tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === "string" ? p.tags.split(",").map(t => t.trim()) : []),
      visit_duration_min: parseInt(p.visit_duration_min) || 60,
      est_cost_per_day: parseFloat(p.est_cost_per_day) || null,
    }));

    return res.json({ success: true, data: { places } });

  } catch (err) {
    console.error("AI /generatePlaces error:", err);
    return res.status(500).json({ error: err.message || "AI generation error" });
  }
});


// ═══════════════════════════════════════════════════════════════
// Helper: validated search JSON with retry
// ═══════════════════════════════════════════════════════════════
async function getValidSearchJson(payload) {
  // 1st attempt
  const first = await callGemini({
    system: searchSystemPrompt,
    user: payload,
  });

  let v = validateSearch(first);
  if (v.ok) return first;

  console.error("Invalid search JSON from AI (attempt 1):", v.errors);

  // 2nd attempt (retry with strict instruction)
  const retryPayload = {
    ...payload,
    __validationError:
      "Your previous JSON failed validation. You MUST output at least 2 overviewBullets and 3 to 8 cards. Each card MUST have source ('db' or 'ai'). Return ONLY valid JSON matching the required shape.",
  };

  const second = await callGemini({
    system: searchSystemPrompt,
    user: retryPayload,
  });

  v = validateSearch(second);
  if (v.ok) return second;

  console.error("Invalid search JSON from AI (attempt 2):", v.errors);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Country → Currency mapping
// ═══════════════════════════════════════════════════════════════
const COUNTRY_CURRENCY_MAP = {
  "bangladesh":           { code: "BDT", symbol: "৳" },
  "india":                { code: "INR", symbol: "₹" },
  "thailand":             { code: "THB", symbol: "฿" },
  "indonesia":            { code: "IDR", symbol: "Rp" },
  "united kingdom":       { code: "GBP", symbol: "£" },
  "uk":                   { code: "GBP", symbol: "£" },
  "france":               { code: "EUR", symbol: "€" },
  "germany":              { code: "EUR", symbol: "€" },
  "italy":                { code: "EUR", symbol: "€" },
  "spain":                { code: "EUR", symbol: "€" },
  "netherlands":          { code: "EUR", symbol: "€" },
  "portugal":             { code: "EUR", symbol: "€" },
  "greece":               { code: "EUR", symbol: "€" },
  "singapore":            { code: "SGD", symbol: "S$" },
  "malaysia":             { code: "MYR", symbol: "RM" },
  "nepal":                { code: "NPR", symbol: "रू" },
  "uae":                  { code: "AED", symbol: "د.إ" },
  "united arab emirates": { code: "AED", symbol: "د.إ" },
  "pakistan":             { code: "PKR", symbol: "₨" },
  "sri lanka":            { code: "LKR", symbol: "Rs" },
  "japan":                { code: "JPY", symbol: "¥" },
  "china":                { code: "CNY", symbol: "¥" },
  "south korea":          { code: "KRW", symbol: "₩" },
  "myanmar":              { code: "MMK", symbol: "K" },
  "vietnam":              { code: "VND", symbol: "₫" },
  "philippines":          { code: "PHP", symbol: "₱" },
  "australia":            { code: "AUD", symbol: "A$" },
  "canada":               { code: "CAD", symbol: "C$" },
  "brazil":               { code: "BRL", symbol: "R$" },
  "mexico":               { code: "MXN", symbol: "MX$" },
  "turkey":               { code: "TRY", symbol: "₺" },
  "switzerland":          { code: "CHF", symbol: "CHF" },
  "egypt":                { code: "EGP", symbol: "£" },
  "kenya":                { code: "KES", symbol: "KSh" },
  "south africa":         { code: "ZAR", symbol: "R" },
  "cambodia":             { code: "USD", symbol: "$" },
  "united states":        { code: "USD", symbol: "$" },
  "usa":                  { code: "USD", symbol: "$" },
};

function getCurrencyForCountry(countryName) {
  if (!countryName) return { code: "BDT", symbol: "৳" };
  const key = countryName.toLowerCase().trim();
  for (const [pattern, currency] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return currency;
  }
  return { code: "BDT", symbol: "৳" };
}

// ═══════════════════════════════════════════════════════════════
// Upsert AI-provided pricing back to places table (runs in background)
// ═══════════════════════════════════════════════════════════════
async function upsertPricingToPlaces(itineraries, destCountry) {
  const pricingMap = new Map(); // dedup by lowercased name

  for (const itinerary of itineraries) {
    for (const day of itinerary.schedule || []) {
      for (const item of day.items || []) {
        if (item.entryCost !== null && item.entryCost !== undefined) {
          const key = (item.name || "").toLowerCase().trim();
          if (key && !pricingMap.has(key)) {
            pricingMap.set(key, {
              name: item.name,
              entryCost: item.entryCost,
              category: item.category || "urban",
              visitDurationMin: item.visitDurationMin || null,
              lat: item.lat ?? null,
              lng: item.lng ?? null,
            });
          }
        }
      }
    }
  }

  if (pricingMap.size === 0) return;
  console.log(`[Pricing] Processing ${pricingMap.size} unique places for DB upsert`);

  for (const [, p] of pricingMap) {
    try {
      const { data: existing } = await supabase
        .from("places")
        .select("place_id, est_cost_per_day")
        .ilike("name", p.name)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Only fill in if not already set — don't overwrite human-curated data
        if (existing.est_cost_per_day === null || existing.est_cost_per_day === undefined) {
          await supabase
            .from("places")
            .update({ est_cost_per_day: p.entryCost })
            .eq("place_id", existing.place_id);
          console.log(`[Pricing] Updated "${p.name}": ${p.entryCost}`);
        }
      } else if (destCountry) {
        // Insert as a new AI-discovered place
        const row = {
          name: p.name,
          primary_category: p.category,
          est_cost_per_day: p.entryCost,
          visit_duration_min: p.visitDurationMin,
          country: destCountry,
          source: "ai",
          verified: false,
        };
        if (p.lat && p.lng) {
          row.location = `POINT(${p.lng} ${p.lat})`;
        }
        const { error: insErr } = await supabase.from("places").insert([row]);
        if (insErr) console.warn(`[Pricing] Insert skipped for "${p.name}": ${insErr.message}`);
        else console.log(`[Pricing] Inserted new place "${p.name}"`);
      }
    } catch (e) {
      console.warn(`[Pricing] Upsert error for "${p.name}":`, e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/ai/generateItineraries  (Stage 2 — unchanged except imports)
// ═══════════════════════════════════════════════════════════════
router.post("/generateItineraries", async (req, res) => {
  try {
    const { selectedPlaces, tripDuration, userContext, customRequirements } = req.body;

    if (!selectedPlaces || !Array.isArray(selectedPlaces) || selectedPlaces.length === 0) {
      return res.status(400).json({ error: "selectedPlaces is required (non-empty array)" });
    }

    if (!tripDuration || tripDuration < 1) {
      return res.status(400).json({ error: "tripDuration is required (integer >= 1)" });
    }

    // Detect destination country + currency from selected places
    const destinationCountry =
      selectedPlaces.find(p => p.country)?.country ||
      selectedPlaces.find(p => p.country_name)?.country_name ||
      null;
    const destinationCurrency = getCurrencyForCountry(destinationCountry);

    // Prepare payload for AI
    const payload = {
      selectedPlaces,
      tripDuration,
      userContext: userContext ?? null,
      destinationCountry,
      destinationCurrency: destinationCurrency.code,
    };

    // Add custom requirements if provided
    if (customRequirements && customRequirements.trim()) {
      payload.customRequirements = customRequirements;
    }

    // ── Normalize AI response: map enum variants to valid values before validation ──
    function sanitizeMultiItinerary(json) {
      if (!json || !Array.isArray(json.itineraries)) return json;

      const TIME_MAP = {
        night: "evening", "late evening": "evening", "late night": "evening",
        "late afternoon": "afternoon", "early morning": "morning", "mid morning": "morning",
        "mid-morning": "morning", "early afternoon": "afternoon",
      };
      const VALID_TIMES = new Set(["morning", "afternoon", "evening"]);

      const CATEGORY_MAP = {
        historical: "history", cultural: "history", culture: "history",
        "history & museum": "history", "history and museum": "history",
        archaeological: "history", heritage: "history", monument: "history",
        temple: "history", mosque: "history", church: "history", religious: "history",
        fort: "history", palace: "history",
        museum: "museum",
        park: "nature", wildlife: "nature", forest: "nature", lake: "nature",
        waterfall: "nature", mountain: "nature", hill: "nature", scenic: "nature",
        ecotourism: "nature", "eco-tourism": "nature",
        beach: "beach", coastal: "beach", island: "beach", waterfront: "beach",
        adventure: "adventure", trekking: "adventure", hiking: "adventure",
        sports: "adventure", extreme: "adventure",
        city: "urban", town: "urban", market: "urban", bazaar: "urban",
        shopping: "urban", food: "urban", restaurant: "urban", entertainment: "urban",
        nightlife: "urban", cafe: "urban", arts: "urban",
      };
      const VALID_CATEGORIES = new Set(["nature", "history", "museum", "urban", "beach", "adventure"]);

      let normalized = 0;

      for (const itin of json.itineraries) {
        for (const day of itin.schedule || []) {
          for (const item of day.items || []) {
            // Normalize time
            const rawTime = (item.time || "").toLowerCase().trim();
            if (!VALID_TIMES.has(rawTime)) {
              const mapped = TIME_MAP[rawTime];
              if (mapped) {
                item.time = mapped;
              } else if (rawTime.includes("night") || rawTime.includes("evening")) {
                item.time = "evening";
              } else if (rawTime.includes("afternoon") || rawTime.includes("noon")) {
                item.time = "afternoon";
              } else {
                item.time = "morning"; // safe default
              }
              normalized++;
            }
            // Normalize category
            const rawCat = (item.category || "").toLowerCase().trim();
            if (!VALID_CATEGORIES.has(rawCat)) {
              const mapped = CATEGORY_MAP[rawCat];
              if (mapped) {
                item.category = mapped;
              } else {
                // fuzzy match: check if any valid category is a substring
                const fuzzy = [...VALID_CATEGORIES].find(c => rawCat.includes(c));
                item.category = fuzzy || "urban"; // fallback
              }
              normalized++;
            }
          }
        }
      }

      if (normalized > 0) {
        console.log(`[Sanitize] Normalized ${normalized} enum value(s) in AI response`);
      }
      return json;
    }

    async function getValidMultiItineraryJson(payload, attempt = 1) {
      const raw = await callGemini({
        system: multiItinerarySystemPrompt,
        user: payload,
      });

      const multiItineraryJson = sanitizeMultiItinerary(raw);
      const validation = validateMultiItinerary(multiItineraryJson);
      if (validation.ok) return multiItineraryJson;

      console.error(`Invalid multi-itinerary JSON from AI (attempt ${attempt}):`, validation.errors);

      if (attempt === 1) {
        // Find the non-enum errors (structural issues) and relay them
        const nonEnumErrors = (validation.errors || [])
          .filter(e => e.keyword !== "enum")
          .map(e => `${e.instancePath}: ${e.message}`)
          .join("; ");

        const retryPayload = {
          ...payload,
          __validationError:
            `Your previous JSON failed structural validation${nonEnumErrors ? ": " + nonEnumErrors : ""}. ` +
            "Return ONLY valid JSON matching the required shape with exactly 3 itineraries.",
        };

        const raw2 = await callGemini({
          system: multiItinerarySystemPrompt,
          user: retryPayload,
        });

        const second = sanitizeMultiItinerary(raw2);
        const validationRetry = validateMultiItinerary(second);
        if (validationRetry.ok) return second;

        console.error(`Invalid multi-itinerary JSON from AI (attempt 2):`, validationRetry.errors);
        return null;
      }

      return null;
    }

    const multiItineraryJson = await getValidMultiItineraryJson(payload);

    if (!multiItineraryJson) {
      return res.status(502).json({
        error: "AI response was invalid after 2 attempts. Please try again.",
      });
    }

    // ── Enrichment: resolve place locations ──
    async function enrichItineraryWithLocations(itineraries, sourcePlaces) {
      const sourceLookup = new Map();
      if (Array.isArray(sourcePlaces)) {
        sourcePlaces.forEach(p => {
          if (p.name) sourceLookup.set(p.name.toLowerCase().trim(), p);
        });
      }

      const itemsToResolve = [];
      const placeNamesToResolve = new Set();

      for (const itinerary of itineraries) {
        if (!itinerary.schedule) continue;
        for (const day of itinerary.schedule) {
          if (!day.items) continue;
          for (const item of day.items) {
            const nameKey = (item.place || item.name || "").toLowerCase().trim();
            if (!nameKey) continue;

            const sourceMatch = sourceLookup.get(nameKey);
            if (sourceMatch && sourceMatch.placeId) {
              item.placeId = sourceMatch.placeId;
              item.lat = sourceMatch.lat || sourceMatch.coordinates?.latitude;
              item.lng = sourceMatch.lng || sourceMatch.coordinates?.longitude;
            } else {
              itemsToResolve.push(item);
              placeNamesToResolve.add(nameKey);
            }
          }
        }
      }

      const uniqueNames = Array.from(placeNamesToResolve);
      console.log(`AI Itinerary: ${uniqueNames.length} places to resolve not in collections.`);

      if (uniqueNames.length === 0) return itineraries;

      const RESOLUTION_LIMIT = 10;
      const namesToProcess = uniqueNames.slice(0, RESOLUTION_LIMIT);
      const resolvedMap = new Map();

      await Promise.all(namesToProcess.map(async (name) => {
        try {
          const result = await googleMapsService.geocode(name);
          if (result) {
            resolvedMap.set(name, result);
          }
        } catch (e) {
          console.error(`Failed to resolve place '${name}':`, e.message);
        }
      }));

      for (const item of itemsToResolve) {
        const nameKey = (item.place || item.name || "").toLowerCase().trim();
        const resolved = resolvedMap.get(nameKey);
        if (resolved) {
          item.placeId = resolved.placeId;
          item.lat = resolved.coordinates.lat;
          item.lng = resolved.coordinates.lng;
        }
      }

      return itineraries;
    }

    const startEnrich = Date.now();
    const enrichedItineraries = await enrichItineraryWithLocations(
      multiItineraryJson.itineraries,
      selectedPlaces
    );
    console.log(`Enrichment complete in ${Date.now() - startEnrich}ms`);

    // Background: upsert AI-provided pricing into places table (non-blocking)
    upsertPricingToPlaces(enrichedItineraries, destinationCountry)
      .catch(e => console.warn("[Pricing] Background upsert error:", e.message));

    return res.json({
      success: true,
      data: { itineraries: enrichedItineraries },
    });

  } catch (err) {
    console.error("AI /generateItineraries error:", err);
    return res.status(500).json({ error: err.message || "Itinerary generation error" });
  }
});

module.exports = router;
