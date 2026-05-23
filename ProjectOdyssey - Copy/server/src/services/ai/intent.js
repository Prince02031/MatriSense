// src/services/ai/intent.js
// Intent detection — now delegates to AI-extracted intent from ragKeywords prompt.
// This file kept for backward compatibility.

/**
 * Detect intent from message.
 * NOTE: The RAG pipeline in ai.routes.js now uses Gemini to extract intent
 * via ragKeywords.prompt.js. This function is a fallback for legacy callers.
 */
function detectIntent(message) {
  const m = message.toLowerCase();

  if (m.includes("itinerary") || m.includes("plan") || m.includes("days")) {
    return "generate_itinerary";
  }

  // Greeting / casual
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|great|nice)\b/.test(m)) {
    return "general_chat";
  }

  return "search_places";
}

module.exports = { detectIntent };
