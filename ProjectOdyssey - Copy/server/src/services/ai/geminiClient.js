const getGeminiKeys = () => {
  if (process.env.GEMINI_API_KEYS) {
    return process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  }
  if (process.env.GEMINI_API_KEY) {
    return [process.env.GEMINI_API_KEY.trim()];
  }
  return [];
};

let geminiKeys = [];
let currentKeyIndex = 0;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function callGemini({ system, user }) {
  // Load keys lazily or reload if they were previously empty
  if (geminiKeys.length === 0) {
    geminiKeys = getGeminiKeys();
    if (geminiKeys.length === 0) {
      throw new Error("Missing GEMINI_API_KEYS or GEMINI_API_KEY in .env");
    }
  }

  const prompt = `
SYSTEM:
${system}

USER:
${typeof user === "string" ? user : JSON.stringify(user)}
`.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const bodyData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });

  let attempts = 0;
  const maxAttempts = geminiKeys.length;

  while (attempts < maxAttempts) {
    const activeKey = geminiKeys[currentKeyIndex];

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": activeKey,
      },
      body: bodyData,
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      // If quota exceeded or rate limited (429)
      if (resp.status === 429) {
        console.warn(`[Gemini API] Key at index ${currentKeyIndex} hit quota limit/rate limit (429). Switching to next key...`);
        currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
        attempts++;
        continue;
      }
      throw new Error(`Gemini error ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Gemini did not return valid JSON. Raw:\n" + text);
    }
  }

  throw new Error(`Gemini API Error: All ${maxAttempts} keys hit the quota/rate limit (429).`);
}

module.exports = { callGemini };
