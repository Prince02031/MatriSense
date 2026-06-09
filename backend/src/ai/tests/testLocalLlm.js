require('dotenv').config();
const mongoose = require('mongoose');
const { generateJson } = require('../llmClient');
const { runAgenticAssistantFlow } = require('../../careAssistant/careAssistantAgenticService');
const TriageSession = require('../../models/TriageSession');
const Patient = require('../../models/Patient');

const { buildAssistantPrompt } = require('../../careAssistant/careAssistantPromptBuilder');
const { validateLLMOutput } = require('../../safety');
const { getFallbackByIntent } = require('../../careAssistant/careAssistantIntentFallbacks');

const assistantSchema = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    suggestedQuickReplies: { type: "ARRAY", items: { type: "STRING" } },
    safetyDisclaimer: { type: "STRING" }
  },
  required: ["reply", "suggestedQuickReplies", "safetyDisclaimer"]
};

const ensureSafetyDisclaimer = (llmOutput, riskLevel) => {
  const REQUIRED_PHRASE = 'রেজিস্টার্ড চিকিৎসকের';
  if (!llmOutput) return llmOutput;
  if (llmOutput.safetyDisclaimer && llmOutput.safetyDisclaimer.includes(REQUIRED_PHRASE)) {
    return llmOutput;
  }
  let builtDisclaimer = '';
  switch ((riskLevel || 'MEDIUM').toUpperCase()) {
    case 'HIGH':
      builtDisclaimer = `এটি একটি গুরুত্বপূর্ণ বিষয়। দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন বা নিকটস্থ হাসপাতালে যান।`;
      break;
    case 'LOW':
      builtDisclaimer = `আপনার স্বাস্থ্য যত্নের জন্য নিয়মিত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`;
      break;
    case 'MEDIUM':
    default:
      builtDisclaimer = `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`;
  }
  llmOutput.safetyDisclaimer = builtDisclaimer;
  return llmOutput;
};

const runLocalLlmSmokeTest = async () => {
  console.log('=== Running Local LLM Smoke Test ===');
  
  // 1. Test Structured JSON Generation
  console.log('\n--- 1. Testing Structured JSON Generation ---');
  try {
    const res = await generateJson({
      systemInstruction: 'You are a metadata extractor.',
      userPrompt: 'The patient mentioned: "তীব্র মাথা ব্যথা এবং চোখে ঝাপসা লাগছে"। Extract key symptoms.',
      responseSchema: {
        type: 'object',
        properties: {
          symptoms: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['symptoms']
      }
    });
    console.log('Result from local extractor:', res);
    if (res && Array.isArray(res.symptoms)) {
      console.log('✅ Structured JSON Generation PASSED');
    } else {
      console.log('❌ Structured JSON Generation FAILED: Invalid response shape');
    }
  } catch (err) {
    console.error('❌ Structured JSON Generation FAILED:', err.message);
  }

  // 2. Test Agentic Care Assistant Flow
  console.log('\n--- 2. Testing Agentic Care Assistant Flow ---');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Create a dummy session to run flow
    const patientId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();

    const session = new TriageSession({
      _id: sessionId,
      patientId: patientId,
      caseState: {
        severity: 'HIGH',
        symptoms: ['severe_headache', 'blurred_vision']
      },
      decision: {
        riskLevel: 'HIGH',
        recommendedAction: 'Immediate referral to Hospital'
      },
      status: 'NEW',
      profileSnapshot: { district: 'Dhaka' }
    });
    await session.save();

    console.log('Executing runAgenticAssistantFlow...');
    const result = await runAgenticAssistantFlow({
      sessionId: sessionId.toString(),
      userMessage: 'আমার খুব মাথা ব্যথা করছে, কী করব?',
      cleanHistory: [],
      language: 'bn',
      assistantSchema,
      buildAssistantPrompt,
      ensureSafetyDisclaimer,
      validateLLMOutput,
      getFallbackByIntent,
      detectedIntent: 'guidance'
    });

    console.log('Agentic Flow Result reply:', result.assistantOutput.reply);
    console.log('Executed tools:', result.executedTools);

    if (result.assistantOutput && result.assistantOutput.reply) {
      console.log('✅ Agentic Assistant Flow PASSED');
    } else {
      console.log('❌ Agentic Assistant Flow FAILED: reply missing');
    }

    // Cleanup dummy data
    await TriageSession.deleteOne({ _id: sessionId });
  } catch (err) {
    console.error('❌ Agentic Assistant Flow FAILED:', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

runLocalLlmSmokeTest();
