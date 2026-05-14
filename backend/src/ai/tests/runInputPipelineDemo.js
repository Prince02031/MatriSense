/**
 * Objective 5 Pipeline Demo
 * Runs the entire symptom extraction and probing flow without a frontend.
 */

const { extractSymptomsFromBangla } = require('../services/aiExtractorService');
const { selectFollowUpQuestions } = require('../../triage/followup/followUpSelector');
const { normalizeFollowUpAnswers } = require('../../triage/followup/answerNormalizer');
const { buildCaseStateFromExtraction } = require('../../services/caseStateBuilder');

async function runDemo() {
  console.log('=====================================================');
  console.log('   MATRISENSE: OBJECTIVE 5 INPUT PIPELINE DEMO       ');
  console.log('=====================================================\n');

  // 1. Context Setup
  const patientProfile = {
    trimester: 'third',
    gestationalWeek: 32,
    riskFactors: { hypertension: true },
    lastCheckupDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
  };

  const inputTextBn = "আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি";
  console.log(`[Input] Patient Text: "${inputTextBn}"`);
  console.log(`[Input] Profile: ${patientProfile.trimester} trimester, Week ${patientProfile.gestationalWeek}\n`);

  // 2. Symptom Extraction (AI/Keyword Fallback)
  console.log('STEP 1: Extraction');
  console.log('-----------------------------------------------------');
  const extraction = await extractSymptomsFromBangla({
    inputTextBn,
    checkedDangerSigns: [],
    patientProfile
  });
  console.log(`Source: ${extraction.source.toUpperCase()}`);
  console.log(`Symptoms Found: ${extraction.detectedSymptoms.join(', ')}`);
  console.log(`Duration: ${extraction.duration}`);
  console.log('-----------------------------------------------------\n');

  // 3. Follow-up Question Selection
  console.log('STEP 2: Clinical Follow-up Selection');
  console.log('-----------------------------------------------------');
  const followUp = selectFollowUpQuestions({
    extraction,
    patientProfile,
    maxQuestions: 3
  });
  console.log(`Questions Needed: ${followUp.followUpNeeded}`);
  followUp.questions.forEach((q, i) => {
    console.log(`${i + 1}. ${q.questionBn} (${q.id})`);
  });
  console.log('-----------------------------------------------------\n');

  // 4. Answer Normalization (Simulating Patient Interaction)
  console.log('STEP 3: Answer Normalization');
  console.log('-----------------------------------------------------');
  const mockAnswers = [
    { questionId: 'swelling', value: true },
    { questionId: 'headache_severity', value: 'severe' }
  ];
  console.log('Patient answers "Yes" to swelling and "Severe" to headache severity.');
  
  const normalized = normalizeFollowUpAnswers(mockAnswers);
  console.log('Symptoms added from answers:', normalized.symptomsToAdd);
  console.log('-----------------------------------------------------\n');

  // 5. Final Case State Synthesis
  console.log('STEP 4: Final Case State (Rule-Engine Ready)');
  console.log('-----------------------------------------------------');
  const finalCaseState = buildCaseStateFromExtraction({
    patient: { _id: 'patient_mock_123', age: 24, ...patientProfile },
    triageSession: { _id: 'session_mock_456', createdAt: new Date().toISOString() },
    extraction,
    normalizedFollowUp: normalized
  });
  
  console.log(JSON.stringify(finalCaseState, null, 2));
  console.log('-----------------------------------------------------\n');

  console.log('✅ PIPELINE DEMO COMPLETED');
  console.log('The object above is now ready to be sent to the Rule Engine.');
}

runDemo().catch(error => {
  console.error('\n❌ PIPELINE DEMO FAILED:');
  console.error(error.message);
});
