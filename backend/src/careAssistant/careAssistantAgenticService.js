const { GoogleGenAI } = require('@google/genai');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');
const { getGuidedCareContext, getRecentTriageHistory, getPatientVisibleStatus } = require('../mcp/caseContext/services/caseContextService');
const {
  referralGetReferralStatus,
  referralGetAssignedHospital,
  referralFindHospitalOptions,
  referralCreatePatientPreference,
  referralCancelPatientPreference
} = require('../mcp/referral/services/referralMcpService');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
const { retrieveEvidenceWithMode } = require('../vectorRag/retrieval/hybridRagService');

const toolDeclarations = [
  {
    name: 'case_get_guided_care_context',
    description: 'Use when the user asks about current risk, current symptoms, what to do next, what to tell a health worker, or emotional support related to current triage.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'case_get_recent_triage_history',
    description: 'Use when the user asks about previous triage sessions or symptom history.',
    parameters: {
      type: 'OBJECT',
      properties: {
        patientId: { type: 'STRING', description: 'The official patient ID' }
      },
      required: ['patientId']
    }
  },
  {
    name: 'case_get_patient_visible_status',
    description: 'Use when the user asks about case status, worker review status, or referral status.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'rag_get_safe_guidance_context',
    description: 'Use when the user asks for medical guidance, warning signs, next steps, self-care, escalation triggers, or explanation of symptoms.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' },
        userQuestion: { type: 'STRING', description: 'The specific question asked by the user' },
        audience: { type: 'STRING', enum: ['PATIENT'], description: 'The target audience' }
      },
      required: ['sessionId', 'userQuestion', 'audience']
    }
  },
  {
    name: 'referral_get_referral_status',
    description: 'Use when the user asks about the current status of their referral request (e.g. status details or worker notes).',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'referral_get_assigned_hospital',
    description: 'Use when the user asks which hospital has been assigned to them for their referral.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'referral_find_hospital_options',
    description: 'Use to find nearby maternal health hospitals. Returns a list of facilities, their locations, services, and distances.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' },
        district: { type: 'STRING', description: 'The district to search in (e.g., Dhaka)' },
        upazila: { type: 'STRING', description: 'Optional upazila to filter by' },
        serviceNeeded: { type: 'STRING', enum: ["ANC", "EMERGENCY", "DELIVERY", "GENERAL_MATERNAL"], description: 'Optional service category filter' },
        limit: { type: 'INTEGER', description: 'Maximum number of options to return (default is 5)' }
      },
      required: ['sessionId', 'district']
    }
  },
  {
    name: 'referral_create_patient_preference',
    description: 'Use when the patient explicitly requests to choose or set a specific hospital as their preference from the options.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' },
        hospitalId: { type: 'STRING', description: 'The MongoDB ObjectId of the hospital chosen' },
        reason: { type: 'STRING', description: 'The patient\'s reason for preferring this hospital' }
      },
      required: ['sessionId', 'hospitalId']
    }
  },
  {
    name: 'referral_cancel_patient_preference',
    description: 'Use when the patient explicitly requests to cancel their pending hospital preference request.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sessionId: { type: 'STRING', description: 'The official triage session ID' },
        preferenceId: { type: 'STRING', description: 'The MongoDB ObjectId of the preference to cancel' }
      },
      required: ['sessionId', 'preferenceId']
    }
  }
];

/**
 * Maps Gemini chat history format to OpenAI-compatible messages array.
 */
function mapGeminiHistoryToOpenAi(contents) {
  const openAiMessages = [];
  let toolCallCounter = 1;
  let activeToolCallIds = [];

  for (const turn of contents) {
    if (turn.role === 'user') {
      const text = turn.parts.map(p => p.text).join('\n');
      openAiMessages.push({ role: 'user', content: text });
    } 
    else if (turn.role === 'model') {
      const text = turn.parts.map(p => p.text || '').join('\n').trim();
      const toolCalls = [];
      activeToolCallIds = [];

      for (const part of turn.parts) {
        if (part.functionCall) {
          const callId = `call_${toolCallCounter++}`;
          activeToolCallIds.push({ name: part.functionCall.name, id: callId });
          toolCalls.push({
            id: callId,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args)
            }
          });
        }
      }

      const assistantMsg = { role: 'assistant' };
      if (text) assistantMsg.content = text;
      if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
      openAiMessages.push(assistantMsg);
    } 
    else if (turn.role === 'tool') {
      for (const part of turn.parts) {
        if (part.functionResponse) {
          const name = part.functionResponse.name;
          const match = activeToolCallIds.find(tc => tc.name === name);
          const toolCallId = match ? match.id : `call_unknown_${toolCallCounter++}`;
          
          openAiMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: name,
            content: JSON.stringify(part.functionResponse.response)
          });
        }
      }
    }
  }

  return openAiMessages;
}

/**
 * Converts Gemini tool declarations parameters from uppercase (STRING, OBJECT) to lowercase (string, object).
 */
function convertGeminiToOpenAiTools(geminiTools) {
  return geminiTools.map(t => {
    const cleanParams = JSON.parse(
      JSON.stringify(t.parameters)
        .replace(/"type":\s*"OBJECT"/g, '"type": "object"')
        .replace(/"type":\s*"STRING"/g, '"type": "string"')
        .replace(/"type":\s*"ARRAY"/g, '"type": "array"')
        .replace(/"type":\s*"NUMBER"/g, '"type": "number"')
        .replace(/"type":\s*"BOOLEAN"/g, '"type": "boolean"')
    );
    return {
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: cleanParams
      }
    };
  });
}

/**
 * Calls the local Ollama service using Axios and OpenAI-compatible endpoints.
 */
const callLlmLocal = async ({ messages, tools, systemInstruction, temperature, responseFormat }) => {
  const baseUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
  const model = process.env.LOCAL_LLM_MODEL || 'qwen2.5:3b';
  const temp = temperature !== undefined ? temperature : 0.1;

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  const payload = {
    model: model,
    messages: formattedMessages,
    temperature: temp
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  try {
    const res = await axios.post(`${baseUrl}/v1/chat/completions`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000
    });

    const choice = res.data?.choices?.[0]?.message;
    return choice;
  } catch (err) {
    console.error('[AgenticAssistant Local] Ollama call failed:', err.message);
    throw err;
  }
};

/**
 * Executes the Agentic RAG Flow for Guided Care Assistant
 */
const runAgenticAssistantFlow = async ({
  sessionId,
  userMessage,
  cleanHistory,
  language,
  assistantSchema,
  buildAssistantPrompt,
  ensureSafetyDisclaimer,
  validateLLMOutput,
  getFallbackByIntent,
  detectedIntent
}) => {
  console.log(`[AgenticAssistant] Running Agentic RAG Flow. Enabled by AGENTIC_ASSISTANT_TOOLS=true`);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing for agentic mode');
  }

  // 1. Load minimal deterministic safety envelope
  const session = await TriageSession.findById(sessionId);
  if (!session) {
    throw new Error(`Triage session not found: ${sessionId}`);
  }

  const patientId = session.patientId ? session.patientId.toString() : null;
  const riskLevel = session.decision?.riskLevel || 'UNKNOWN';
  const allowedGuidanceType = session.decision?.recommendedAction || 'General';

  const safetyBoundaries = {
    canDiagnose: false,
    canPrescribe: false,
    canSuggestDosage: false,
    canDowngradeRisk: false,
    mustPreserveUrgency: true
  };

  console.log(`[AgenticAssistant] Safety envelope loaded:`, {
    sessionId,
    patientId,
    riskLevel,
    allowedGuidanceType
  });
  console.log(`[AgenticAssistant] Tool declarations available:`, toolDeclarations.map(t => t.name));

  // Initialize client
  const client = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Construct initial contents for Phase 1 (Tool calling loop)
  const systemInstruction = `You are the MatriSense Guided Care Assistant.
You are in agentic retrieval mode.
Your goal is to answer the user's maternal health query safely.
To do this, you have access to tools to retrieve case context, previous history, status, or RAG guidance cards.

CURRENT PATIENT SAFETY ENVELOPE (CRITICAL SECURITY & CONTEXT):
- Session ID: "${sessionId}"
- Patient ID: "${patientId || 'N/A'}"
- Risk Level: "${riskLevel}"
- Allowed Guidance Type: "${allowedGuidanceType}"
- Safety Boundaries:
  * canDiagnose: false
  * canPrescribe: false
  * canSuggestDosage: false
  * canDowngradeRisk: false
  * mustPreserveUrgency: true

INSTRUCTIONS:
1. Analyze the user query.
2. Decide which tools to call to get the necessary context to answer. Use the official Session ID and Patient ID provided in the envelope.
3. If no tools are needed (e.g. for casual greetings or unrelated chat), do not call any tools.
4. Once you have called the necessary tools and received their results, or if no tools are needed, return a message indicating you are ready to answer.`;

  const contents = [
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  // Tool results cache to compile the final context
  const toolResults = {
    guidedContext: null,
    historyData: null,
    statusData: null,
    careContext: null
  };

  // Phase 1: Tool loop
  let rounds = 0;
  const maxRounds = 2;
  const maxCalls = 3;
  let callCount = 0;
  let loop = true;
  const executedTools = [];

  const providerType = process.env.LLM_PROVIDER || 'gemini';

  while (loop && rounds < maxRounds && callCount < maxCalls) {
    console.log(`[AgenticAssistant] [Round ${rounds + 1}] Invoking LLM (${providerType}) to select tools...`);
    
    let calls = [];
    let assistantText = '';
    let responseParts = [];

    if (providerType === 'local') {
      const openAiMessages = mapGeminiHistoryToOpenAi(contents);
      const openAiTools = convertGeminiToOpenAiTools(toolDeclarations);
      
      const choice = await callLlmLocal({
        messages: openAiMessages,
        tools: openAiTools,
        systemInstruction,
        temperature: 0.1
      });

      assistantText = choice?.content || '';
      if (choice?.tool_calls && choice.tool_calls.length > 0) {
        for (const tc of choice.tool_calls) {
          let parsedArgs = {};
          try {
            parsedArgs = typeof tc.function.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function.arguments;
          } catch (e) {
            console.error('[AgenticAssistant Local] Failed to parse tool arguments:', tc.function.arguments);
          }
          calls.push({
            name: tc.function.name,
            args: parsedArgs
          });
          responseParts.push({
            functionCall: {
              name: tc.function.name,
              args: parsedArgs
            }
          });
        }
      }
      if (assistantText) {
        responseParts.unshift({ text: assistantText });
      }
    } else {
      const response = await client.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: toolDeclarations }]
        }
      });

      const geminiCalls = response.functionCalls || [];
      for (const gc of geminiCalls) {
        calls.push({
          name: gc.name,
          args: gc.args
        });
      }
      responseParts = response?.candidates?.[0]?.content?.parts || [];
    }

    if (calls.length > 0) {
      console.log(`[AgenticAssistant] LLM selected tools:`, calls.map(c => c.name));

      // Push model's turn to history
      contents.push({
        role: 'model',
        parts: responseParts
      });

      for (const call of calls) {
        if (callCount >= maxCalls) break;
        callCount++;

        const { name, args } = call;
        console.log(`[AgenticAssistant] Executing tool: ${name}`);

        let resultPayload = null;
        try {
          if (name === 'case_get_guided_care_context') {
            resultPayload = await getGuidedCareContext({
              sessionId: sessionId, // Force official sessionId
              requester: { role: 'INTERNAL' }
            });
            toolResults.guidedContext = resultPayload;
            executedTools.push(name);
          } 
          else if (name === 'case_get_recent_triage_history') {
            if (!patientId) {
              resultPayload = { error: 'No patientId associated with this session' };
            } else {
              resultPayload = await getRecentTriageHistory({
                patientId: patientId, // Force official patientId
                requester: { role: 'INTERNAL' }
              });
              toolResults.historyData = resultPayload;
              executedTools.push(name);
            }
          } 
          else if (name === 'case_get_patient_visible_status') {
            resultPayload = await getPatientVisibleStatus({
              sessionId: sessionId, // Force official sessionId
              requester: { role: 'INTERNAL' }
            });
            toolResults.statusData = resultPayload;
            executedTools.push(name);
          } 
          else if (name === 'rag_get_safe_guidance_context') {
            const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
            const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

            const caseStateClone = {
              ...session.caseState,
              rawInput: args.userQuestion || userMessage,
              userInput: args.userQuestion || userMessage
            };

            const careContext = await assembleCareGuidanceContext({
              decision: session.decision,
              caseState: caseStateClone,
              knowledgeCards,
              hybridRetriever: retrieveEvidenceWithMode
            });

            resultPayload = {
              retrievedCards: careContext.retrievedCards || [],
              vectorChunks: careContext.vectorChunks || [],
              ragMode: careContext.ragMode || 'json'
            };
            toolResults.careContext = resultPayload;
            executedTools.push(name);
          } 
          else if (name === 'referral_get_referral_status') {
            resultPayload = await referralGetReferralStatus({
              sessionId: sessionId,
              patientId: patientId,
              requester: { role: 'PATIENT', patientId: patientId }
            });
            toolResults.statusData = {
              caseStatus: resultPayload.referralStatus,
              assignedHospitalName: resultPayload.assignedHospital?.name || null
            };
            executedTools.push(name);
          }
          else if (name === 'referral_get_assigned_hospital') {
            resultPayload = await referralGetAssignedHospital({
              sessionId: sessionId,
              patientId: patientId,
              requester: { role: 'PATIENT', patientId: patientId }
            });
            executedTools.push(name);
          }
          else if (name === 'referral_find_hospital_options') {
            const patientLocation = session.profileSnapshot?.latitude && session.profileSnapshot?.longitude ? {
              lat: session.profileSnapshot.latitude,
              lng: session.profileSnapshot.longitude
            } : undefined;

            resultPayload = await referralFindHospitalOptions({
              sessionId: sessionId,
              patientId: patientId,
              riskLevel: riskLevel,
              district: args.district,
              upazila: args.upazila || undefined,
              patientLocation,
              serviceNeeded: args.serviceNeeded || undefined,
              limit: args.limit || 5,
              requester: { role: 'PATIENT', patientId: patientId }
            });
            toolResults.referralData = resultPayload;
            executedTools.push(name);
          }
          else if (name === 'referral_create_patient_preference') {
            resultPayload = await referralCreatePatientPreference({
              sessionId: sessionId,
              patientId: patientId,
              hospitalId: args.hospitalId,
              reason: args.reason || '',
              requester: { role: 'PATIENT', patientId: patientId }
            });
            executedTools.push(name);
          }
          else if (name === 'referral_cancel_patient_preference') {
            resultPayload = await referralCancelPatientPreference({
              sessionId: sessionId,
              patientId: patientId,
              preferenceId: args.preferenceId,
              requester: { role: 'PATIENT', patientId: patientId }
            });
            executedTools.push(name);
          }
          else {
            throw new Error(`Tool not whitelisted: ${name}`);
          }

          console.log(`[AgenticAssistant] Tool ${name} execution SUCCESS`);
        } catch (toolError) {
          console.error(`[AgenticAssistant] Tool ${name} execution FAILED:`, toolError.message);
          resultPayload = { error: `Failed to execute tool: ${toolError.message}` };
        }

        // Push tool response turn to history
        contents.push({
          role: 'tool',
          parts: [{
            functionResponse: {
              name,
              response: resultPayload
            }
          }]
        });
      }
      rounds++;
    } else {
      console.log(`[AgenticAssistant] LLM did not call any tools (or is done).`);
      loop = false;
    }
  }

  // Compile final context from tool results
  const assembledContext = {
    sessionId: session._id,
    patientId: session.patientId || null,
    riskLevel: riskLevel,
    inputTextBn: session.inputTextBn || '',
    symptoms: session.caseState?.symptoms || [],
    followUpAnswers: session.caseState?.followUpAnswers || {},
    careGuidanceContext: session.careGuidanceContext || {},
    retrievedCards: toolResults.careContext?.retrievedCards || [],
    retrievedChunks: toolResults.careContext?.vectorChunks || [],
    assignedHospital: session.assignedHospitalSnapshot?.name || null,
    workerStatus: session.status || 'active',
    previousHistory: [],
    patientProfile: null,
    safetyBoundaries: safetyBoundaries,
    recommendedAssistantTone: riskLevel === 'HIGH' ? "urgent_and_calm" : "informative_and_reassuring",
    documentUploadSummary: null
  };

  // Update with specific tool outputs if fetched
  if (toolResults.guidedContext) {
    const gc = toolResults.guidedContext;
    assembledContext.riskLevel = gc.riskLevel || assembledContext.riskLevel;
    assembledContext.symptoms = gc.mainSymptoms || assembledContext.symptoms;
    assembledContext.followUpAnswers = gc.followUpSummary || assembledContext.followUpAnswers;
    assembledContext.safetyBoundaries = gc.safetyBoundaries || assembledContext.safetyBoundaries;
    assembledContext.recommendedAssistantTone = gc.recommendedAssistantTone || assembledContext.recommendedAssistantTone;
    assembledContext.assignedHospital = gc.referralStatus?.name || assembledContext.assignedHospital;
    assembledContext.workerStatus = gc.patientVisibleStatus || assembledContext.workerStatus;
  }

  if (toolResults.historyData && toolResults.historyData.history) {
    assembledContext.previousHistory = toolResults.historyData.history.map(h => ({
      date: h.date ? new Date(h.date).toLocaleDateString('en-US') : 'Unknown',
      riskLevel: h.riskLevel,
      status: h.status,
      assignedHospital: h.referralStatus?.name || null
    }));
  }

  if (toolResults.statusData) {
    const sd = toolResults.statusData;
    assembledContext.workerStatus = sd.caseStatus || assembledContext.workerStatus;
    assembledContext.assignedHospital = sd.assignedHospitalName || assembledContext.assignedHospital;
  }

  // Load basic patient profile if needed for formatting, keeping PII hidden normally
  if (patientId) {
    const patientRecord = await Patient.findById(patientId);
    if (patientRecord) {
      assembledContext.patientProfile = {
        name: 'HIDDEN FOR PATIENT SAFETY',
        age: patientRecord.age >= 18 && patientRecord.age <= 35 ? '18_TO_35' : 'UNKNOWN',
        phone: 'HIDDEN FOR PATIENT SAFETY',
        trimester: patientRecord.trimester,
        gestationalWeek: patientRecord.gestationalWeek,
        knownRiskFactors: patientRecord.knownRiskFactors || {},
        district: patientRecord.district,
        upazilaOrThana: patientRecord.upazilaOrThana,
        consentToUseLocationForReferral: false
      };
    }
  }

  // Phase 2: Final JSON Generation (no tools passed, schema enforced)
  console.log(`[AgenticAssistant] Phase 2: Generating final structured response...`);

  // Build the official prompt utilizing the assembled context
  const { systemInstruction: finalSystemInstruction, userPrompt: finalUserPrompt } = buildAssistantPrompt({
    userMessage: userMessage,
    sanitizedChatHistory: cleanHistory,
    officialTriageContext: assembledContext,
    language: language || 'bn'
  });

  let rawText;
  if (providerType === 'local') {
    const choice = await callLlmLocal({
      messages: [{ role: 'user', content: finalUserPrompt }],
      systemInstruction: finalSystemInstruction,
      temperature: 0.2,
      responseFormat: { type: 'json_object' }
    });
    rawText = choice?.content;
    if (rawText) {
      rawText = rawText.trim();
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }
    }
  } else {
    const finalResponse = await client.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: finalUserPrompt }] }
      ],
      config: {
        systemInstruction: finalSystemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: assistantSchema
      }
    });
    rawText = finalResponse.text ?? finalResponse.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  if (!rawText) {
    throw new Error(`Received empty response from ${providerType === 'local' ? 'Local LLM' : 'Gemini'} in Phase 2`);
  }

  let assistantOutput = JSON.parse(rawText);

  // Post-processing: ensure disclaimer
  assistantOutput = ensureSafetyDisclaimer(assistantOutput, riskLevel);

  // Safety validation
  const safetyCheckInput = {
    ...assistantOutput,
    safetyDisclaimerBn: assistantOutput.safetyDisclaimer || 'রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।',
    riskLevel: riskLevel,
    stepsNowBn: [],
    urgentWarningBn: ['সতর্ক থাকুন']
  };

  const safetyValidation = validateLLMOutput(safetyCheckInput, { riskLevel: riskLevel }, assembledContext.careGuidanceContext);
  console.log(`[AgenticAssistant] Safety validator check result:`, safetyValidation.valid ? 'PASSED' : 'FAILED');

  let safetyPassed = true;
  let safetyValidationErrors = [];
  let fallbackUsed = false;

  if (!safetyValidation.valid) {
    safetyValidationErrors = safetyValidation.issues;
    safetyPassed = false;
    fallbackUsed = true;

    const intentFallback = getFallbackByIntent(detectedIntent, riskLevel);
    assistantOutput = {
      reply: intentFallback.replyBn,
      suggestedQuickReplies: ["আর কোনো প্রশ্ন আছে কি?", "আমি এটা বুঝতে পারছি না"],
      safetyDisclaimer: intentFallback.disclaimerBn
    };
  }

  return {
    assistantOutput,
    safetyPassed,
    fallbackUsed,
    safetyValidationErrors,
    assembledContext,
    executedTools,
    referralData: toolResults.referralData
  };
};

module.exports = {
  runAgenticAssistantFlow
};
