const { buildAssistantContext } = require('./careAssistantContextBuilder');
const { sanitizeChatHistory } = require('./careAssistantPolicy');
const { buildAssistantPrompt } = require('./careAssistantPromptBuilder');
const { generateJson } = require('../ai/llmClient');
const { validateLLMOutput } = require('../safety');
const { classifyIntent, getIntentName, INTENT_TYPES } = require('./careAssistantIntentClassifier');
const { getFallbackByIntent } = require('./careAssistantIntentFallbacks');
const {
  referralFindHospitalOptions,
  referralGetReferralStatus,
  referralGetAssignedHospital,
  referralCreatePatientPreference,
  referralCancelPatientPreference
} = require('../mcp/referral/services/referralMcpService');

// ============================================================================
// Safety Disclaimer Repair
// ============================================================================

/**
 * Ensures safetyDisclaimer contains the required Bangla phrase.
 * Repairs LLM responses that miss it.
 */
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
  console.log('[EnsureSafetyDisclaimer] Repaired missing/invalid disclaimer.');
  return llmOutput;
};

// ============================================================================
// Conservative Fallback Templates
// ============================================================================

const GET_CONSERVATIVE_FALLBACK = (riskLevel) => {
  const normalized = (riskLevel && typeof riskLevel === 'string') ? riskLevel.toUpperCase() : 'MEDIUM';
  switch (normalized) {
    case 'HIGH':
      return {
        reply: "আপনার লক্ষণগুলো উচ্চ ঝুঁকির হতে পারে। দয়া করে দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন। আমি ডাক্তার নই, তাই নির্দিষ্ট রোগ নির্ণয় বা ওষুধের পরামর্শ দিতে পারি সমাধা না।",
        suggestedQuickReplies: ["নিকটস্থ স্বাস্থ্যকেন্দ্র কোথায়?", "হাসপাতালে যাওয়ার জন্য কী প্রস্তুতি নেব?"],
        safetyDisclaimer: "এটি একটি জরুরি অবস্থা। দয়া করে বাসায় অপেক্ষা করবেন না।"
      };
    case 'MEDIUM':
      return {
        reply: "আপনার লক্ষণগুলো মধ্যম ঝুঁকির হতে পারে। দয়া করে একজন স্বাস্থ্যকর্মী বা ডাক্তারের সাথে যোগাযোগ করুন।",
        suggestedQuickReplies: ["আমার কী করা উচিত?", "কখন হাসপাতালে যাওয়া জরুরি?"],
        safetyDisclaimer: "জরুরি পরিস্থিতিতে অবিলম্বে নিকটস্থ হাসপাতালে যান।"
      };
    case 'LOW':
    default:
      return {
        reply: "আপনার লক্ষণগুলো কম ঝুঁকির হতে পারে। সতর্ক থাকুন এবং পর্যাপ্ত বিশ্রাম নিন।",
        suggestedQuickReplies: ["গর্ভবতী অবস্থায় সাধারণ যত্ন কী?", "কোন কোন লক্ষণ দেখা দিলে ডাক্তারের কাছে যাব?"],
        safetyDisclaimer: "চিকিৎসকের পরামর্শ ছাড়া কোনো ওষুধ খাবেন না।"
      };
  }
};

// ============================================================================
// Referral disclaimer by risk level (appended to ui payload)
// ============================================================================

const REFERRAL_DISCLAIMER = {
  HIGH: 'এটি একটি জরুরি অবস্থা। হাসপাতাল বিকল্পগুলো তথ্যের জন্য দেখানো হয়েছে। অবিলম্বে কাছের হাসপাতালে যান। পছন্দ করা চূড়ান্ত রেফারেল নয় — স্বাস্থ্যকর্মী নিশ্চিত করবেন।',
  MEDIUM: 'নিচের তালিকা থেকে একটি হাসপাতাল পছন্দ করতে পারেন। আপনার স্বাস্থ্যকর্মী এটি পর্যালোচনা করে চূড়ান্ত রেফারেল নিশ্চিত করবেন। এটি তাৎক্ষণিক ক্ষমতার তথ্য নয়।',
  LOW: 'এই তালিকা থেকে আপনার কাছের সুবিধাজনক হাসপাতাল বেছে নিতে পারেন। পছন্দ করা চূড়ান্ত রেফারেল নয় — স্বাস্থ্যকর্মী নিশ্চিত করবেন।'
};

// ============================================================================
// Referral Intent Pre-Processor
// Runs BEFORE LLM for deterministic referral intents.
// Returns { handled: true, payload } or { handled: false }
// ============================================================================

/**
 * Processes referral intents deterministically using MCP Adapter Services
 */
const processReferralIntent = async (intent, context, req) => {
  const { sessionId } = req.params;
  const { hospitalId, reason, preferenceId } = req.body;
  const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
  const patientId = context.patientId || null;
  const requester = { role: 'PATIENT', patientId: patientId || undefined };

  const disclaimer = REFERRAL_DISCLAIMER[riskLevel] || REFERRAL_DISCLAIMER.MEDIUM;

  // 1. ASK_REFERRAL_STATUS
  if (intent === INTENT_TYPES.ASK_REFERRAL_STATUS) {
    try {
      const statusResult = await referralGetReferralStatus({ sessionId, patientId, requester });

      let replyBn;
      if (statusResult.referralStatus === 'HOSPITAL_ASSIGNED' || statusResult.assignedHospital) {
        const h = statusResult.assignedHospital;
        replyBn = `আপনার জন্য একটি হাসপাতাল নির্ধারিত হয়েছে: ${h.name}। আপনার স্বাস্থ্যকর্মী এটি নিশ্চিত করেছেন।`;
      } else if (statusResult.workerReviewStatus) {
        replyBn = `আপনি একটি হাসপাতাল পছন্দ করেছেন এবং এটি আপনার স্বাস্থ্যকর্মীর পর্যালোচনার অপেক্ষায় আছে।`;
      } else {
        replyBn = `এখন পর্যন্ত আপনার জন্য কোনো হাসপাতাল নির্ধারিত হয়নি। আপনি চাইলে একটি হাসপাতাল পছন্দ করতে পারেন, স্বাস্থ্যকর্মী তা পর্যালোচনা করবেন।`;
      }

      return {
        handled: true,
        payload: {
          reply: replyBn,
          quickReplies: ['হাসপাতালের বিকল্পগুলো দেখাও', 'স্বাস্থ্যকর্মীকে জানাতে চাই', 'আমার নির্ধারিত হাসপাতাল কোনটা?'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'REFERRAL_STATUS_CARD',
            riskLevel,
            patientLocation: context.patientProfile?.district || null,
            referralStatus: statusResult.referralStatus,
            assignedHospital: statusResult.assignedHospital || null,
            preferenceStatus: statusResult.workerReviewStatus,
            canCreatePreference: !statusResult.workerReviewStatus && !statusResult.assignedHospital,
            disclaimer
          },
          mcpDebug: { toolsCalled: ['referral_get_referral_status'] }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] ASK_REFERRAL_STATUS error:', err.message);
      return { handled: false };
    }
  }

  // 2. ASK_ASSIGNED_HOSPITAL
  if (intent === INTENT_TYPES.ASK_ASSIGNED_HOSPITAL) {
    try {
      const result = await referralGetAssignedHospital({ sessionId, patientId, requester });

      let replyBn;
      if (result.assigned) {
        const h = result.hospital;
        replyBn = `আপনার জন্য নির্ধারিত হাসপাতাল হলো: ${h.name} (${h.district}${h.upazila ? ', ' + h.upazila : ''})। ফোন: ${h.publicPhone || 'N/A'}।`;
      } else {
        replyBn = `এখন পর্যন্ত আপনার জন্য কোনো হাসপাতাল চূড়ান্তভাবে নির্ধারিত হয়নি। আপনি চাইলে নিচ থেকে একটি পছন্দ করতে পারেন।`;
      }

      return {
        handled: true,
        payload: {
          reply: replyBn,
          quickReplies: ['হাসপাতালের দিকনির্দেশনা', 'হাসপাতালে কী নিয়ে যাবো?', 'হাসপাতালের বিকল্পগুলো দেখাও'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'REFERRAL_STATUS_CARD',
            riskLevel,
            assignedHospital: result.hospital || null,
            preferenceStatus: null,
            canCreatePreference: !result.assigned,
            disclaimer
          },
          mcpDebug: { toolsCalled: ['referral_get_assigned_hospital'] }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] ASK_ASSIGNED_HOSPITAL error:', err.message);
      return { handled: false };
    }
  }

  // 3. CREATE_PATIENT_REFERRAL_PREFERENCE
  if (intent === INTENT_TYPES.CREATE_PATIENT_REFERRAL_PREFERENCE) {
    if (!hospitalId || !patientId) return { handled: false };
    try {
      const prefResult = await referralCreatePatientPreference({
        sessionId,
        patientId,
        hospitalId,
        reason: reason || 'Patient-selected via Guided Care Assistant',
        requester
      });

      return {
        handled: true,
        payload: {
          reply: "আপনার পছন্দ সংরক্ষিত হয়েছে। আপনার স্বাস্থ্যকর্মী এটি পর্যালোচনা করে নিশ্চিত করবেন।",
          quickReplies: ['আমার referral status কী?', 'হাসপাতালে কীভাবে যাবো?', 'স্বাস্থ্যকর্মীকে জানাতে চাই'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'REFERRAL_STATUS_CARD',
            riskLevel,
            preferenceStatus: prefResult.status,
            canCreatePreference: false,
            disclaimer
          },
          mcpDebug: { toolsCalled: ['referral_create_patient_preference'] }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] CREATE error:', err.message);
      return {
        handled: true,
        payload: {
          reply: `দুঃখিত, আপনার পছন্দ সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।`,
          quickReplies: ['আবার চেষ্টা করুন', 'হাসপাতালের বিকল্পগুলো দেখাও'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: { type: 'REFERRAL_STATUS_CARD', riskLevel, error: err.message, disclaimer },
          mcpDebug: { toolsCalled: ['referral_create_patient_preference'] }
        }
      }
    }
  }

  // 4. CANCEL_PATIENT_REFERRAL_PREFERENCE
  if (intent === INTENT_TYPES.CANCEL_PATIENT_REFERRAL_PREFERENCE) {
    if (!preferenceId || !patientId) return { handled: false };
    try {
      await referralCancelPatientPreference({ sessionId, patientId, preferenceId, requester });
      return {
        handled: true,
        payload: {
          reply: "আপনার আগের হাসপাতালের পছন্দ বাতিল করা হয়েছে। আপনি চাইলে নতুন একটি পছন্দ করতে পারেন।",
          quickReplies: ['হাসপাতালের বিকল্পগুলো দেখাও', 'স্বাস্থ্যকর্মীকে জানাতে চাই'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'REFERRAL_STATUS_CARD',
            riskLevel,
            preferenceStatus: null,
            canCreatePreference: true,
            disclaimer
          },
          mcpDebug: { toolsCalled: ['referral_cancel_patient_preference'] }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] CANCEL error:', err.message);
      return { handled: false };
    }
  }

  // 5. ASK_HOSPITAL_OPTIONS
  if (intent === INTENT_TYPES.ASK_HOSPITAL_OPTIONS) {
    try {
      const referralData = await referralFindHospitalOptions({
        sessionId,
        patientId,
        riskLevel: context.riskLevel,
        district: context.patientProfile?.district || null,
        upazila: context.patientProfile?.upazilaOrThana || null,
        requester
      });

      return {
        handled: false,
        referralData,
        mcpDebug: { toolsCalled: ['referral_find_hospital_options'] }
      };
    } catch (err) {
      console.error('[ReferralIntent] ASK_HOSPITAL_OPTIONS fetch error:', err.message);
      return { handled: false, referralData: null };
    }
  }

  return { handled: false };
};

// ============================================================================
// Main Controller
// ============================================================================

/**
 * Handles Guided Care Assistant message routing.
 */
exports.handleAssistantMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, chatHistory, language } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'User message is required' });
    }

    // 1. Load context from database
    let context;
    try {
      context = await buildAssistantContext(sessionId);
    } catch (err) {
      return res.status(404).json({ success: false, error: err.message });
    }

    // 2. Sanitize and trim memory bounds
    const cleanHistory = sanitizeChatHistory(chatHistory);

    // 3. Deterministic intent classification (before LLM)
    const detectedIntent = classifyIntent(message);
    console.log(`[CareAssistantController] Detected intent: ${getIntentName(detectedIntent)}`);

    const isReferralIntent = [
      INTENT_TYPES.ASK_HOSPITAL_OPTIONS,
      INTENT_TYPES.ASK_ASSIGNED_HOSPITAL,
      INTENT_TYPES.ASK_REFERRAL_STATUS,
      INTENT_TYPES.CREATE_PATIENT_REFERRAL_PREFERENCE,
      INTENT_TYPES.CANCEL_PATIENT_REFERRAL_PREFERENCE
    ].includes(detectedIntent);

    // -----------------------------------------------------------------------
    // 4. Referral Pre-Processing (deterministic short-circuit where possible)
    // -----------------------------------------------------------------------

    let referralData = null;
    let uiPayload = null;
    let mcpDebugOutput = null;

    if (isReferralIntent) {
      const referralResult = await processReferralIntent(detectedIntent, context, req);

      if (referralResult.handled) {
        const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
        return res.json({
          success: true,
          answer: referralResult.payload.reply,
          replyText: referralResult.payload.reply,
          quickReplies: referralResult.payload.quickReplies,
          safetyDisclaimer: referralResult.payload.safetyDisclaimer,
          ui: referralResult.payload.ui || null,
          mcpDebug: referralResult.payload.mcpDebug,
          safety: { passed: true, fallbackUsed: false, warnings: [] },
          debug: {
            riskLevel,
            contextLoaded: true,
            intent: getIntentName(detectedIntent),
            referralHandled: true,
            ragMode: process.env.RAG_MODE || 'hybrid(default)',
            usedRetrievedCards: context.retrievedCards?.length || 0,
            usedRetrievedChunks: context.retrievedChunks?.length || 0,
            chatHistoryTurnsUsed: cleanHistory.length
          }
        });
      }

      if (referralResult.referralData) {
        referralData = referralResult.referralData;
        mcpDebugOutput = referralResult.mcpDebug;
        const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
        uiPayload = {
          type: 'REFERRAL_OPTIONS_MAP',
          riskLevel,
          patientLocation: referralData.patientLocationSummary,
          locationSource: referralData.locationSource,
          options: referralData.options,
          canCreatePreference: true,
          disclaimer: REFERRAL_DISCLAIMER[riskLevel] || REFERRAL_DISCLAIMER.MEDIUM
        };
      }
    }

    // -----------------------------------------------------------------------
    // 5. Assemble LLM Prompt
    // -----------------------------------------------------------------------

    const enrichedContext = { ...context };
    if (referralData && referralData.options && referralData.options.length > 0) {
      enrichedContext.injectedHospitalOptions = referralData.llmSummary; // Use sanitized LLM Summary directly
    }

    const { systemInstruction, userPrompt } = buildAssistantPrompt({
      userMessage: message,
      sanitizedChatHistory: cleanHistory,
      officialTriageContext: enrichedContext,
      language: language || 'bn'
    });

    // -----------------------------------------------------------------------
    // 6. LLM Call
    // -----------------------------------------------------------------------

    const assistantSchema = {
      type: "OBJECT",
      properties: {
        reply: { type: "STRING" },
        suggestedQuickReplies: { type: "ARRAY", items: { type: "STRING" } },
        safetyDisclaimer: { type: "STRING" }
      },
      required: ["reply", "suggestedQuickReplies", "safetyDisclaimer"]
    };

    let assistantOutput = null;
    let fallbackUsed = false;
    let safetyPassed = true;
    let safetyValidationErrors = [];

    const provider = process.env.LLM_PROVIDER || 'gemini';
    const isGeminiMissingKey = provider.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY;

    if (isGeminiMissingKey) {
      console.warn('[CareAssistantController] GEMINI_API_KEY missing. Using conservative fallback.');
      assistantOutput = GET_CONSERVATIVE_FALLBACK(context.riskLevel);
      fallbackUsed = true;
      safetyPassed = true;
    } else {
      try {
        const response = await generateJson({ systemInstruction, userPrompt, responseSchema: assistantSchema });

        if (response && response.reply) {
          assistantOutput = response;
        } else {
          throw new Error('Malformed or empty JSON response from LLM');
        }

        assistantOutput = ensureSafetyDisclaimer(assistantOutput, context.riskLevel);

        const safetyCheckInput = {
          ...assistantOutput,
          safetyDisclaimerBn: assistantOutput.safetyDisclaimer || 'রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।',
          riskLevel: context.riskLevel,
          stepsNowBn: [],
          urgentWarningBn: ['সতর্ক থাকুন']
        };

        const safetyValidation = validateLLMOutput(safetyCheckInput, { riskLevel: context.riskLevel }, context.careGuidanceContext);

        if (!safetyValidation.valid) {
          console.warn('[CareAssistantController] Safety Validator Rejected. Intent:', getIntentName(detectedIntent));
          safetyValidationErrors = safetyValidation.issues;
          safetyPassed = false;
          fallbackUsed = true;

          const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
          assistantOutput = {
            reply: intentFallback.replyBn,
            suggestedQuickReplies: ["আর কোনো প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
            safetyDisclaimer: intentFallback.disclaimerBn
          };
        }
      } catch (llmError) {
        console.error('[CareAssistantController] LLM Execution Failed:', llmError.message);
        const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
        assistantOutput = {
          reply: intentFallback.replyBn,
          suggestedQuickReplies: ["আর কোন প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
          safetyDisclaimer: intentFallback.disclaimerBn
        };
        fallbackUsed = true;
        safetyPassed = true;
        safetyValidationErrors = [`LLM_ERROR: ${llmError.message}`];
      }
    }

    // -----------------------------------------------------------------------
    // 7. Return Structured API Response
    // -----------------------------------------------------------------------

    return res.json({
      success: true,
      answer: assistantOutput.reply,
      replyText: assistantOutput.reply,
      quickReplies: assistantOutput.suggestedQuickReplies,
      safetyDisclaimer: assistantOutput.safetyDisclaimer,
      ...(uiPayload ? { ui: uiPayload } : {}),
      ...(mcpDebugOutput ? { mcpDebug: mcpDebugOutput } : {}),
      safety: {
        passed: safetyPassed,
        fallbackUsed,
        warnings: safetyValidationErrors
      },
      debug: {
        riskLevel: context.riskLevel,
        contextLoaded: true,
        intent: getIntentName(detectedIntent),
        referralHandled: false,
        ragMode: process.env.RAG_MODE || 'hybrid(default)',
        usedRetrievedCards: context.retrievedCards?.length || 0,
        usedRetrievedChunks: context.retrievedChunks?.length || 0,
        chatHistoryTurnsUsed: cleanHistory.length
      }
    });

  } catch (error) {
    console.error('[CareAssistantController] Critical Internal Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process assistant request',
      message: error.message
    });
  }
};
