const axios = require('axios');

/**
 * Local LLM Provider using Ollama's OpenAI-compatible completions API.
 */
const generateJsonWithLocal = async ({ systemInstruction, userPrompt, responseSchema, temperature }) => {
  const baseUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
  const model = process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';
  const temp = temperature !== undefined ? temperature : (process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.1);

  // For smaller local models, append the schema description to the system prompt to guarantee structured JSON output.
  let instruction = systemInstruction;
  if (responseSchema) {
    instruction += `\n\nYou MUST respond with a valid JSON object matching this schema definition:\n${JSON.stringify(responseSchema, null, 2)}\nDo not include any other conversational text or codeblock wrappers in your response. Only return raw JSON.`;
  }

  try {
    const response = await axios.post(`${baseUrl}/v1/chat/completions`, {
      model: model,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: temp,
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60s timeout for local generation
    });

    let rawText = response.data?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('[LocalProvider] Received empty response from local LLM.');
    }

    rawText = rawText.trim();

    // Clean up markdown block wrappers if present (e.g. ```json ... ```)
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      return JSON.parse(rawText);
    } catch (parseError) {
      console.error('[LocalProvider] JSON parse failure. Raw text was:', rawText);
      throw parseError;
    }

  } catch (error) {
    console.error('[LocalProvider] Local LLM Request Failure:', error.message);
    throw new Error(`[LocalProvider] API Failure: ${error.message}`);
  }
};

module.exports = {
  generateJsonWithLocal
};
