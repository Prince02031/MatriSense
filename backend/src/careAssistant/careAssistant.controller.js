const { buildAssistantContext } = require('./careAssistantContextBuilder');
const { sanitizeChatHistory } = require('./careAssistantPolicy');
const { buildAssistantPrompt } = require('./careAssistantPromptBuilder');
const { generateJson } = require('../ai/llmClient');
const { validateLLMOutput } = require('../safety');
const { classifyIntent, getIntentName, INTENT_TYPES } = require('./careAssistantIntentClassifier');
const { runAgenticAssistantFlow } = require('./careAssistantAgenticService');
const { getFallbackByIntent } = require('./careAssistantIntentFallbacks');
const {
  referral_find_hospital_options,
  referral_get_referral_status,
  referral_get_assigned_hospital,
  referral_create_patient_preference
} = require('../services/referralAssistantService');

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
        reply: "আপনার লক্ষণগুলো উচ্চ ঝুঁকির হতে পারে। দয়া করে দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন। আমি ডাক্তার নই, তাই নির্দিষ্ট রোগ নির্ণয় বা ওষুধের পরামর্শ দিতে পারি না।",
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
 * Processes referral intents deterministically.
 * Called before the LLM to short-circuit for status/assigned-hospital queries
 * and to enrich the context for ASK_HOSPITAL_OPTIONS before passing to LLM.
 */
const processReferralIntent = async (intent, context, req) => {
  const { sessionId } = req.params;
  const { hospitalId, reason } = req.body;
  const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
  const patientId = context.patientId || null;

  const disclaimer = REFERRAL_DISCLAIMER[riskLevel] || REFERRAL_DISCLAIMER.MEDIUM;

  // ------------------------------------------------------------------
  // 1. ASK_REFERRAL_STATUS → deterministic short-circuit
  // ------------------------------------------------------------------
  if (intent === INTENT_TYPES.ASK_REFERRAL_STATUS) {
    try {
      const statusResult = await referral_get_referral_status({ sessionId, patientId });

      let replyBn;
      if (statusResult.referralStatus === 'HOSPITAL_ASSIGNED') {
        const h = statusResult.assignedHospital;
        replyBn = `আপনার জন্য একটি হাসপাতাল নির্ধারিত হয়েছে: ${h.name} (${h.district})। ফোন: ${h.phone || 'N/A'}। আপনার স্বাস্থ্যকর্মী এটি নিশ্চিত করেছেন।`;
      } else if (statusResult.referralStatus === 'PREFERENCE_PENDING_REVIEW') {
        const p = statusResult.patientPreference;
        replyBn = `আপনি "${p.hospitalName || 'একটি হাসপাতাল'}" পছন্দ করেছেন এবং এটি আপনার স্বাস্থ্যকর্মীর পর্যালোচনার অপেক্ষায় আছে।`;
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
            type: 'REFERRAL_STATUS',
            riskLevel,
            referralStatus: statusResult.referralStatus,
            assignedHospital: statusResult.assignedHospital,
            patientPreference: statusResult.patientPreference,
            workerReviewStatus: statusResult.workerReviewStatus,
            disclaimer
          }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] ASK_REFERRAL_STATUS error:', err.message);
      return { handled: false }; // Fall through to LLM
    }
  }

  // ------------------------------------------------------------------
  // 2. ASK_ASSIGNED_HOSPITAL → deterministic short-circuit
  // ------------------------------------------------------------------
  if (intent === INTENT_TYPES.ASK_ASSIGNED_HOSPITAL) {
    try {
      const result = await referral_get_assigned_hospital({ sessionId, patientId });

      let replyBn;
      if (result.status === 'ASSIGNED') {
        const h = result.assignedHospital;
        replyBn = `আপনার জন্য নির্ধারিত হাসপাতাল হলো: ${h.name} (${h.district}${h.upazila ? ', ' + h.upazila : ''})। ফোন: ${h.phone || 'N/A'}।`;
      } else if (result.status === 'NOT_YET_ASSIGNED') {
        replyBn = `এখন পর্যন্ত আপনার জন্য কোনো হাসপাতাল চূড়ান্তভাবে নির্ধারিত হয়নি। আপনি চাইলে নিচ থেকে একটি পছন্দ করতে পারেন।`;
      } else {
        replyBn = `আপনার রেফারেল তথ্য এই মুহূর্তে পাওয়া যাচ্ছে না।`;
      }

      return {
        handled: true,
        payload: {
          reply: replyBn,
          quickReplies: ['হাসপাতালের দিকনির্দেশনা', 'হাসপাতালে কী নিয়ে যাবো?', 'হাসপাতালের বিকল্পগুলো দেখাও'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'ASSIGNED_HOSPITAL',
            riskLevel,
            assignedHospital: result.assignedHospital,
            status: result.status,
            disclaimer
          }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] ASK_ASSIGNED_HOSPITAL error:', err.message);
      return { handled: false };
    }
  }

  // ------------------------------------------------------------------
  // 3. CREATE_PATIENT_REFERRAL_PREFERENCE → save preference, confirm
  // ------------------------------------------------------------------
  if (intent === INTENT_TYPES.CREATE_PATIENT_REFERRAL_PREFERENCE) {
    if (!hospitalId || !patientId) {
      // No hospitalId provided in the message body → don't save, let LLM ask
      return { handled: false };
    }

    try {
      const prefResult = await referral_create_patient_preference({
        sessionId,
        patientId,
        hospitalId,
        reason: reason || 'Patient-selected via Guided Care Assistant',
        source: 'guided_care_assistant'
      });

      return {
        handled: true,
        payload: {
          reply: prefResult.message,
          quickReplies: ['আমার referral status কী?', 'হাসপাতালে কীভাবে যাবো?', 'স্বাস্থ্যকর্মীকে জানাতে চাই'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: {
            type: 'PREFERENCE_SAVED',
            riskLevel,
            preference: prefResult.preference,
            disclaimer
          }
        }
      };
    } catch (err) {
      console.error('[ReferralIntent] CREATE_PATIENT_REFERRAL_PREFERENCE error:', err.message);
      return {
        handled: true,
        payload: {
          reply: `দুঃখিত, আপনার পছন্দ সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।`,
          quickReplies: ['আবার চেষ্টা করুন', 'হাসপাতালের বিকল্পগুলো দেখাও'],
          safetyDisclaimer: `কোনো জটিলতার জন্য দ্রুত রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।`,
          ui: { type: 'PREFERENCE_ERROR', riskLevel, error: err.message, disclaimer }
        }
      };
    }
  }

  // ------------------------------------------------------------------
  // 4. ASK_HOSPITAL_OPTIONS → fetch options, enrich context, let LLM speak
  // Returns { handled: false, referralData } to pass to LLM
  // ------------------------------------------------------------------
  if (intent === INTENT_TYPES.ASK_HOSPITAL_OPTIONS) {
    try {
      const referralData = await referral_find_hospital_options({
        sessionId,
        patientId,
        riskLevel: context.riskLevel,
        district: context.patientProfile?.district || null,
        upazila: context.patientProfile?.upazilaOrThana || null
      });

      return {
        handled: false,
        referralData // Caller will inject into prompt context and attach as ui payload
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
      INTENT_TYPES.CREATE_PATIENT_REFERRAL_PREFERENCE
    ].includes(detectedIntent);

    // -----------------------------------------------------------------------
    // 4. Referral Pre-Processing (deterministic short-circuit where possible)
    // -----------------------------------------------------------------------

    let referralData = null;
    let uiPayload = null;

    if (isReferralIntent) {
      const referralResult = await processReferralIntent(detectedIntent, context, req);

      if (referralResult.handled) {
        // Short-circuit: return the referral response directly without LLM
        const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
        return res.json({
          success: true,
          answer: referralResult.payload.reply,
          quickReplies: referralResult.payload.quickReplies,
          safetyDisclaimer: referralResult.payload.safetyDisclaimer,
          ui: referralResult.payload.ui || null,
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

      // Not fully handled — but may have fetched hospital data (ASK_HOSPITAL_OPTIONS)
      if (referralResult.referralData) {
        referralData = referralResult.referralData;
        // Build the ui payload now — it will be attached to the LLM response
        const riskLevel = (context.riskLevel || 'MEDIUM').toUpperCase();
        uiPayload = {
          type: 'REFERRAL_OPTIONS_MAP',
          riskLevel,
          patientLocation: referralData.patientLocation,
          locationSource: referralData.locationSource,
          options: referralData.options,
          canCreatePreference: true,
          disclaimer: REFERRAL_DISCLAIMER[riskLevel] || REFERRAL_DISCLAIMER.MEDIUM
        };
      }
    }

    // -----------------------------------------------------------------------
    // 5. Assemble LLM Prompt (inject referral data into context if available)
    // -----------------------------------------------------------------------

    // Inject hospital options summary into context for the prompt builder to reference
    const enrichedContext = { ...context };
    if (referralData && referralData.options && referralData.options.length > 0) {
      const topHospitalsSummary = referralData.options.slice(0, 3)
        .map(h => `- ${h.name} (${h.district}${h.upazila ? ', ' + h.upazila : ''}): ${h.services.slice(0, 3).join(', ')}${h.distanceKm != null ? ` — ${h.distanceKm} km` : ''}`)
        .join('\n');
      enrichedContext.injectedHospitalOptions = topHospitalsSummary;
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
    let executedTools = [];

    const provider = process.env.LLM_PROVIDER || 'gemini';
    const isGeminiMissingKey = provider.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY;

    if (isGeminiMissingKey) {
      console.warn('[CareAssistantController] GEMINI_API_KEY missing. Using conservative fallback.');
      assistantOutput = GET_CONSERVATIVE_FALLBACK(context.riskLevel);
      fallbackUsed = true;
      safetyPassed = true;
    } else if (process.env.AGENTIC_ASSISTANT_TOOLS === 'true') {
      try {
        const agenticResult = await runAgenticAssistantFlow({
          sessionId,
          userMessage: message,
          cleanHistory,
          language,
          assistantSchema,
          buildAssistantPrompt,
          ensureSafetyDisclaimer,
          validateLLMOutput,
          getFallbackByIntent,
          detectedIntent
        });

        assistantOutput = agenticResult.assistantOutput;
        safetyPassed = agenticResult.safetyPassed;
        fallbackUsed = agenticResult.fallbackUsed;
        safetyValidationErrors = agenticResult.safetyValidationErrors;
        executedTools = agenticResult.executedTools || [];

      } catch (agenticError) {
        console.error('[CareAssistantController] Agentic Flow Failed, falling back to static RAG:', agenticError.message);
        // Fallback to static flow
        try {
          const response = await generateJson({ systemInstruction, userPrompt, responseSchema: assistantSchema });

          if (response && response.reply) {
            assistantOutput = response;
          } else {
            throw new Error('Malformed or empty JSON response from LLM');
          }

          // Post-processing: ensure disclaimer
          assistantOutput = ensureSafetyDisclaimer(assistantOutput, context.riskLevel);

          // Safety validation
          const safetyCheckInput = {
            ...assistantOutput,
            safetyDisclaimerBn: assistantOutput.safetyDisclaimer || 'রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।',
            riskLevel: context.riskLevel,
            stepsNowBn: [],
            urgentWarningBn: ['সতর্ক থাকুন']
          };

          const safetyValidation = validateLLMOutput(safetyCheckInput, { riskLevel: context.riskLevel }, context.careGuidanceContext);

          if (!safetyValidation.valid) {
            console.warn('[CareAssistantController] Static Safety Validator Rejected. Intent:', getIntentName(detectedIntent));
            safetyValidationErrors = safetyValidation.issues;
            safetyPassed = false;
            fallbackUsed = true;

            const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
            assistantOutput = {
              reply: intentFallback.replyBn,
              suggestedQuickReplies: ["আর কোনো প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
              safetyDisclaimer: intentFallback.disclaimerBn
            };
          } else {
            console.log('[CareAssistantController] Static Safety Validation PASSED. Intent:', getIntentName(detectedIntent));
          }

        } catch (llmError) {
          console.error('[CareAssistantController] Static Fallback LLM Execution Failed:', llmError.message);
          const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
          assistantOutput = {
            reply: intentFallback.replyBn,
            suggestedQuickReplies: ["আরকোনো প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
            safetyDisclaimer: intentFallback.disclaimerBn
          };
          fallbackUsed = true;
          safetyPassed = true;
          safetyValidationErrors = [`LLM_ERROR: ${llmError.message}`];
        }
      }
    } else {
      try {
        const response = await generateJson({ systemInstruction, userPrompt, responseSchema: assistantSchema });

        if (response && response.reply) {
          assistantOutput = response;
        } else {
          throw new Error('Malformed or empty JSON response from LLM');
        }

        // Post-processing: ensure disclaimer
        assistantOutput = ensureSafetyDisclaimer(assistantOutput, context.riskLevel);

        // Safety validation
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
        } else {
          console.log('[CareAssistantController] Safety Validation PASSED. Intent:', getIntentName(detectedIntent));
        }

      } catch (llmError) {
        console.error('[CareAssistantController] LLM Execution Failed:', llmError.message);
        const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
        assistantOutput = {
          reply: intentFallback.replyBn,
          suggestedQuickReplies: ["আরকোনো প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
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
      quickReplies: assistantOutput.suggestedQuickReplies,
      safetyDisclaimer: assistantOutput.safetyDisclaimer,
      // Attach referral UI payload if this was a hospital options request
      ...(uiPayload ? { ui: uiPayload } : {}),
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
        chatHistoryTurnsUsed: cleanHistory.length,
        executedTools: executedTools
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
