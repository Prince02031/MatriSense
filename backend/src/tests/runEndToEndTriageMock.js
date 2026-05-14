require('dotenv').config();
const path = require('path');
const fs = require('fs');

// 1. Import all pipeline components
const { extractSymptomsFromBangla } = require('../ai/services/aiExtractorService');
const { selectFollowUpQuestions } = require('../triage/followup/followUpSelector');
const { normalizeFollowUpAnswers } = require('../triage/followup/answerNormalizer');
const { buildCaseStateFromExtraction } = require('../services/caseStateBuilder');
const { runRules } = require('../triage/engine/ruleRunner');
const { buildDecision } = require('../triage/decision/decisionBuilder');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
const { validatePreGeneration } = require('../safety');
const { generateTriageExplanation } = require('../ai');

const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

async function runE2ETriage() {
  console.log('=====================================================');
  console.log('   MATRISENSE: END-TO-END TRIAGE MOCK DEMO           ');
  console.log('=====================================================\n');

  const patient = {
    _id: 'patient_001',
    age: 28,
    trimester: 'third',
    gestationalWeek: 32,
    riskFactors: { hypertension: true },
    lastCheckupDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  };

  const inputTextBn = "আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি";
  console.log(`[Input] Patient Text: "${inputTextBn}"\n`);

  // --- STAGE 1: Extraction ---
  console.log('STAGE 1: Extraction (AI/Fallback)');
  const extraction = await extractSymptomsFromBangla({
    inputTextBn,
    checkedDangerSigns: [],
    patientProfile: patient
  });
  console.log(`- Source: ${extraction.source}`);
  console.log(`- Symptoms: ${extraction.detectedSymptoms.join(', ')}\n`);

  // --- STAGE 2: Probing ---
  console.log('STAGE 2: Clinical Follow-up Selection');
  const followUp = selectFollowUpQuestions({
    extraction,
    patientProfile: patient,
    maxQuestions: 3
  });
  console.log(`- Questions: ${followUp.questions.map(q => q.id).join(', ')}`);
  
  // Mock answering the questions
  const mockAnswers = [
    { questionId: 'swelling', value: true },
    { questionId: 'headache_severity', value: 'severe' }
  ];
  console.log(`- Mock Answers: Yes to swelling, Severe to headache severity\n`);

  const normalized = normalizeFollowUpAnswers(mockAnswers);

  // --- STAGE 3: State Synthesis ---
  console.log('STAGE 3: Case State Synthesis');
  const caseState = buildCaseStateFromExtraction({
    patient,
    triageSession: { _id: 'session_001' },
    extraction,
    normalizedFollowUp: normalized
  });
  console.log(`- Final Symptoms: ${caseState.symptoms.join(', ')}\n`);

  // --- STAGE 4: Rule Engine & Decision ---
  console.log('STAGE 4: Rule Engine & Decision Builder');
  const runResult = await runRules(caseState);
  const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
  const decision = buildDecision(events, caseState);
  
  console.log(`- Risk Level: ${decision.riskLevel}`);
  console.log(`- Recommended Action: ${decision.recommendedAction}\n`);

  // --- STAGE 5: RAG Guidance ---
  console.log('STAGE 5: RAG Care Guidance Assembler');
  const careGuidanceContext = assembleCareGuidanceContext({ 
    decision, 
    caseState, 
    knowledgeCards 
  });
  console.log(`- Guidance Cards: ${careGuidanceContext.relevantCards?.length || 0} found\n`);

  // --- STAGE 6: Safety & Explanation ---
  console.log('STAGE 6: Safety Check & Explanation');
  const preGenSafety = validatePreGeneration(decision, careGuidanceContext);
  console.log(`- Pre-Generation Safety: ${preGenSafety.valid ? 'VALID ✅' : 'INVALID ❌'}`);

  if (process.env.RUN_LLM === 'true') {
    console.log('- Generating AI Explanation...');
    const aiResult = await generateTriageExplanation({ decision, careGuidanceContext, caseState });
    console.log(`- AI Explanation (Bangla): ${aiResult.safeOutput.summaryBn}\n`);
  } else {
    console.log('- Skipping AI Explanation (RUN_LLM=false). Using local fallback templates.\n');
  }

  // Final Validation for Test Pass/Fail
  const isHighRisk = decision.riskLevel === 'HIGH';
  const hasCriticalSymptoms = caseState.symptoms.includes('severe_headache') && 
                               caseState.symptoms.includes('blurred_vision') && 
                               caseState.symptoms.includes('swelling');

  if (isHighRisk && hasCriticalSymptoms) {
    console.log('✅ E2E TEST PASSED: High risk correctly identified for critical symptom cluster.');
  } else {
    console.log('❌ E2E TEST FAILED: Risk level or symptom merge incorrect.');
    process.exit(1);
  }

  console.log('\n=====================================================');
  console.log('   END-TO-END TRIAGE DEMO COMPLETED                  ');
  console.log('=====================================================');
}

runE2ETriage().catch(error => {
  console.error('\n❌ E2E PIPELINE FAILED:');
  console.error(error.stack);
  process.exit(1);
});
