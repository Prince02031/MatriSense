/**
 * Demo Test Cases - Phase 11
 * Tests LOW, MEDIUM, HIGH risk scenarios with safety validation
 * Run with: node src/tests/runDemoCases.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test Case 1: LOW Risk
const lowRiskCase = {
  name: 'LOW RISK',
  bangla: 'আমি ভালো আছি। শুধু একটু ক্লান্তি এবং ঘুম বেশি লাগছে। সব কিছু সাধারণ আছে।',
  dangerSigns: [],
  trimester: 'second',
  gestationalWeek: 22
};

// Test Case 2: MEDIUM Risk
const mediumRiskCase = {
  name: 'MEDIUM RISK',
  bangla: 'আমার হালকা জ্বর আছে (৩৮ ডিগ্রি)। মাথায় খানিকটা ব্যথা আছে। দুই দিন ধরে এরকম চলছে।',
  dangerSigns: [],
  trimester: 'second',
  gestationalWeek: 18
};

// Test Case 3: HIGH Risk - Danger Signs
const highRiskCase = {
  name: 'HIGH RISK',
  bangla: 'মাথাব্যথার সাথে চোখে ঝাপসা দেখছি। গতকাল থেকে এটা শুরু হয়েছে। চিন্তিত।',
  dangerSigns: ['headache', 'blurred_vision'],
  trimester: 'second',
  gestationalWeek: 28
};

// Test Case 4: Very HIGH Risk - Multiple danger signs
const veryHighRiskCase = {
  name: 'VERY HIGH RISK',
  bangla: 'যোনি থেকে রক্তপাত হচ্ছে এবং তীব্র পেটব্যথা অনুভব করছি। শরীর খুবই দুর্বল লাগছে।',
  dangerSigns: ['vaginal_bleeding', 'severe_abdominal_pain', 'severe_weakness'],
  trimester: 'third',
  gestationalWeek: 32
};

const testCases = [lowRiskCase, mediumRiskCase, highRiskCase, veryHighRiskCase];

async function test(description, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function runFullTriagePipeline(testCase) {
  let sessionId = null;

  // Create session
  const startResponse = await axios.post(`${API_BASE}/triage/start`, {
    patientId: `test-${testCase.name}-${Date.now()}`,
    trimester: testCase.trimester,
    gestationalWeek: testCase.gestationalWeek
  });
  sessionId = startResponse.data._id;

  // Extract symptoms
  const extractResponse = await axios.post(`${API_BASE}/triage/${sessionId}/extract`, {
    inputTextBn: testCase.bangla,
    checkedDangerSigns: testCase.dangerSigns
  });

  // Confirm symptoms
  const confirmResponse = await axios.post(`${API_BASE}/triage/${sessionId}/confirm`, {
    confirmedSymptoms: extractResponse.data.extraction.detectedSymptoms,
    editedByUser: false
  });

  // Get follow-up questions
  const followUpResponse = await axios.get(`${API_BASE}/triage/${sessionId}/follow-up`);
  const questions = followUpResponse.data.questions || [];

  // Answer follow-up questions
  if (questions.length > 0) {
    const answers = questions.map((q) => ({
      questionId: q.id,
      value: q.options?.[0]?.value || 'yes'
    }));

    await axios.post(`${API_BASE}/triage/${sessionId}/answers`, { answers });
  }

  // Run triage pipeline
  const runResponse = await axios.post(`${API_BASE}/triage/${sessionId}/run`, {});

  // Get result
  const resultResponse = await axios.get(`${API_BASE}/triage/${sessionId}/result`);

  return {
    sessionId,
    extraction: extractResponse.data.extraction,
    decision: runResponse.data.decision,
    result: resultResponse.data.result,
    explanation: resultResponse.data.result.explanation
  };
}

async function runAllDemoCases() {
  console.log('\n' + '='.repeat(70));
  console.log('    DEMO TEST CASES - ALL RISK LEVELS');
  console.log('='.repeat(70));

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`   Input: "${testCase.bangla.substring(0, 60)}..."`);
    console.log(`   Trimester: ${testCase.trimester}, Week: ${testCase.gestationalWeek}`);

    const success = await test(`${testCase.name} - Full Pipeline`, async () => {
      const result = await runFullTriagePipeline(testCase);

      console.log(`   Extracted symptoms: ${result.extraction.detectedSymptoms.join(', ')}`);
      console.log(`   Extraction source: ${result.extraction.source}`);
      console.log(`   Risk Level: ${result.decision.riskLevel}`);
      console.log(`   Recommended Action: ${result.decision.recommendedAction}`);
      console.log(`   Matched Rules: ${result.decision.matchedRules.length}`);

      // Safety checks
      if (result.result.explanation) {
        const explanation = typeof result.result.explanation === 'string' 
          ? result.result.explanation 
          : JSON.stringify(result.result.explanation);

        // Check for forbidden patterns
        const forbiddenPatterns = [
          'diagnos',
          'prescrib',
          'ঔষধ খান',
          'medicine dosage',
          '100%',
          'guarantee'
        ];

        const hasForbidden = forbiddenPatterns.some(pattern =>
          explanation.toLowerCase().includes(pattern.toLowerCase())
        );

        if (hasForbidden) {
          throw new Error(`Safety validation FAILED: Forbidden pattern found in explanation`);
        }
      }

      // Check safety validation
      if (!result.result.safetyValidation?.valid) {
        console.warn(`   ⚠️  Safety validation issues: ${result.result.safetyValidation?.issues?.join(', ')}`);
      } else {
        console.log(`   ✅ Safety validation passed`);
      }

      results.push({
        caseType: testCase.name,
        riskLevel: result.decision.riskLevel,
        passed: true
      });
    });

    if (!success) {
      results.push({
        caseType: testCase.name,
        riskLevel: 'UNKNOWN',
        passed: false
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('    TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  results.forEach((r) => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.caseType}: ${r.riskLevel}`);
  });

  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  console.log(`\nTotal: ${passCount}/${totalCount} passed`);
  console.log('='.repeat(70) + '\n');

  return passCount === totalCount;
}

async function checkServer() {
  try {
    await axios.get(`${API_BASE.replace('/api', '')}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Backend server not running at http://localhost:5000');
    console.error('   Please start with: npm run dev');
    process.exit(1);
  }

  const allPassed = await runAllDemoCases();
  process.exit(allPassed ? 0 : 1);
}

main();
