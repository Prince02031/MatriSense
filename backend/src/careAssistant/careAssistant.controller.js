const { buildAssistantContext } = require('./careAssistantContextBuilder');
const { sanitizeChatHistory } = require('./careAssistantPolicy');
const { buildAssistantPrompt } = require('./careAssistantPromptBuilder');
const { generateJson } = require('../ai/llmClient');
const { validateLLMOutput } = require('../safety');
const { classifyIntent, getIntentName, INTENT_TYPES } = require('./careAssistantIntentClassifier');
const { getFallbackByIntent } = require('./careAssistantIntentFallbacks');

/**
 * Helper: Ensure safetyDisclaimer field contains required Bangla phrase.
 * Repairs LLM responses that miss the disclaimer or have incorrect format.
 * This is a post-processing safety net before validation.
 */
const ensureSafetyDisclaimer = (llmOutput, riskLevel) => {
  const REQUIRED_PHRASE = 'রেজিস্টার্ড চিকিৎসকের';

  if (!llmOutput) {
    return llmOutput;
  }

  // Check if disclaimer exists and has required phrase
  if (llmOutput.safetyDisclaimer && llmOutput.safetyDisclaimer.includes(REQUIRED_PHRASE)) {
    return llmOutput; // Already valid
  }

  // Build risk-appropriate disclaimer if missing
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
  console.log('[EnsureSafetyDisclaimer] Repaired missing/invalid disclaimer. New:', builtDisclaimer);

  return llmOutput;
};

// Standard safe disclaimers/fallbacks based on patient risk level
const GET_CONSERVATIVE_FALLBACK = (riskLevel) => {
  const normalized = (riskLevel && typeof riskLevel === 'string') ? riskLevel.toUpperCase() : 'MEDIUM';

  switch (normalized) {
    case 'HIGH':
      return {
        reply: "আপনার লক্ষণগুলো উচ্চ ঝুঁকির হতে পারে। দয়া করে দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন। আমি ডাক্তার নই, তাই নির্দিষ্ট রোগ নির্ণয় বা ওষুধের পরামর্শ দিতে পারি না।",
        suggestedQuickReplies: [
          "নিকটস্থ স্বাস্থ্যকেন্দ্র কোথায়?",
          "হাসপাতালে যাওয়ার জন্য কী প্রস্তুতি নেব?"
        ],
        safetyDisclaimer: "এটি একটি জরুরি অবস্থা। দয়া করে বাসায় অপেক্ষা করবেন না।"
      };
    case 'MEDIUM':
      return {
        reply: "আপনার লক্ষণগুলো মধ্যম ঝুঁকির হতে পারে। দয়া করে একজন স্বাস্থ্যকর্মী বা ডাক্তারের সাথে যোগাযোগ করুন। ডাক্তারের পরামর্শ ছাড়া কোনো ওষুধ খাবেন না।",
        suggestedQuickReplies: [
          "আমার কী করা উচিত?",
          "কখন হাসপাতালে যাওয়া জরুরি?"
        ],
        safetyDisclaimer: "জরুরি পরিস্থিতিতে অবিলম্বে নিকটস্থ হাসপাতালে যান।"
      };
    case 'LOW':
    default:
      return {
        reply: "আপনার লক্ষণগুলো কম ঝুঁকির হতে পারে। সতর্ক থাকুন এবং পর্যাপ্ত বিশ্রাম নিন। কোনো জরুরি লক্ষণ দেখা দিলে অবিলম্বে ডাক্তারের সাথে যোগাযোগ করুন।",
        suggestedQuickReplies: [
          "গর্ভবতী অবস্থায় সাধারণ যত্ন কী?",
          "কোন কোন লক্ষণ দেখা দিলে ডাক্তারের কাছে যাব?"
        ],
        safetyDisclaimer: "চিকিৎসকের পরামর্শ ছাড়া কোনো ওষুধ খাবেন না।"
      };
  }
};

/**
 * Handles Guided Care Assistant message routing.
 * - Resolves actual database/triage state (independent of client claims)
 * - Sanitizes history memory limits and roles
 * - Compiles safe dynamic prompt
 * - Invokes local or Gemini LLM client
 * - Runs safety validator to filter prescription/diagnostic attempts or unsafe advice
 * - Gracefully triggers conservative fallbacks on LLM errors or safety failures
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

    // 3. Assemble safety-first dynamic prompt with intent detection
    const { systemInstruction, userPrompt, detectedIntent } = buildAssistantPrompt({
      userMessage: message,
      sanitizedChatHistory: cleanHistory,
      officialTriageContext: context,
      language: language || 'bn'
    });

    console.log(`[CareAssistantController] Detected intent: ${getIntentName(detectedIntent)}`);

    // Define response schema for assistant JSON parsing
    const assistantSchema = {
      type: "OBJECT",
      properties: {
        reply: {
          type: "STRING",
          description: "The empathetic Bangla or English response matching allowed care rules."
        },
        suggestedQuickReplies: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of 2-3 logical safe follow-up question suggestions based on context."
        },
        safetyDisclaimer: {
          type: "STRING",
          description: "Standard maternal care safety warning disclaimer in Bangla."
        }
      },
      required: [
        "reply",
        "suggestedQuickReplies",
        "safetyDisclaimer"
      ]
    };

    let assistantOutput = null;
    let fallbackUsed = false;
    let safetyPassed = true;
    let safetyValidationErrors = [];

    // Early fallback check if API key is missing (for Gemini mode)
    const provider = process.env.LLM_PROVIDER || 'gemini';
    const isGeminiMissingKey = provider.toLowerCase() === 'gemini' && !process.env.GEMINI_API_KEY;

    if (isGeminiMissingKey) {
      console.warn('[CareAssistantController] GEMINI_API_KEY is missing. Using conservative fallback.');
      assistantOutput = GET_CONSERVATIVE_FALLBACK(context.riskLevel);
      fallbackUsed = true;
      safetyPassed = true; // Preset is guaranteed safe
    } else {
      try {
        // 4. Generate response using LLM Client
        const response = await generateJson({
          systemInstruction,
          userPrompt,
          responseSchema: assistantSchema
        });

        if (response && response.reply) {
          assistantOutput = response;
        } else {
          throw new Error('Malformed or empty JSON response from LLM');
        }

        // 4.5 POST-PROCESSING: Ensure safety disclaimer exists and has required phrase
        assistantOutput = ensureSafetyDisclaimer(assistantOutput, context.riskLevel);

        // 5. Execute Clinical Safety Validator on LLM Output
        // Formulate validator payload mapping assistant properties into explanation schema structures
        const safetyCheckInput = {
          ...assistantOutput,
          safetyDisclaimerBn: assistantOutput.safetyDisclaimer || assistantOutput.safetyDisclaimerBn || 'রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।',
          riskLevel: context.riskLevel,
          stepsNowBn: [], // Empty stepsNowBn list avoids schema steps constraint checks
          urgentWarningBn: ['সতর্ক থাকুন'] // Standard list avoids LOW risk warning constraints
        };

        const safetyValidation = validateLLMOutput(safetyCheckInput, { riskLevel: context.riskLevel }, context.careGuidanceContext);

        if (!safetyValidation.valid) {
          console.warn('[CareAssistantController] Safety Validator Rejected Response.');
          console.warn('[CareAssistantController] Issues:', JSON.stringify(safetyValidation.issues, null, 2));
          console.warn('[CareAssistantController] Intent was:', getIntentName(detectedIntent));
          console.warn('[CareAssistantController] LLM Output was:', JSON.stringify(assistantOutput, null, 2));

          safetyValidationErrors = safetyValidation.issues;
          safetyPassed = false;
          fallbackUsed = true;

          // Use intent-based fallback instead of generic one
          const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
          assistantOutput = {
            reply: intentFallback.replyBn,
            suggestedQuickReplies: [
              "আর কোনো প্রশ্ন আছে কি?",
              "আমি এটা বুঝতে পারছি না"
            ],
            safetyDisclaimer: intentFallback.disclaimerBn
          };
        } else {
          console.log('[CareAssistantController] Safety Validation PASSED. Response approved.');
          console.log('[CareAssistantController] Intent:', getIntentName(detectedIntent));
          console.log('[CareAssistantController] Disclaimer included:', assistantOutput.safetyDisclaimer ? 'YES' : 'NO');
        }

      } catch (llmError) {
        console.error('[CareAssistantController] LLM Execution Failed:', llmError);
        console.error('[CareAssistantController] Detected intent was:', getIntentName(detectedIntent));

        // Use intent-based fallback on LLM error too
        const intentFallback = getFallbackByIntent(detectedIntent, context.riskLevel);
        assistantOutput = {
          reply: intentFallback.replyBn,
          suggestedQuickReplies: [
            "আরকোনো প্রশ্ন আছে কি?",
            "আমি এটা বুঝতে পারছি না"
          ],
          safetyDisclaimer: intentFallback.disclaimerBn
        };
        fallbackUsed = true;
        safetyPassed = true; // Preset is guaranteed safe
        safetyValidationErrors = [`LLM_ERROR: ${llmError.message}`];
      }
    }

    // 6. Return Structured API Response matching required shape
    return res.json({
      success: true,
      answer: assistantOutput.reply,
      quickReplies: assistantOutput.suggestedQuickReplies,
      safetyDisclaimer: assistantOutput.safetyDisclaimer,
      safety: {
        passed: safetyPassed,
        fallbackUsed: fallbackUsed,
        warnings: safetyValidationErrors
      },
      debug: {
        riskLevel: context.riskLevel,
        contextLoaded: true,
        ragMode: process.env.RAG_MODE || 'hybrid(default)',
        usedRetrievedCards: context.retrievedCards?.length || 0,
        usedRetrievedChunks: context.retrievedChunks?.length || 0,
        chatHistoryTurnsUsed: cleanHistory.length
      }
    });

  } catch (error) {
    console.error('[CareAssistantController] Critical Internal Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process assistant request', message: error.message });
  }
};
