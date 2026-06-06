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
- Leverage both the careGuidanceContext and the clinical details in [ADDITIONAL CLINICAL REFERENCES] (if provided) to write a detailed, informative, and empathetic motherExplanationBn, while keeping the step arrays strictly limited to the allowed steps.
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

  const vectorReferences = Array.isArray(careGuidanceContext?.vectorChunks)
    ? careGuidanceContext.vectorChunks
        .map((chunk, idx) => `[Reference ${idx + 1}] (Source: ${chunk.sourceName || chunk.citation}): ${chunk.text}`)
        .join('\n\n')
    : '';

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
${vectorReferences ? `\n[ADDITIONAL CLINICAL REFERENCES] (Use ONLY as background knowledge/clinical reasoning for writing explanations; do NOT copy this text into stepsNowBn or other step arrays):\n${vectorReferences}\n` : ''}

[TASK]
1. Explain the situation empathetically to the mother in Bangla (motherExplanationBn). Make this explanation detailed, comprehensive, and rich by incorporating relevant warnings, monitoring advice, and supportive guidance from [ADDITIONAL CLINICAL REFERENCES] (e.g. explaining why monitoring is key, and giving helpful safe advice).
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
