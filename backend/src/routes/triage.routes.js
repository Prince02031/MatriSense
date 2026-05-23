const express = require('express');
const router = express.Router();
const TriageSession = require('../models/TriageSession');
const { validatePreGeneration } = require('../safety');
const { extractSymptomsFromBangla, generateTriageExplanation } = require('../ai');
const { selectFollowUpQuestions, normalizeFollowUpAnswers } = require('../triage/followup');
const { buildCaseStateFromExtraction } = require('../services/caseStateBuilder');
const { logAction } = require('../services/auditService');

// POST /api/triage/start - start triage session
router.post('/start', async (req, res) => {
  try {
    const { patientId, trimester, gestationalWeek } = req.body;
    const session = new TriageSession({
      patientId,
      status: 'active',
      caseState: {
        symptoms: [],
        dangerSignsChecked: [],
        trimester: trimester || 'unknown',
        gestationalWeek: gestationalWeek || null,
        meta: {}
      }
    });
    await session.save();

    await logAction(session._id, 'Symptom submitted', 'PATIENT');

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/triage/:sessionId/status - Get current session status
router.get('/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      _id: session._id,
      status: session.status,
      caseState: session.caseState,
      extractionResult: session.extractionResult,
      confirmedSymptoms: session.confirmedSymptoms,
      editedByUser: session.editedByUser,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session', message: error.message });
  }
});

// POST /api/triage/:sessionId/extract - Extract symptoms from Bangla text
router.post('/:sessionId/extract', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { inputTextBn, checkedDangerSigns } = req.body;
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 1. Run Extraction
    const extraction = await extractSymptomsFromBangla({
      inputTextBn,
      checkedDangerSigns: checkedDangerSigns || session.caseState?.dangerSignsChecked,
      patientProfile: {
        trimester: session.caseState?.trimester,
        gestationalWeek: session.caseState?.gestationalWeek
      }
    });

    // 2. Persist Extraction Result
    session.inputTextBn = inputTextBn;
    session.extractionResult = extraction;
    session.extractionSource = extraction.source;
    session.extractionAudit = extraction.rawLlmOutput; // Store raw for quality audit

    // Initial sync to caseState
    session.caseState.symptoms = extraction.detectedSymptoms;
    session.caseState.severity = extraction.severity;

    session.updatedAt = new Date();
    await session.save();

    await logAction(sessionId, 'Extraction completed', 'SYSTEM');

    res.json({
      success: true,
      extraction: {
        detectedSymptoms: extraction.detectedSymptoms,
        source: extraction.source,
        uncertainFields: extraction.uncertainFields,
        needsFollowUp: extraction.needsFollowUp
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Extraction failed', message: error.message });
  }
});

// GET /api/triage/:sessionId/follow-up - Get next questions
router.get('/:sessionId/follow-up', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.extractionResult) return res.status(400).json({ error: 'Run extraction first' });

    const followUp = selectFollowUpQuestions({
      extraction: session.extractionResult,
      caseState: session.caseState,
      patientProfile: {
        trimester: session.caseState.trimester,
        gestationalWeek: session.caseState.gestationalWeek
      }
    });

    res.json(followUp);
  } catch (error) {
    res.status(500).json({ error: 'Failed to select follow-up questions', message: error.message });
  }
});

// POST /api/triage/:sessionId/answers - Submit answers and prepare for triage
router.post('/:sessionId/answers', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body; // Array of { questionId, value }
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 1. Normalize Answers
    const normalized = normalizeFollowUpAnswers(answers);

    // 2. Build Updated Case State (Using the new helper)
    const updatedCaseState = buildCaseStateFromExtraction({
      triageSession: session,
      extraction: session.extractionResult,
      normalizedFollowUp: normalized
    });

    // 3. Save to Session
    session.caseState = updatedCaseState;
    session.updatedAt = new Date();
    await session.save();

    await logAction(sessionId, 'Follow-up answered', 'PATIENT');

    res.json({
      success: true,
      nextStep: 'RUN_TRIAGE',
      caseState: session.caseState
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process answers', message: error.message });
  }
});

// POST /api/triage/:sessionId/explain
router.post('/:sessionId/explain', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TriageSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Triage session not found' });
    }

    const { decision, careGuidanceContext, caseState } = session;

    if (!decision || !careGuidanceContext) {
      return res.status(400).json({
        error: 'Session missing required context',
        details: 'Session must have a completed triage decision and RAG context before explanation can be generated.'
      });
    }

    // 1. Pre-Generation Safety Check (Double check before calling LLM)
    const preGenSafety = validatePreGeneration(decision, careGuidanceContext);
    if (!preGenSafety.valid) {
      return res.status(400).json({
        error: 'Pre-generation safety check failed',
        issues: preGenSafety.issues
      });
    }

    // 2. Generate LLM Explanation
    // This calls Gemini (or local) and runs the post-generation safety validator automatically
    const result = await generateTriageExplanation({
      decision,
      careGuidanceContext,
      caseState
    });

    // 3. Save results to session for audit and persistence
    session.llmOutput = result.llmOutput;
    session.safetyValidation = result.safetyValidation;
    session.safeOutput = result.safeOutput;
    session.updatedAt = new Date();
    await session.save();

    // 4. Return safe output (might be LLM output or a fallback)
    res.json({
      safeOutput: result.safeOutput,
      safetyValidation: result.safetyValidation
    });

  } catch (error) {
    console.error('[TriageRoutes] Explanation Error:', error);
    res.status(500).json({ error: 'Failed to generate explanation', message: error.message });
  }
});

const { runRules } = require('../triage/engine/ruleRunner');
const { buildDecision } = require('../triage/decision/decisionBuilder');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
const path = require('path');
const fs = require('fs');

// POST /api/triage/:sessionId/run - Execute rule engine and RAG
router.post('/:sessionId/run', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.caseState) return res.status(400).json({ error: 'Case state is empty' });

    // 1. Run Rule Engine
    const runResult = await runRules(session.caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);

    // 2. Build Decision
    const decision = buildDecision(events, session.caseState);
    session.decision = decision;

    // 3. Assemble RAG Context
    const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
    const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

    const careGuidanceContext = assembleCareGuidanceContext({
      decision,
      caseState: session.caseState,
      knowledgeCards
    });

    session.careGuidanceContext = careGuidanceContext;
    session.status = 'completed';
    session.updatedAt = new Date();

    await session.save();

    await logAction(sessionId, 'Triage run completed', 'SYSTEM');

    res.json({
      success: true,
      decision: session.decision,
      careGuidanceContext: session.careGuidanceContext
    });
  } catch (error) {
    console.error('[TriageRoutes] Run Error:', error);
    res.status(500).json({ error: 'Triage execution failed', message: error.message });
  }
});

// POST /api/triage/:sessionId/confirm - User confirms/edits extracted symptoms
router.post('/:sessionId/confirm', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { confirmedSymptoms, editedByUser } = req.body;
    
    const session = await TriageSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!session.extractionResult) {
      return res.status(400).json({ error: 'No extraction result found. Run extraction first.' });
    }

    // 1. Save confirmation data
    session.confirmedSymptoms = confirmedSymptoms || session.caseState.symptoms;
    session.editedByUser = editedByUser || false;
    
    // 2. Update case state with confirmed symptoms
    session.caseState.symptoms = session.confirmedSymptoms;
    
    // 3. Update status
    session.status = 'confirmed';
    session.updatedAt = new Date();
    
    await session.save();
    
    await logAction(sessionId, 'Symptoms confirmed by user', 'PATIENT');

    res.json({
      success: true,
      message: 'Symptoms confirmed',
      session: {
        _id: session._id,
        confirmedSymptoms: session.confirmedSymptoms,
        editedByUser: session.editedByUser,
        status: session.status,
        caseState: session.caseState
      }
    });
  } catch (error) {
    console.error('[TriageRoutes] Confirm Error:', error);
    res.status(500).json({ error: 'Failed to confirm symptoms', message: error.message });
  }
});

// GET /api/triage/:sessionId/result - Get final triage result
router.get('/:sessionId/result', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Verify triage has been completed
    if (!session.decision || session.status !== 'completed') {
      return res.status(400).json({
        error: 'Triage not yet completed',
        currentStatus: session.status,
        hint: 'Run POST /api/triage/:sessionId/run first'
      });
    }

    // Return safe result (uses safe output if available)
    res.json({
      success: true,
      result: {
        sessionId: session._id,
        status: session.status,
        decision: {
          riskLevel: session.decision.riskLevel,
          priority: session.decision.priority,
          recommendedAction: session.decision.recommendedAction,
          matchedRules: session.decision.matchedRules,
          reasons: session.decision.reasons,
          reasonsBn: session.decision.reasonsBn,
          evidenceTags: session.decision.evidenceTags
        },
        careGuidance: session.careGuidanceContext,
        explanation: session.safeOutput,
        safetyValidation: session.safetyValidation,
        completedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error('[TriageRoutes] Result Error:', error);
    res.status(500).json({ error: 'Failed to retrieve result', message: error.message });
  }
});

module.exports = router;
