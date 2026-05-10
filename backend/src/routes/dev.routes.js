const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { extractSymptomsFromBangla, generateTriageExplanation } = require('../ai');
const { selectFollowUpQuestions, normalizeFollowUpAnswers } = require('../triage/followup');
const { buildCaseStateFromExtraction } = require('../services/caseStateBuilder');
const { runRules } = require('../triage/engine/ruleRunner');
const { buildDecision } = require('../triage/decision/decisionBuilder');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
const { validatePreGeneration } = require('../safety');

const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');

/**
 * POST /api/dev/triage-lab/run
 * End-to-end dev endpoint for the Triage Lab testing UI.
 * Returns all intermediate pipeline stages for debugging.
 */
router.post('/triage-lab/run', async (req, res) => {
  const errors = [];
  const results = {};

  try {
    const { 
      patientProfile, 
      inputTextBn, 
      checkedDangerSigns, 
      confirmedSymptoms, 
      followUpAnswers, 
      runLlm 
    } = req.body;

    // 1. EXTRACTION
    let extraction = null;
    try {
      extraction = await extractSymptomsFromBangla({
        inputTextBn,
        checkedDangerSigns: checkedDangerSigns || [],
        patientProfile
      });
      results.extraction = extraction;
    } catch (e) {
      errors.push(`Extraction failed: ${e.message}`);
    }

    // 2. SELECTED SYMPTOMS
    const selectedSymptoms = Array.isArray(confirmedSymptoms) && confirmedSymptoms.length > 0
      ? confirmedSymptoms
      : (extraction?.detectedSymptoms || []);
    results.selectedSymptoms = selectedSymptoms;

    // 3. FOLLOW-UP QUESTIONS
    let followUpQuestions = [];
    try {
      const qResult = selectFollowUpQuestions({
        extraction: extraction || { detectedSymptoms: selectedSymptoms },
        patientProfile,
        caseState: { followUpAnswers: {} } // Mocking empty answers for initial check
      });
      followUpQuestions = qResult.questions;
      results.followUpQuestions = followUpQuestions;
    } catch (e) {
      errors.push(`Follow-up selection failed: ${e.message}`);
    }

    // 4. NORMALIZATION
    let normalized = { symptomsToAdd: [], severityUpdates: {}, durationUpdates: {}, followUpAnswers: {} };
    if (Array.isArray(followUpAnswers)) {
      try {
        normalized = normalizeFollowUpAnswers(followUpAnswers);
        results.normalizedAnswers = normalized;
      } catch (e) {
        errors.push(`Normalization failed: ${e.message}`);
      }
    }

    // 5. CASE STATE
    let caseState = null;
    try {
      caseState = buildCaseStateFromExtraction({
        patient: { ...patientProfile, _id: 'dev_patient' },
        triageSession: { _id: 'dev_session', caseState: { symptoms: [] } },
        extraction: extraction || { detectedSymptoms: selectedSymptoms },
        normalizedFollowUp: normalized
      });
      results.caseState = caseState;
    } catch (e) {
      errors.push(`CaseState building failed: ${e.message}`);
      return res.status(400).json({ errors, results });
    }

    // 6. RULE ENGINE
    let ruleEvents = [];
    try {
      const runResult = await runRules(caseState);
      ruleEvents = Array.isArray(runResult) ? runResult : (runResult?.events || []);
      results.ruleEvents = ruleEvents;
    } catch (e) {
      errors.push(`Rule engine failed: ${e.message}`);
    }

    // 7. DECISION
    let decision = null;
    try {
      decision = buildDecision(ruleEvents, caseState);
      results.decision = decision;
    } catch (e) {
      errors.push(`Decision builder failed: ${e.message}`);
    }

    // 8. RAG CONTEXT
    let careGuidanceContext = null;
    if (decision) {
      try {
        const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));
        careGuidanceContext = assembleCareGuidanceContext({ decision, caseState, knowledgeCards });
        results.careGuidanceContext = careGuidanceContext;
        results.retrievedCards = careGuidanceContext.retrievedCards;
      } catch (e) {
        errors.push(`RAG assembly failed: ${e.message}`);
      }
    }

    // 9. SAFETY & EXPLANATION
    if (decision && careGuidanceContext) {
      const preGenSafety = validatePreGeneration(decision, careGuidanceContext);
      results.preGenerationSafety = preGenSafety;

      if (runLlm && preGenSafety.valid) {
        try {
          const aiResult = await generateTriageExplanation({ decision, careGuidanceContext, caseState });
          results.llmOutput = aiResult.llmOutput;
          results.postGenerationSafety = aiResult.safetyValidation;
          results.safeOutput = aiResult.safeOutput;
        } catch (e) {
          errors.push(`AI Explanation failed: ${e.message}`);
          results.safeOutput = { summaryBn: 'AI ব্যাখ্যা জেনারেট করা সম্ভব হয়নি। (AI explanation failed)' };
        }
      } else {
        results.safeOutput = { summaryBn: 'LLM জেনারেশন স্কিপ করা হয়েছে বা সেফটি চেক ফেল করেছে।' };
      }
    }

    res.json({
      success: errors.length === 0,
      errors,
      ...results
    });

  } catch (error) {
    res.status(500).json({ error: 'Global pipeline error', message: error.message, errors });
  }
});

module.exports = router;
