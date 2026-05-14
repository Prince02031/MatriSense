require('dotenv').config();
const { extractSymptomsFromBangla } = require('../services/aiExtractorService');

/**
 * Gemini Smoke Test for Symptom Extraction
 * Verifies live connectivity and extraction accuracy if API key is present.
 */

async function runSmokeTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('\n⚠️  SKIPPED: GEMINI_API_KEY is missing in .env file.');
    console.log('Symptom extraction will use keyword fallback mode.\n');
    process.exit(0);
  }

  console.log('\n--- Starting Gemini Symptom Extraction Smoke Test ---');
  console.log('Input (Bangla): "আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি"');
  console.log('Context: Third Trimester, 32 Weeks, Hypertension');

  try {
    const startTime = Date.now();
    const result = await extractSymptomsFromBangla({
      inputTextBn: "আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি",
      checkedDangerSigns: [],
      patientProfile: { 
        trimester: "third", 
        gestationalWeek: 32, 
        riskFactors: { hypertension: true } 
      }
    });
    const duration = Date.now() - startTime;

    console.log(`\nResponse Received (${duration}ms):`);
    console.log('------------------------------------');
    console.log(`Source: ${result.source.toUpperCase()}`);
    console.log(`Detected Symptoms: ${result.detectedSymptoms.join(', ') || 'None'}`);
    console.log(`Severity: ${JSON.stringify(result.severity)}`);
    console.log(`Duration: ${result.duration}`);
    console.log(`Uncertain Fields: ${result.uncertainFields.join(', ') || 'None'}`);
    console.log(`Needs Follow-Up: ${result.needsFollowUp}`);
    
    if (result.source === 'llm') {
      console.log('\n✅ PASS: Successfully extracted symptoms using Gemini API.');
    } else {
      console.log('\n⚠️  NOTE: System used Fallback mode. Check if GEMINI_API_KEY is valid or if rate limits were hit.');
    }
    console.log('------------------------------------\n');

  } catch (error) {
    console.error('\n❌ FAIL: Gemini extraction smoke test failed:');
    console.error(error.message);
    console.log('');
  }
}

runSmokeTest().catch(console.error);
