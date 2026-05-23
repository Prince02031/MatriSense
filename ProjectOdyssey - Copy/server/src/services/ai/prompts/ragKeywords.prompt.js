// src/services/ai/prompts/ragKeywords.prompt.js
// Lightweight Gemini call to extract structured search parameters from user message.
// This replaces the simple keyword-based detectIntent() function.

const systemPrompt = `
You are a keyword extraction engine for a travel app's search pipeline.

Given the user's message, extract structured search parameters.
Return ONLY valid JSON (no markdown, no extra text).

Rules:
- searchQueries: 1-4 short keywords/place names to search in the database (lowercase).
  Extract the MOST SPECIFIC place names, landmarks, or descriptive terms.
  Examples: "sundarbans", "tea garden", "cox's bazar", "museum"
- IMPORTANT: Check userContext.exploreSurroundings. If FALSE, do NOT extract generalized region names; extract ONLY the EXACT city/location mentioned.
- country: the country name mentioned or implied (null if not clear).
- city: the city/district name mentioned or implied (null if not clear).
- category: one of "nature", "history", "museum", "urban", "beach", "adventure" (null if not clear).
- intent: classify the message as one of:
    "search_places" — user wants to discover or learn about places
    "generate_itinerary" — user wants a day-by-day trip plan
    "general_chat" — greeting, thanks, off-topic, or clarification

OUTPUT JSON SHAPE:
{
  "searchQueries": ["string"],
  "country": "string or null",
  "city": "string or null",
  "category": "string or null",
  "intent": "search_places | generate_itinerary | general_chat"
}
`.trim();

const responseSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        searchQueries: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string" },
        },
        country: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        category: {
            type: ["string", "null"],
            enum: ["nature", "history", "museum", "urban", "beach", "adventure", null],
        },
        intent: {
            type: "string",
            enum: ["search_places", "generate_itinerary", "general_chat"],
        },
    },
    required: ["searchQueries", "country", "city", "category", "intent"],
};

module.exports = { systemPrompt, responseSchema };
