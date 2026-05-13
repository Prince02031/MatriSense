/**
 * E2E Triage Pipeline Test
 * Tests: Create → Extract → Confirm → Follow-up → Run → Result
 * Run with: node src/tests/runEndToEndTriagePipeline.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Mock data
const mockBanglaSymptoms = 'আমার জ্বর আছে এবং খুব দুর্বল লাগছি। মাথাব্যথা এবং বমি বমি ভাব অনুভব করছি।';
const mockDangerSigns = [];
const mockPatientProfile = {
  trimester: 'second',
  gestationalWeek: 20
};

let sessionId = null;

async function test(description, fn) {
  console.log(`\n🧪 Testing: ${description}`);
  try {
    await fn();
    console.log(`✅ PASS: ${description}`);
  } catch (error) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('    E2E TRIAGE PIPELINE TEST');
  console.log('='.repeat(60));

  try {
    // Phase 1: Create Session
    await test('POST /triage/start - Create session', async () => {
      const response = await axios.post(`${API_BASE}/triage/start`, {
        patientId: 'test-patient-' + Date.now(),
        ...mockPatientProfile
      });
      
      sessionId = response.data._id;
      if (!sessionId) throw new Error('No session ID returned');
      console.log(`   Session ID: ${sessionId}`);
    });

    // Phase 2: Get Session Status
    await test('GET /triage/:sessionId/status - Get session status', async () => {
      const response = await axios.get(`${API_BASE}/triage/${sessionId}/status`);
      if (!response.data._id) throw new Error('Session not found');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Symptoms: ${response.data.caseState?.symptoms?.length || 0}`);
    });

    // Phase 3: Extract Symptoms
    await test('POST /triage/:sessionId/extract - Extract symptoms', async () => {
      const response = await axios.post(`${API_BASE}/triage/${sessionId}/extract`, {
        inputTextBn: mockBanglaSymptoms,
        checkedDangerSigns: mockDangerSigns
      });
      
      if (!response.data.extraction?.detectedSymptoms) {
        throw new Error('No symptoms extracted');
      }
      console.log(`   Extracted: ${response.data.extraction.detectedSymptoms.join(', ')}`);
      console.log(`   Source: ${response.data.extraction.source}`);
      console.log(`   Needs Follow-up: ${response.data.extraction.needsFollowUp}`);
    });

    // Phase 4: Confirm Symptoms (with edits)
    await test('POST /triage/:sessionId/confirm - Confirm symptoms', async () => {
      // Get current symptoms first
      let currentSymptoms = [];
      try {
        const statusResponse = await axios.get(`${API_BASE}/triage/${sessionId}/status`);
        currentSymptoms = statusResponse.data.caseState?.symptoms || [];
      } catch (e) {
        console.log('   Could not fetch current symptoms');
      }

      const response = await axios.post(`${API_BASE}/triage/${sessionId}/confirm`, {
        confirmedSymptoms: currentSymptoms,
        editedByUser: false
      });
      
      if (!response.data.success) throw new Error('Confirmation failed');
      console.log(`   Confirmed: ${response.data.session.confirmedSymptoms.join(', ')}`);
      console.log(`   Edited by user: ${response.data.session.editedByUser}`);
    });

    // Phase 5: Get Follow-up Questions
    await test('GET /triage/:sessionId/follow-up - Get follow-up questions', async () => {
      const response = await axios.get(`${API_BASE}/triage/${sessionId}/follow-up`);
      
      const questions = response.data.questions || [];
      console.log(`   Follow-up questions: ${questions.length}`);
      if (questions.length > 0) {
        console.log(`   First question: ${questions[0].textBn || questions[0].text}`);
      }
    });

    // Phase 6: Answer Follow-up Questions (mock answers)
    await test('POST /triage/:sessionId/answers - Submit answers', async () => {
      const getResponse = await axios.get(`${API_BASE}/triage/${sessionId}/follow-up`);
      const questions = getResponse.data.questions || [];

      const answers = questions.map((q) => ({
        questionId: q.id,
        value: q.options?.[0]?.value || 'yes'
      }));

      const response = await axios.post(`${API_BASE}/triage/${sessionId}/answers`, {
        answers
      });
      
      if (!response.data.success) throw new Error('Answer submission failed');
      console.log(`   Submitted ${answers.length} answers`);
      console.log(`   Next step: ${response.data.nextStep}`);
    });

    // Phase 7: Run Triage Pipeline (Rule Engine + RAG)
    await test('POST /triage/:sessionId/run - Run triage pipeline', async () => {
      const response = await axios.post(`${API_BASE}/triage/${sessionId}/run`, {});
      
      if (!response.data.success) throw new Error('Triage run failed');
      console.log(`   Decision: ${response.data.decision?.riskLevel}`);
      console.log(`   Matched rules: ${response.data.decision?.matchedRules?.length || 0}`);
      console.log(`   Care guidance: ${response.data.careGuidanceContext?.guidanceBn?.length || 0} items`);
    });

    // Phase 8: Get Final Result
    await test('GET /triage/:sessionId/result - Get final result', async () => {
      const response = await axios.get(`${API_BASE}/triage/${sessionId}/result`);
      
      if (!response.data.result) throw new Error('No result returned');
      console.log(`   Risk Level: ${response.data.result.decision?.riskLevel}`);
      console.log(`   Recommended Action: ${response.data.result.decision?.recommendedAction}`);
      console.log(`   Explanation provided: ${!!response.data.result.explanation}`);
      console.log(`   Safety validation: ${response.data.result.safetyValidation?.valid}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('    ✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    process.exit(0);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('    ❌ TEST SUITE FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Check if server is running
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
    console.error('   Please start the server first: npm run dev');
    process.exit(1);
  }

  await runTests();
}

main();
