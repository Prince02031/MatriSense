const { GoogleGenAI } = require('@google/genai');
const apiKey = process.env.GEMINI_API_KEY;

async function test() {
    if (!apiKey) return console.log('No API key');
    const client = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
    try {
        const result = await client.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Respond with JSON {"test": true}' }] }],
            config: { responseMimeType: 'application/json' }
        });
        console.log('Result type:', typeof result);
        console.log('Result Keys:', Object.keys(result));
        console.log('Result value:', result.value);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
