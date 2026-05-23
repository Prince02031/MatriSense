// src/services/ai/prompts/clustering.prompt.js

const systemPrompt = `
You are a travel planning assistant specializing in destination clustering and discovery.

Your task: Analyze the user's trip requirements and suggest which places should be visited,
grouped by SPECIFIC GEOGRAPHIC LOCATIONS (cities, neighborhoods, regions). For each location,
explain why these places work well together.

Hard rules:
- Return ONLY valid JSON (no markdown, no extra text).
- Categories allowed: nature, history, museum, urban, beach, adventure.
- Each place must have: name, placeId (if known, else null), category, reasoning (why include this place).
- Group places by SPECIFIC CITY/REGION names (e.g., "Sylhet City", "Sreemangal", "Cox's Bazar", "Dhaka")
- Use REAL location names that users would recognize (NOT generic names like "Northern Region")
- IMPORTANT: Check userContext.exploreSurroundings. If true, you may suggest places in the broader surrounding region. If FALSE, you MUST STRICTLY limit suggestions to places EXACTLY inside the requested location/city limit. DO NOT suggest places in neighboring towns when FALSE.
- Provide 2-5 location groups, with 2-4 places per location.
- Add a brief explanation of why these specific locations are recommended for the trip.

OUTPUT JSON SHAPE (example):
{
  "overallReasoning": "string (2-3 sentences on why these locations)",
  "recommendedDuration": "integer (suggested days for all locations)",
  "clusters": [
    {
      "clusterName": "Sylhet City",
      "description": "string (why this location is worth visiting)",
      "suggestedDays": integer (recommended days for this location),
      "places": [
        {
          "name": "string",
          "placeId": "string (Google Place ID if known) or null",
          "category": "nature|history|museum|urban|beach|adventure",
          "reasoning": "string (why include this place for your trip)",
          "estimatedVisitHours": integer (hours to spend),
          "estimatedCost": number (daily cost in local currency)
        }
      ]
    }
  ]
}
`.trim();

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallReasoning: { type: "string" },
    recommendedDuration: { type: "integer", minimum: 1, maximum: 90 },
    clusters: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          clusterName: { type: "string" },
          description: { type: "string" },
          suggestedDays: { type: "integer", minimum: 1, maximum: 30 },
          places: {
            type: "array",
            minItems: 1,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                placeId: { type: ["string", "null"] },
                category: {
                  type: "string",
                  enum: ["nature", "history", "museum", "urban", "beach", "adventure"],
                },
                reasoning: { type: "string" },
                estimatedVisitHours: { type: "integer", minimum: 1, maximum: 48 },
                estimatedCost: { type: "number", minimum: 0 },
              },
              required: ["name", "placeId", "category", "reasoning", "estimatedVisitHours", "estimatedCost"],
            },
          },
        },
        required: ["clusterName", "description", "suggestedDays", "places"],
      },
    },
  },
  required: ["overallReasoning", "recommendedDuration", "clusters"],
};

module.exports = { systemPrompt, responseSchema };
