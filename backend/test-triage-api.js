/**
 * Quick test of the triage API to verify the HIGH risk fix
 */
const { extractSymptomsFromBangla } = require('./src/ai/services/aiExtractorService');
const { buildCaseStateFromExtraction } = require('./src/services/caseStateBuilder');
const { runRules } = require('./src/triage/engine/ruleRunner');
const { buildDecision } = require('./src/triage/decision/decisionBuilder');

async function testTriageRisk() {
  console.log('\n=== TRIAGE API RISK ASSESSMENT TEST ===\n');
  
  const testCases = [
    {
      name: 'Severe symptoms (headache + vision + swelling)',
      input: 'আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি এবং হাত ফুলে গেছে'
    },
    {
      name: 'Fever + weakness',
      input: 'আমার জ্বর আছে এবং খুব দুর্বল লাগছি'
    },
    {
      name: 'Vaginal bleeding',
      input: 'আমার যোনি থেকে রক্তপাত হচ্ছে'
    },
    {
      name: 'Mild symptoms (just headache)',
      input: 'আমার মাথা একটু ব্যথা করছে'
    }
  ];

  for (const testCase of testCases) {
    console.log(`TEST: ${testCase.name}`);
    console.log(`Input: ${testCase.input}`);
    
    try {
      // Step 1: Extract symptoms
      const extraction = await extractSymptomsFromBangla({
        inputTextBn: testCase.input,
        checkedDangerSigns: [],
        patientProfile: {
          trimester: 'third',
          gestationalWeek: 32
        }
      });
      
      console.log(`  Extracted symptoms: ${extraction.detectedSymptoms.join(', ')}`);
      
      // Step 2: Build case state
      const caseState = buildCaseStateFromExtraction({
        patient: { _id: 'test', age: 28, trimester: 'third', gestationalWeek: 32, riskFactors: {} },
        triageSession: { _id: 'test_session' },
        extraction,
        normalizedFollowUp: {}
      });
      
      // Step 3: Run rules
      const runResult = await runRules(caseState);
      const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
      
      // Step 4: Build decision
      const decision = buildDecision(events, caseState);
      
      console.log(`  Risk Level: ${decision.riskLevel}`);
      console.log(`  Recommended Action: ${decision.recommendedAction}\n`);
    } catch (error) {
      console.log(`  ERROR: ${error.message}\n`);
    }
  }
  
  console.log('=== TEST COMPLETED ===\n');
  process.exit(0);
}

testTriageRisk().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
