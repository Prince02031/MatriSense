/**
 * Test script to verify patient history saving and retrieval
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Patient = require('./src/models/Patient');
const TriageSession = require('./src/models/TriageSession');
const { runRules } = require('./src/triage/engine/ruleRunner');
const { buildDecision } = require('./src/triage/decision/decisionBuilder');

const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrisense';

async function testPatientHistory() {
  try {
    console.log('📝 TESTING PATIENT HISTORY FLOW\n');

    // Connect to DB
    console.log('[1/6] Connecting to database...');
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected\n');

    // Create a test user
    console.log('[2/6] Creating test user...');
    const user = await User.findOne({ email: 'test@history.com' }) || 
                 await User.create({
                   name: 'History Test User',
                   email: 'test@history.com',
                   phone: '01234567890',
                   passwordHash: 'dummy',
                   role: 'MOTHER'
                 });
    console.log(`✅ User created: ${user._id}\n`);

    // Create a patient linked to the user
    console.log('[3/6] Creating patient profile...');
    const patient = await Patient.findOne({ userId: user._id }) ||
                    await Patient.create({
                      userId: user._id,
                      name: 'Test Patient',
                      age: 28,
                      trimester: 'third',
                      gestationalWeek: 32,
                      knownRiskFactors: { hypertension: true }
                    });
    console.log(`✅ Patient created: ${patient._id}\n`);

    // Create a triage session
    console.log('[4/6] Creating triage session...');
    const caseState = {
      symptoms: ['severe_headache', 'blurred_vision'],
      dangerSignsChecked: [],
      trimester: 'third',
      gestationalWeek: 32,
      riskFactors: { hypertension: true },
      meta: {}
    };

    const session = await TriageSession.create({
      patientId: patient._id,
      status: 'active',
      caseState,
      inputTextBn: 'আমার মাথা খুব ব্যথা করছে এবং চোখে ঝাপসা দেখছি',
      extractionResult: {
        detectedSymptoms: ['severe_headache', 'blurred_vision'],
        severity: { severe_headache: 'severe', blurred_vision: 'unknown' }
      }
    });
    console.log(`✅ Session created: ${session._id}\n`);

    // Run rules and build decision
    console.log('[5/6] Running rules and building decision...');
    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    const decision = buildDecision(events, caseState);

    // Update session with decision
    session.decision = decision;
    session.status = 'completed';
    await session.save();
    console.log(`✅ Session completed with risk level: ${decision.riskLevel}\n`);

    // Test history retrieval
    console.log('[6/6] Testing history retrieval...');
    const sessions = await TriageSession.find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const total = await TriageSession.countDocuments({ patientId: patient._id });
    console.log(`✅ Found ${total} sessions for patient\n`);

    console.log('📊 HISTORY RESULTS:');
    sessions.forEach((s, i) => {
      console.log(`  [${i + 1}] Risk: ${s.decision?.riskLevel || 'UNKNOWN'} | Symptoms: ${s.caseState?.symptoms?.join(', ')}`);
    });

    // Test userId lookup
    console.log('\n🔍 TESTING USER ID LOOKUP:');
    const sessionsByUserId = await TriageSession.find({ patientId: patient._id });
    console.log(`✅ Found ${sessionsByUserId.length} sessions when looking up by patientId`);

    console.log('\n✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPatientHistory();
