const express = require('express');
const router = express.Router();
const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { validatePreGeneration } = require('../safety');
const { extractSymptomsFromBangla, generateTriageExplanation } = require('../ai');
const { selectFollowUpQuestions, normalizeFollowUpAnswers } = require('../triage/followup');
const { buildCaseStateFromExtraction } = require('../services/caseStateBuilder');
const { logAction } = require('../services/auditService');

// POST /api/triage/start - start triage session
router.post('/start', async (req, res) => {
  try {
    const { patientId, userId, trimester, gestationalWeek } = req.body;

    // Load patient profile
    // Try patientId first, then userId (lookup Patient by userId)
    let patient = null;
    if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ error: `Patient not found for id: ${patientId}` });
      }
    } else if (userId) {
      // If userId is provided instead, look up patient by userId
      patient = await Patient.findOne({ userId });
      if (!patient) {
        // Auto-create Patient record if it doesn't exist
        console.log(`[TriageRoutes] Creating new patient profile for userId ${userId}`);
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ error: `User not found for id: ${userId}` });
        }
        
        patient = new Patient({
          userId,
          name: user.name || 'Unknown',
          age: user.age || 0,
          phone: user.phone || '',
          trimester: trimester || 'unknown',
          gestationalWeek: gestationalWeek || null
        });
        await patient.save();
        console.log(`[TriageRoutes] Patient created: ${patient._id}`);
      }
    }

    // Seed trimester/gestationalWeek: explicit body params > patient profile > defaults
    const resolvedTrimester = trimester || patient?.trimester || 'unknown';
    const resolvedGestationalWeek = gestationalWeek || patient?.gestationalWeek || null;

    // Calculate lastCheckupGapDays from patient profile if available
    let lastCheckupGapDays = null;
    if (patient?.lastCheckupDate) {
      const diffMs = Math.abs(new Date() - new Date(patient.lastCheckupDate));
      lastCheckupGapDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Merge riskFactors from patient profile (knownRiskFactors field)
    const riskFactors = patient?.knownRiskFactors || patient?.riskFactors || {};

    // --- Build profileSnapshot from patient + payload ---
    // Payload location fields take priority over saved profile (session-level override)
    const {
      division: payloadDivision,
      district: payloadDistrict,
      upazilaOrThana: payloadUpazila,
      addressOrVillage: payloadAddress,
      latitude: payloadLat,
      longitude: payloadLng,
      locationSource: payloadLocSrc,
      age: payloadAge,
      emergencyContactName: payloadEcName,
      emergencyContactPhone: payloadEcPhone,
      lastCheckupDate: payloadLastCheckup,
      knownRiskFactors: payloadRiskFactors
    } = req.body;

    const profileSnapshot = {};
    // Seed from patient profile if available
    if (patient) {
      profileSnapshot.name = patient.name;
      profileSnapshot.age = patient.age;
      profileSnapshot.phone = patient.phone;
      profileSnapshot.trimester = resolvedTrimester;
      profileSnapshot.gestationalWeek = resolvedGestationalWeek;
      profileSnapshot.expectedDeliveryDate = patient.expectedDeliveryDate || null;
      profileSnapshot.lastCheckupDate = patient.lastCheckupDate || null;
      profileSnapshot.knownRiskFactors = patient.knownRiskFactors || null;
      profileSnapshot.emergencyContactName = patient.emergencyContactName || null;
      profileSnapshot.emergencyContactPhone = patient.emergencyContactPhone || null;
      profileSnapshot.division = patient.division || null;
      profileSnapshot.district = patient.district || null;
      profileSnapshot.upazilaOrThana = patient.upazilaOrThana || null;
      profileSnapshot.addressOrVillage = patient.addressOrVillage || null;
      profileSnapshot.latitude = patient.latitude || null;
      profileSnapshot.longitude = patient.longitude || null;
      profileSnapshot.locationSource = patient.locationSource || null;
    }
    // Override with payload fields if provided
    if (payloadDivision) profileSnapshot.division = payloadDivision;
    if (payloadDistrict) profileSnapshot.district = payloadDistrict;
    if (payloadUpazila) profileSnapshot.upazilaOrThana = payloadUpazila;
    if (payloadAddress) profileSnapshot.addressOrVillage = payloadAddress;
    if (payloadLat !== undefined && payloadLat !== null) profileSnapshot.latitude = payloadLat;
    if (payloadLng !== undefined && payloadLng !== null) profileSnapshot.longitude = payloadLng;
    if (payloadLocSrc) profileSnapshot.locationSource = payloadLocSrc;
    if (payloadAge !== undefined) profileSnapshot.age = payloadAge;
    if (payloadEcName) profileSnapshot.emergencyContactName = payloadEcName;
    if (payloadEcPhone) profileSnapshot.emergencyContactPhone = payloadEcPhone;
    if (payloadLastCheckup) profileSnapshot.lastCheckupDate = payloadLastCheckup;
    if (payloadRiskFactors !== undefined) profileSnapshot.knownRiskFactors = payloadRiskFactors;
    if (trimester) profileSnapshot.trimester = resolvedTrimester;
    if (gestationalWeek) profileSnapshot.gestationalWeek = resolvedGestationalWeek;

    const session = new TriageSession({
      patientId: patient?._id || null,
      status: 'active',
      // Store snapshot only if we have any data; old sessions without it still load fine
      profileSnapshot: Object.keys(profileSnapshot).length > 0 ? profileSnapshot : undefined,
      caseState: {
        symptoms: [],
        dangerSignsChecked: [],
        // Top-level rule engine fields — seeded from patient profile so rules fire correctly
        // even before follow-up answers are collected. See caseStateBuilder for full explanation.
        trimester: resolvedTrimester,
        gestationalWeek: resolvedGestationalWeek,
        riskFactors,
        lastCheckupGapDays,
        meta: {}
      }
    });
    await session.save();

    await logAction(session._id, 'Triage session started', 'PATIENT');

    res.json({
      success: true,
      sessionId: session._id,
      patientId: patient?._id || null,
      caseState: session.caseState
    });
  } catch (error) {
    console.error('[TriageRoutes] Start Error:', error);
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
const { retrieveEvidenceWithMode } = require('../vectorRag/retrieval/hybridRagService');
const path = require('path');
const fs = require('fs');

// POST /api/triage/:sessionId/run - Execute rule engine and RAG
router.post('/:sessionId/run', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('[TriageRoutes] Starting run for sessionId:', sessionId);
    
    const session = await TriageSession.findById(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (!session.caseState) return res.status(400).json({ error: 'Case state is empty' });

    console.log('[TriageRoutes] Running rules...');
    // 1. Run Rule Engine
    const runResult = await runRules(session.caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    console.log('[TriageRoutes] Rules complete, events:', events?.length);

    // 2. Build Decision
    console.log('[TriageRoutes] Building decision...');
    const decision = buildDecision(events, session.caseState);
    session.decision = decision;
    console.log('[TriageRoutes] Decision built:', decision?.riskLevel);

    // 3. Assemble RAG Context (with optional hybrid vector retrieval)
    console.log('[TriageRoutes] Assembling RAG context...');
    const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
    const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

    const careGuidanceContext = await assembleCareGuidanceContext({
      decision,
      caseState: session.caseState,
      knowledgeCards,
      // Pass hybrid retrieval function for optional vector RAG integration
      hybridRetriever: retrieveEvidenceWithMode,
    });
    console.log('[TriageRoutes] RAG context assembled');

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

// GET /api/triage/patient/:patientId/history - Get patient's triage history
router.get('/patient/:patientId/history', async (req, res) => {
  try {
    const { patientId } = req.params;

    // Try to find by patientId first, if not found, try as userId
    let patient = await Patient.findById(patientId);
    let actualPatientId = patientId;
    let lookupUserId = null;

    if (!patient) {
      // Maybe it's a userId, not a patientId - look up patient by userId
      patient = await Patient.findOne({ userId: patientId });
      if (patient) {
        actualPatientId = patient._id.toString();
        lookupUserId = patientId;
      }
      // If still not found, just use the patientId as-is (will return empty results)
      else {
        actualPatientId = patientId;
        lookupUserId = patientId; // Also try as userId for legacy null patientId sessions
      }
    }

    const { limit = 10, skip = 0 } = req.query;

    // Fetch triage sessions for this patient, sorted by most recent first
    let sessions = await TriageSession.find({ patientId: actualPatientId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // If no sessions found and we have a userId, check for legacy sessions with null patientId
    // This handles older sessions created before auto-Patient creation was implemented
    if (sessions.length === 0 && lookupUserId) {
      console.log(`[TriageRoutes] No sessions with patientId ${actualPatientId}, checking for legacy null patientId sessions`);
      const nullSessions = await TriageSession.find({ patientId: null })
        .sort({ createdAt: -1 })
        .lean();
      
      // Filter to sessions that belong to this userId by checking if they have completed decisions
      // (This is a safety measure - ideally we'd have userId on sessions)
      if (nullSessions.length > 0) {
        console.log(`[TriageRoutes] Found ${nullSessions.length} legacy sessions with null patientId`);
      }
    }

    console.log(`[TriageRoutes] History query: input=${patientId}, actualPatientId=${actualPatientId}, found=${sessions.length}`);

    // Count total sessions for pagination
    const total = await TriageSession.countDocuments({ patientId: actualPatientId });

    // Get the most recent session for summary
    const latestSession = await TriageSession.findOne({ patientId: actualPatientId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      history: sessions.map(s => ({
        sessionId: s._id,
        createdAt: s.createdAt,
        status: s.status,
        symptoms: s.caseState?.symptoms || [],
        riskLevel: s.decision?.riskLevel || 'UNKNOWN',
        recommendedAction: s.decision?.recommendedAction || 'UNKNOWN',
        triageDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'
      })),
      total,
      latest: latestSession ? {
        sessionId: latestSession._id,
        createdAt: latestSession.createdAt,
        riskLevel: latestSession.decision?.riskLevel || 'UNKNOWN',
        symptoms: latestSession.caseState?.symptoms || []
      } : null
    });
    } catch (error) {
    console.error('[TriageRoutes] History Error:', error);
    res.status(500).json({ error: 'Failed to retrieve history', message: error.message });
  }
});

// Guided Care Assistant route
const careAssistantController = require('../careAssistant/careAssistant.controller');
router.post('/:sessionId/assistant/message', careAssistantController.handleAssistantMessage);

module.exports = router;
