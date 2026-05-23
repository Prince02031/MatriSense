// src/services/ai/prompts/itinerary.prompt.js

const systemPrompt = `
You are a travel planning assistant for a trip planning application.

Rules:
- Return ONLY valid JSON (no markdown, no extra text).
- Categories allowed: nature, history & museum, urban.
- visitDurationMin = typical minutes spent at the place (integer minutes).
- If not from the database, placeId must be null.
- Use time slots: morning, afternoon, evening.

CONVERSATION CONTEXT:
- If the user has previous messages in this conversation, they will be provided in the "conversationHistory" field.
- Use this context to understand the user's preferences and reference previous discussions naturally.
- For example, if they previously mentioned "I love beaches", prioritize coastal destinations.
- If they asked about a specific destination earlier, remember that context.

PRICING RULES:
- Use the correct currency for the destination country (BDT for Bangladesh, USD for USA, THB for Thailand, INR for India, EUR for Europe, etc.).
- For each place item, set "entryCost" to the admission/entry fee in local currency: 0 if free, a number if paid, null if unknown.
- If dbResults includes "estCostPerDay" for a matching place, use that value for entryCost.
- "estimatedTotalCost" = total estimated trip spend in local currency.
- Add "currency" (ISO code, e.g. "BDT") to the itineraryPreview object.

OUTPUT JSON SHAPE (example):
{
  "reply": "string",
  "itineraryPreview": {
    "days": [
      {
        "day": 1,
        "items": [
          {
            "placeId": null,
            "name": "string",
            "category": "nature|history & museum|urban",
            "visitDurationMin": 90,
            "entryCost": 200,
            "time": "morning|afternoon|evening"
          }
        ]
      }
    ],
    "estimatedTotalCost": 0,
    "currency": "BDT"
  }
}
`.trim();

// KEEP THIS for AJV validation (do NOT send to Gemini in Option A)
const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    itineraryPreview: {
      type: "object",
      additionalProperties: false,
      properties: {
        days: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              day: { type: "integer", minimum: 1 },
              items: {
                type: "array",
                minItems: 1,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    placeId: { type: ["string", "null"] },
                    name: { type: "string" },
                    category: { type: "string", enum: ["nature", "history & museum", "urban"] },
                    visitDurationMin: { type: "integer", minimum: 15, maximum: 1440 },
                    entryCost: { type: ["number", "null"], minimum: 0 },
                    time: { type: "string", enum: ["morning", "afternoon", "evening"] }
                  },
                  required: ["placeId", "name", "category", "visitDurationMin", "entryCost", "time"]
                }
              }
            },
            required: ["day", "items"]
          }
        },
        estimatedTotalCost: { type: "number", minimum: 0 },
        currency: { type: "string" }
      },
      required: ["days", "estimatedTotalCost", "currency"]
    }
  },
  required: ["reply", "itineraryPreview"]
};

module.exports = { systemPrompt, responseSchema };
