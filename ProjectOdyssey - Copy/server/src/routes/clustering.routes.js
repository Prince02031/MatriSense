// src/routes/clustering.routes.js

const router = require("express").Router();
const { callGemini } = require("../services/ai/geminiClient");
const { makeValidator } = require("../services/ai/validate");
const { systemPrompt: clusteringSystemPrompt, responseSchema: clusteringResponseSchema } = require("../services/ai/prompts/clustering.prompt");
const { searchPlaces, getCachedSearch, setCachedSearch } = require("../repositories/places.repo");
const {
  systemPrompt: ragKeywordsSystemPrompt,
  responseSchema: ragKeywordsResponseSchema,
} = require("../services/ai/prompts/ragKeywords.prompt");
const authMiddleware = require("../middleware/authMiddleware");

const validateClustering = makeValidator(clusteringResponseSchema);
const validateRagKeywords = makeValidator(ragKeywordsResponseSchema);

/**
 * POST /api/clustering/analyze
 * 
 * RAG-enhanced: extracts keywords, searches DB first, passes DB results
 * to the clustering prompt so AI can prioritize real database places.
 */
router.post("/analyze", authMiddleware, async (req, res) => {
  try {
    const { message, userContext } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required (string)" });
    }

    // ── Step 1: Extract keywords ──
    let keywords;
    try {
      const keywordsJson = await callGemini({
        system: ragKeywordsSystemPrompt,
        user: { message, userContext },
      });
      const v = validateRagKeywords(keywordsJson);
      if (v.ok) {
        keywords = keywordsJson;
        console.log("[RAG-Clustering] Keywords:", JSON.stringify(keywords));
      }
    } catch (err) {
      console.warn("[RAG-Clustering] Keyword extraction failed:", err.message);
    }

    // Fallback keywords
    if (!keywords) {
      keywords = {
        searchQueries: message.toLowerCase().split(/\s+/).filter(w => w.length > 2).slice(0, 3),
        country: null, city: null, category: null, intent: "search_places",
      };
    }

    // ── Step 2: DB search ──
    const cacheKey = "cluster_" + keywords.searchQueries.sort().join("|");
    let dbResults = await getCachedSearch(cacheKey);

    if (!dbResults) {
      dbResults = await searchPlaces(keywords);
      if (dbResults.length > 0) {
        await setCachedSearch(cacheKey, dbResults);
      }
    }

    // Format DB results for the AI
    const formattedDbResults = dbResults.map(r => ({
      placeId: r.id || r.place_id || null,
      name: r.name,
      category: r.category || r.primary_category || "urban",
      country: r.country_name || r.country || "",
      city: r.city_name || r.city || "",
      type: r._type || "POI",
      source: "db",
    }));

    console.log(`[RAG-Clustering] DB results: ${formattedDbResults.length}`);

    // ── Step 3: Call Gemini with DB context ──
    const payload = {
      message,
      userContext: userContext ?? null,
      dbResults: formattedDbResults,
      dbResultCount: formattedDbResults.length,
    };

    const clusteringJson = await callGemini({
      system: clusteringSystemPrompt,
      user: payload,
    });

    // Validate AI output
    const validation = validateClustering(clusteringJson);
    if (!validation.ok) {
      console.error("Invalid clustering JSON from AI:", validation.errors);
      return res.status(502).json({
        error: "AI response was invalid. Please try again.",
        validationErrors: validation.errors,
      });
    }

    // Success
    return res.json({
      success: true,
      data: clusteringJson,
    });

  } catch (err) {
    console.error("Clustering /analyze error:", err);
    return res.status(500).json({ error: err.message || "Clustering error" });
  }
});

module.exports = router;
