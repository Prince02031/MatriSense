require('dotenv').config();
const { generateTriageExplanation } = require('../index');
const { ALWAYS_BLOCKED_ADVICE } = require('../../safety');

async function runSmokeTest() {
  console.log('--- MatriSense Gemini AI Smoke Test ---\n');

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  SKIPPED: GEMINI_API_KEY is missing in environment variables.');
    return;
  }

  const decision = {
    riskLevel: 'HIGH',
    recommendedAction: 'Hospital Admission',
    allowedGuidanceType: 'URGENT_ESCALATION',
    reasons: ['severe_headache', 'vision_changes'],
    llmConstraints: [
      'Use simple Bangla',
      'Do not mention specific diagnoses like pre-eclampsia'
    ]
  };

  const careGuidanceContext = {
    stepsNowBn: [
      'দেরি না করে দ্রুত নিকটস্থ হাসপাতালে যান।',
      'যাওয়ার পথে কাউকে সাথে নিন।'
    ],
    monitorBn: [],
    urgentWarningBn: [
      'তীব্র মাথা ব্যথা বা চোখে ঝাপসা দেখা।'
    ],
    sources: ['Clinical Protocol v1'],
    blockedAdvice: ALWAYS_BLOCKED_ADVICE
  };

  const caseState = {
    symptoms: ['severe_headache', 'vision_changes'],
    gestationalWeek: 34
  };

  console.log('[Phase] Calling generateTriageExplanation...');

  try {
    const result = await generateTriageExplanation({ decision, careGuidanceContext, caseState });

    console.log('\n[Result Summary]');
    console.log('Provider:', result.provider);
    console.log('Model:', result.model);
    console.log('\n[Raw LLM Output]');
    console.log(JSON.stringify(result.llmOutput, null, 2));

    console.log('\n[Safety Validation]');
    console.log('Valid:', result.safetyValidation.valid);
    if (!result.safetyValidation.valid) {
      console.log('Issues:', result.safetyValidation.issues);
    }

    console.log('\n[Final Safe Output (Mother Explanation)]');
    console.log(result.safeOutput.motherExplanationBn);
    
    console.log('\n--- Smoke Test Completed ---');

  } catch (error) {
    console.error('\n❌ Unexpected Error during Smoke Test:', error);
  }
}

runSmokeTest();
