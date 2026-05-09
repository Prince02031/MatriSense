const express = require('express');
const router = express.Router();
const TriageSession = require('../models/TriageSession');
const { validatePreGeneration } = require('../safety');
const { generateTriageExplanation } = require('../ai');

// POST /api/triage/start - start triage session
router.post('/start', async (req, res) => {
  try {
    const session = new TriageSession({
      status: 'active',
      caseState: {
        symptoms: [],
        dangerSignsChecked: [],
        meta: {}
      }
    });
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Stubs for other triage flow routes
router.post('/:sessionId/confirm', (req, res) => res.status(501).json({ error: 'Not implemented' }));
router.get('/:sessionId/follow-up', (req, res) => res.status(501).json({ error: 'Not implemented' }));
router.post('/:sessionId/answers', (req, res) => res.status(501).json({ error: 'Not implemented' }));
router.post('/:sessionId/run', (req, res) => res.status(501).json({ error: 'Not implemented' }));
router.get('/:sessionId/result', (req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
