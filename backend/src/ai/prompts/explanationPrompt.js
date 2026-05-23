const buildExplanationPrompt = ({ decision, careGuidanceContext, caseState }) => {
  const riskLevel = decision?.riskLevel || 'UNKNOWN';
  const allowedGuidanceType = decision?.allowedGuidanceType || 'UNKNOWN';
  const constraints = decision?.llmConstraints || [];
  
  const systemInstruction = `You are MatriSense, an AI maternal health triage assistant for Bangladesh.
Your task is to translate clinical triage data into empathetic, safe, and easily understood Bangla for a pregnant mother, and a concise summary for health workers.

CRITICAL MEDICAL RULES (NON-NEGOTIABLE):
- Language: All patient-facing fields MUST be in Bangla.
- NEVER diagnose a medical condition.
- NEVER prescribe medicine or dosages.
- MUST NOT change the provided riskLevel (${riskLevel}).
- MUST NOT add new care steps outside of the provided careGuidanceContext.
- MUST NOT give home-care-first advice when riskLevel is HIGH.
- Explain the fixed decision simply using ONLY the provided decision.reasons and careGuidanceContext.
- You must return valid JSON ONLY.

ADDITIONAL CONSTRAINTS:
${constraints.map(c => `- ${c}`).join('\n')}
`;

  // Limit caseState to essential fields to save tokens
  const limitedCaseState = {
    symptoms: caseState?.symptoms || [],
    dangerSignsChecked: caseState?.dangerSignsChecked || [],
    gestationalWeek: caseState?.gestationalWeek || null
  };

  const userPrompt = `Generate a structured triage explanation based on the following context.

[CLINICAL CONTEXT]
Case State:
${JSON.stringify(limitedCaseState, null, 2)}

Decision:
- Risk Level: ${riskLevel}
- Recommended Action: ${decision?.recommendedAction || 'N/A'}
- Allowed Guidance Type: ${allowedGuidanceType}
- Reasons: ${JSON.stringify(decision?.reasons || [])}

[RAG GUIDANCE] (You MUST ONLY use these steps):
- Immediate Steps (stepsNowBn): ${JSON.stringify(careGuidanceContext?.stepsNowBn || [])}
- Monitoring Steps (monitorBn): ${JSON.stringify(careGuidanceContext?.monitorBn || [])}
- Urgent Warnings (urgentWarningBn): ${JSON.stringify(careGuidanceContext?.urgentWarningBn || [])}

[TASK]
1. Explain the situation empathetically to the mother in Bangla (motherExplanationBn).
2. Copy the allowed RAG steps exactly into the JSON arrays (stepsNowBn, monitorBn, urgentWarningBn).
3. Write a concise medical summary in Bangla for the health worker (healthWorkerSummaryBn).
4. Include the mandatory safety disclaimer if specified in constraints.`;

  return {
    systemInstruction,
    userPrompt
  };
};

module.exports = {
  buildExplanationPrompt
};
