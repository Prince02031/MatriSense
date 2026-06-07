require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const User = require('../../models/User');
const Patient = require('../../models/Patient');
const TriageSession = require('../../models/TriageSession');
const { handleAssistantMessage } = require('../careAssistant.controller');

let passCount = 0;
let failCount = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (name, fn) => {
  return async () => {
    try {
      await fn();
      passCount++;
      console.log(`✅ PASS: ${name}`);
    } catch (e) {
      failCount++;
      console.error(`❌ FAIL: ${name} - ${e.message}`);
    }
  };
};

const run = async () => {
  // 1. Connect
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log("Connected to MongoDB for Agentic Assistant Smoke Test");
  console.log("═".repeat(70));

  // Clear existing duplicate entries
  await User.deleteMany({ email: 'agentic_test_mother@matri.com' });
  await Patient.deleteMany({ name: 'Agentic Test Mother' });

  // 2. Setup mock patient and session
  const rPhone = () => Math.floor(Math.random() * 1000000000).toString();
  
  const patientUser = await User.create({
    name: 'Agentic Test Mother',
    phone: rPhone(),
    passwordHash: 'hash',
    email: 'agentic_test_mother@matri.com',
    role: 'MOTHER'
  });

  const patient = await Patient.create({
    userId: patientUser._id,
    name: 'Agentic Test Mother',
    age: 28,
    phone: patientUser.phone,
    trimester: 2,
    gestationalWeek: 20,
    district: 'Dhaka',
    upazilaOrThana: 'Dhanmondi'
  });

  const triageSession = await TriageSession.create({
    patientId: patient._id,
    inputTextBn: 'আমার তীব্র মাথাব্যথা হচ্ছে।',
    status: 'completed',
    decision: {
      riskLevel: 'MEDIUM',
      matchedRuleName: 'Pregnancy induced hypertension rule',
      recommendedAction: 'General consultation',
      evidenceTags: ['HEADACHE'],
      allowedGuidanceType: 'CONSULTATION'
    },
    caseState: {
      symptoms: ['HEADACHE'],
      dangerSignsChecked: ['BLURRED_VISION'],
      duration: '1 day',
      followUpAnswers: {}
    },
    careGuidanceContext: {
      sources: ['WHO Guideline'],
      blockedAdvice: [],
      stepsNowBn: ['ডাক্তার দেখান।']
    }
  });

  console.log(`Seed completed. Session ID: ${triageSession._id}, Patient ID: ${patient._id}`);

  // Test 1: Agentic Flow Enabled
  await logTest("Agentic Assistant - Medium Risk - Guided Care Tool Execution", async () => {
    process.env.AGENTIC_ASSISTANT_TOOLS = 'true';
    
    const req = {
      params: { sessionId: triageSession._id.toString() },
      body: {
        message: "আমার risk medium কেন?",
        chatHistory: [],
        language: "bn"
      }
    };

    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handleAssistantMessage(req, res);

    assert.ok(responseData, "Response should be returned");
    assert.strictEqual(responseData.success, true, "Response success should be true");
    assert.ok(responseData.answer, "Should have a generated Bangla reply");
    assert.ok(responseData.safetyDisclaimer, "Should have a safety disclaimer");
    assert.ok(responseData.quickReplies, "Should suggest quick replies");
    
    // Check safety status structure
    assert.ok(responseData.safety, "Should return safety validation report");
    assert.strictEqual(responseData.safety.passed, true, "Safety validation should pass");
    assert.strictEqual(responseData.safety.fallbackUsed, false, "Should not fallback to static flow");

    console.log("Response text preview:", responseData.answer);
  })();

  console.log("Sleeping 30 seconds to clear rate limit...");
  await sleep(30000);

  // Test 2: Agentic Flow Enabled - History question
  await logTest("Agentic Assistant - History Query - History Tool Execution", async () => {
    process.env.AGENTIC_ASSISTANT_TOOLS = 'true';
    
    const req = {
      params: { sessionId: triageSession._id.toString() },
      body: {
        message: "আমার আগের triage কী ছিল?",
        chatHistory: [],
        language: "bn"
      }
    };

    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handleAssistantMessage(req, res);

    assert.ok(responseData, "Response should be returned");
    assert.strictEqual(responseData.success, true, "Response success should be true");
    assert.ok(responseData.answer, "Should return history description");
    assert.strictEqual(responseData.safety.fallbackUsed, false, "Should run without fallback");
  })();

  console.log("Sleeping 30 seconds to clear rate limit...");
  await sleep(30000);

  // Test 3: Agentic Flow Disabled - Static RAG Fallback Mode
  await logTest("Agentic Assistant - Disabled Mode - Static Fallback Execution", async () => {
    process.env.AGENTIC_ASSISTANT_TOOLS = 'false';
    
    const req = {
      params: { sessionId: triageSession._id.toString() },
      body: {
        message: "আমার risk medium কেন?",
        chatHistory: [],
        language: "bn"
      }
    };

    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handleAssistantMessage(req, res);

    assert.ok(responseData, "Response should be returned");
    assert.strictEqual(responseData.success, true, "Response success should be true");
    assert.ok(responseData.answer, "Should have a generated Bangla reply");
    assert.strictEqual(responseData.safety.fallbackUsed, false, "Static flow works normally");
  })();

  console.log("Sleeping 30 seconds to clear rate limit...");
  await sleep(30000);

  // Test 4: Forced Error Fallback Verification
  await logTest("Agentic Assistant - Forced Tool Exception - Fallback Recovery", async () => {
    process.env.AGENTIC_ASSISTANT_TOOLS = 'true';
    // Temporarily corrupting the model name to force an SDK call failure
    const originalModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_MODEL = 'non-existent-model';

    const req = {
      params: { sessionId: triageSession._id.toString() },
      body: {
        message: "আমার risk medium কেন?",
        chatHistory: [],
        language: "bn"
      }
    };

    let responseData = null;
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handleAssistantMessage(req, res);

    // Restore model name
    process.env.GEMINI_MODEL = originalModel;

    assert.ok(responseData, "Response should be returned");
    assert.strictEqual(responseData.success, true, "Response success should be true even on failure");
    assert.ok(responseData.answer, "Should fall back and return answers safely");
    assert.strictEqual(responseData.safety.fallbackUsed, true, "Fallback should be marked as true");
  })();

  // 3. Cleanup Test Data
  await User.findByIdAndDelete(patientUser._id);
  await Patient.findByIdAndDelete(patient._id);
  await TriageSession.findByIdAndDelete(triageSession._id);
  console.log("Cleanup complete");

  // 4. Summarize
  console.log("═".repeat(70));
  console.log(`Agentic Assistant Smoke Test Results:`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("═".repeat(70));

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

run().catch(e => {
  console.error("Critical run error:", e);
  process.exit(1);
});
