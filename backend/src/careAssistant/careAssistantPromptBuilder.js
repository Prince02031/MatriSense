const {
  ASSISTANT_IDENTITY,
  ALLOWED_ANSWER_TYPES,
  BLOCKED_ANSWER_TYPES,
  RISK_POLICIES
} = require('./careAssistantPolicy');

/**
 * Builds the safety-first system instruction and user prompt for the Guided Care Assistant.
 * Utilizes the official DB triage context and local RAG care guidance cards.
 * 
 * @param {Object} params - Prompt building parameters
 * @param {string} params.userMessage - Latest message from the mother
 * @param {Array} params.sanitizedChatHistory - Sanitized, limited conversational history
 * @param {Object} params.officialTriageContext - Context built from database records
 * @param {string} [params.language='bn'] - Output language target ('bn' or 'en')
 * @returns {Object} { systemInstruction, userPrompt } to be passed to LLM client
 */
const buildAssistantPrompt = ({
  userMessage,
  sanitizedChatHistory = [],
  officialTriageContext,
  language = 'bn'
}) => {
  if (!officialTriageContext) {
    throw new Error('Official triage context is required to build assistant prompts');
  }

  const {
    riskLevel = 'UNKNOWN',
    symptoms = [],
    followUpAnswers = [],
    retrievedCards = [],
    assignedHospital = null,
    patientProfile = null,
    workerStatus = 'active',
    previousHistory = []
  } = officialTriageContext;

  // 1. Resolve Risk Level Specific Policy
  const normalizedRisk = riskLevel.toUpperCase();
  const riskPolicy = RISK_POLICIES[normalizedRisk] || RISK_POLICIES.LOW;

  // 2. Build the System Instruction (Safety policies & clinical limits)
  const systemInstruction = `
You are the ${ASSISTANT_IDENTITY.name}.
Your Role: ${ASSISTANT_IDENTITY.role}.
Description: ${ASSISTANT_IDENTITY.description}

CLINICAL BOUNDARIES & LIMITATIONS (CRITICAL SAFETY CONSTRAINTS):
${ASSISTANT_IDENTITY.limitations.map((limit, idx) => `${idx + 1}. ${limit}`).join('\n')}
${ASSISTANT_IDENTITY.limitations.length + 1}. Past triage summaries are only background context. Do not diagnose trends across sessions. If the mother reports new or worsening symptoms, advise her to contact a health worker or rerun the triage immediately.

ALLOWED TOPICS YOU CAN ANSWER:
${ALLOWED_ANSWER_TYPES.map((type, idx) => `- ${type}`).join('\n')}

BLOCKED TOPICS YOU MUST DEFLATE/REJECT:
${BLOCKED_ANSWER_TYPES.map((type, idx) => `- ${type}`).join('\n')}

ACTIVE PATIENT RISK LEVEL: ${normalizedRisk}
RISK-SPECIFIC CARE POLICY (MUST ADHERE TO THIS STRICKLY):
- Primary Action Directive: ${riskPolicy.primaryAction}
- Care Guidelines:
${riskPolicy.guidelines.map(g => `  * ${g}`).join('\n')}

RESPONSE OUTPUT LANGUAGE INSTRUCTIONS:
- You must reply in ${language === 'en' ? 'empathetic, clear English' : 'warm, simple, highly accessible maternal Bangla (Bangla-first)'}.
- Avoid overly technical medical jargon. Use simple layperson language.

RESPONSE STRUCTURE FORMAT:
You MUST respond with a valid JSON object matching the following structure:
{
  "reply": "Your warm, empathetic, safety-compliant answer here.",
  "suggestedQuickReplies": ["2-3 simple, safe, context-logical follow-up questions the mother might ask next."],
  "safetyDisclaimer": "Standard maternal care safety warning reminder in Bangla."
}
`;

  // 3. Assemble Triage Context Data (Official clinical record)
  const formattedSymptoms = symptoms.join(', ') || 'None reported';

  const formattedFollowUps = Array.isArray(followUpAnswers)
    ? followUpAnswers.map(ans => `Q: ${ans.questionBn || ans.questionText || ans.questionId} -> A: ${ans.answerText || ans.value}`).join('\n')
    : 'None collected';

  const formattedRagCards = Array.isArray(retrievedCards) && retrievedCards.length > 0
    ? retrievedCards.map((card, idx) => `[Card ${idx + 1}] Topic: ${card.topic}\nContent (Bangla): ${card.contentBn || 'N/A'}\nContent (English): ${card.contentEn || 'N/A'}`).join('\n\n')
    : 'No matching care card guidance found in DB.';

  const formattedPatientProfile = patientProfile
    ? `Age: ${patientProfile.age || 'N/A'}, Trimester: ${patientProfile.trimester || 'N/A'}, Gestational Week: ${patientProfile.gestationalWeek || 'N/A'}, Known Risk Factors: ${JSON.stringify(patientProfile.knownRiskFactors)}`
    : 'Anonymous Mother';

  // 3b. Format Previous Triage History Summaries (background only, no PHI beyond symptoms/risk)
  const formattedPreviousHistory = Array.isArray(previousHistory) && previousHistory.length > 0
    ? previousHistory.map((s, idx) =>
        `Session ${idx + 1} (${s.date}): Risk=${s.riskLevel}, Symptoms=[${(s.symptoms || []).join(', ') || 'None'}], Status=${s.status}, Hospital=${s.assignedHospital || 'None'}`
      ).join('\n')
    : 'No previous triage history found for this patient.';

  // 4. Format Chat History Memory
  const formattedHistory = sanitizedChatHistory.length > 0
    ? sanitizedChatHistory.map(turn => `${turn.role.toUpperCase()}: ${turn.content}`).join('\n')
    : 'No active chat history.';

  // 5. Construct User Prompt
  const userPrompt = `
=== OFFICIAL PATIENT CLINICAL CONTEXT ===
Patient Profile: ${formattedPatientProfile}
Assigned Risk Level: ${normalizedRisk}
Extracted Symptoms: ${formattedSymptoms}
Follow-up Questionnaire Responses:
${formattedFollowUps}
Assigned Hospital/Referral info: ${assignedHospital || 'Not explicitly designated'}
Worker Case Status: ${workerStatus}

=== PREVIOUS TRIAGE HISTORY (Background Context Only) ===
IMPORTANT: These are summary records only. Do NOT diagnose trends. If new or worsening symptoms are reported, advise the mother to contact a health worker or rerun the triage.
${formattedPreviousHistory}

=== LOCAL MEDICAL LITERATURE & RAG EVIDENCE ===
${formattedRagCards}

=== CONVERSATIONAL CHAT HISTORY ===
${formattedHistory}

=== LATEST MOTHER QUERY ===
Mother: "${userMessage}"

Provide your warm, safe, safety-compliant maternal response in the requested JSON structure now.
`;

  return {
    systemInstruction,
    userPrompt
  };
};

module.exports = {
  buildAssistantPrompt
};
