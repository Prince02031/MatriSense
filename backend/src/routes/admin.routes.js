const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { retrieveEvidenceWithMode } = require('../vectorRag/retrieval/hybridRagService');

const testCasesPath = path.join(__dirname, '../triage/tests/testCases.json');
const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');

// Lazy-load triage modules to avoid circular deps
const getTriageModules = () => {
  const { runRules } = require('../triage/engine/ruleRunner');
  const { buildDecision } = require('../triage/decision/decisionBuilder');
  const { selectFollowUpQuestions } = require('../triage/followup/followUpSelector');
  const { validateCaseState } = require('../triage/caseState.validator');
  return { runRules, buildDecision, selectFollowUpQuestions, validateCaseState };
};

const getRagModules = () => {
  const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
  const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));
  return { assembleCareGuidanceContext, knowledgeCards, hybridRetriever: retrieveEvidenceWithMode };
};

// ─────────────────────────────────────────────
// TRIAGE LAB
// ─────────────────────────────────────────────

// GET /api/admin/triage-lab/cases
router.get('/triage-lab/cases', (req, res) => {
  try {
    const cases = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
    res.json(cases);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/triage-lab/run  — run a single test case
router.post('/triage-lab/run', async (req, res) => {
  try {
    const tc = req.body;
    const { runRules, buildDecision } = getTriageModules();

    const dangerSignsChecked = tc.followUpAnswers?.dangerSignsChecked || [];
    const symptoms = Array.from(new Set([...(tc.confirmedSymptoms || []), ...dangerSignsChecked]));
    const caseState = {
      symptoms,
      dangerSignsChecked: dangerSignsChecked.length ? dangerSignsChecked : (tc.confirmedSymptoms || []),
      trimester: tc.profile?.trimester || 'second',
      gestationalWeek: tc.profile?.gestationalWeek || 20,
      riskFactors: tc.profile?.riskFactors || {},
      followUpAnswers: tc.followUpAnswers || {},
      meta: { sourceRefs: [] },
    };

    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    const decision = buildDecision(events, caseState);
    const blockHomeCareFirst = decision.allowedGuidanceType !== 'SELF_CARE_AND_MONITOR';

    const pass = decision.riskLevel === tc.expectedRiskLevel;
    res.json({
      id: tc.id,
      status: pass ? 'PASS' : 'FAIL',
      expectedRiskLevel: tc.expectedRiskLevel,
      actualRiskLevel: decision.riskLevel,
      expectedAction: tc.expectedAction,
      actualAction: decision.recommendedAction,
      matchedRules: events.map((e) => e.params?.ruleName || e.type).filter(Boolean),
      blockHomeCareFirst,
      decision,
    });
  } catch (e) {
    res.status(500).json({ id: req.body?.id, status: 'FAIL', error: e.message });
  }
});

// POST /api/admin/triage-lab/run-all
router.post('/triage-lab/run-all', async (req, res) => {
  try {
    const cases = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
    const { runRules, buildDecision } = getTriageModules();
    const results = [];

    for (const tc of cases) {
      try {
        const dangerSignsChecked = tc.followUpAnswers?.dangerSignsChecked || [];
        const symptoms = Array.from(new Set([...(tc.confirmedSymptoms || []), ...dangerSignsChecked]));
        const caseState = {
          symptoms,
          dangerSignsChecked: dangerSignsChecked.length ? dangerSignsChecked : (tc.confirmedSymptoms || []),
          trimester: tc.profile?.trimester || 'second',
          gestationalWeek: tc.profile?.gestationalWeek || 20,
          riskFactors: tc.profile?.riskFactors || {},
          followUpAnswers: tc.followUpAnswers || {},
          meta: { sourceRefs: [] },
        };
        const runResult = await runRules(caseState);
        const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
        const decision = buildDecision(events, caseState);
        const pass = decision.riskLevel === tc.expectedRiskLevel;
        results.push({
          id: tc.id,
          status: pass ? 'PASS' : 'FAIL',
          expectedRiskLevel: tc.expectedRiskLevel,
          actualRiskLevel: decision.riskLevel,
          matchedRules: events.map((e) => e.params?.ruleName || e.type).filter(Boolean),
        });
      } catch (e) {
        results.push({ id: tc.id, status: 'FAIL', error: e.message });
      }
    }

    const passed = results.filter((r) => r.status === 'PASS').length;
    res.json({ results, passed, failed: results.length - passed, total: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// RULE DEBUGGER
// ─────────────────────────────────────────────

// POST /api/admin/rule-debugger/run
router.post('/rule-debugger/run', async (req, res) => {
  try {
    const { caseState } = req.body;
    const { runRules, buildDecision, selectFollowUpQuestions } = getTriageModules();

    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    const decision = buildDecision(events, caseState);
    const blockHomeCareFirst = decision.allowedGuidanceType !== 'SELF_CARE_AND_MONITOR';
    const followUpQuestions = selectFollowUpQuestions(caseState.symptoms || []);

    // Extract matched rules with details
    const matchedRules = events
      .filter((e) => e.type !== 'RISK_MODIFIER')
      .map((e) => ({
        name: e.params?.ruleName || e.type || 'unknown',
        priority: e.params?.priority,
        conditions: e.params?.conditions,
      }));

    const modifierEvents = events
      .filter((e) => e.type === 'RISK_MODIFIER')
      .map((e) => ({ type: e.params?.modifierName || 'modifier', score: e.params?.modifierScore || 0 }));

    res.json({ riskLevel: decision.riskLevel, action: decision.recommendedAction, allowedGuidanceType: decision.allowedGuidanceType, blockHomeCareFirst, matchedRules, modifierEvents, followUpQuestions, decision });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/rule-debugger/rules
router.get('/rule-debugger/rules', (req, res) => {
  try {
    const rulesDir = path.join(__dirname, '../triage/rules');
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.json'));
    const result = {};
    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(rulesDir, file), 'utf-8'));
      const rules = Array.isArray(content) ? content : (content?.rules || []);
      result[file.replace('.json', '')] = rules;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// CASE STATE PREVIEW
// ─────────────────────────────────────────────

// POST /api/admin/case-state/validate
router.post('/case-state/validate', (req, res) => {
  try {
    const { caseState } = req.body;
    const { validateCaseState } = getTriageModules();
    const result = validateCaseState(caseState);
    res.json(result);
  } catch (e) {
    res.status(500).json({ valid: false, errors: [e.message], warnings: [] });
  }
});

// ─────────────────────────────────────────────
// RAG PREVIEW
// ─────────────────────────────────────────────

// POST /api/admin/rag-preview/assemble
router.post('/rag-preview/assemble', async (req, res) => {
  try {
    const { decision, caseState } = req.body;
    const { assembleCareGuidanceContext, knowledgeCards, hybridRetriever } = getRagModules();
    const result = await assembleCareGuidanceContext({ decision, caseState, knowledgeCards, hybridRetriever });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/rag-preview/cards
router.get('/rag-preview/cards', (req, res) => {
  try {
    const cards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));
    res.json(cards);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// SAFETY TEST
// ─────────────────────────────────────────────

// POST /api/admin/safety-test/extract
router.post('/safety-test/extract', async (req, res) => {
  try {
    const { inputBn } = req.body;

    // Placeholder: replace with real LLM extraction when ai/ module is ready
    const extraction = {
      extractedSymptoms: [],
      dangerSigns: [],
      negations: [],
      confidence: 0,
      rawLLMResponse: '(LLM extraction service not yet implemented — wire backend/src/ai/extractionService.js)',
      note: 'Stub response. Implement extractionService.js to get real results.',
    };

    // Safety check on input text
    const violations = [];
    const warnings = [];

    const { FORBIDDEN_BANGLA_PATTERNS } = require('../safety');

    for (const kw of FORBIDDEN_BANGLA_PATTERNS) {
      if (inputBn.includes(kw)) {
        violations.push({ rule: 'SAFETY_VIOLATION', reason: `Input contains forbidden term: "${kw}"`, snippet: kw });
      }
    }

    if (inputBn.length < 5) {
      warnings.push({ rule: 'EXTRACTION_CONFIDENCE', reason: 'Input is very short; extraction confidence will be low.' });
    }

    res.json({ extraction, safety: { safe: violations.length === 0, violations, warnings } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/safety-test/validate-output
router.post('/safety-test/validate-output', (req, res) => {
  try {
    const { llmOutput } = req.body;
    const { validateLLMOutput, ALWAYS_BLOCKED_ADVICE } = require('../safety');

    // Create a permissive mock context so the sandbox doesn't strictly block step values
    const mockDecision = { riskLevel: llmOutput.riskLevel || 'MEDIUM' };
    const mockContext = {
      stepsNowBn: Array.isArray(llmOutput.stepsNowBn) ? llmOutput.stepsNowBn : [],
      blockedAdvice: ALWAYS_BLOCKED_ADVICE
    };

    const validation = validateLLMOutput(llmOutput, mockDecision, mockContext);

    const violations = validation.issues.map(issue => ({
      rule: 'SAFETY_VIOLATION',
      reason: issue
    }));

    res.json({ safe: validation.valid, violations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// AI EXPLANATION TESTER
// ─────────────────────────────────────────────

// POST /api/admin/ai-explanation/test
router.post('/ai-explanation/test', async (req, res) => {
  try {
    const { scenario, ragMode } = req.body;
    const { runRules, buildDecision } = getTriageModules();
    const { assembleCareGuidanceContext, knowledgeCards } = getRagModules();
    const { generateTriageExplanation } = require('../ai');

    // 1. Define scenario state
    let caseState = {};
    if (scenario === 'HIGH_RISK') {
      caseState = {
        symptoms: ['severe_abdominal_pain'],
        dangerSignsChecked: ['severe_abdominal_pain'],
        trimester: 'third',
        gestationalWeek: 32,
        meta: {}
      };
    } else if (scenario === 'MEDIUM_RISK') {
      caseState = {
        symptoms: ['fever', 'headache'],
        dangerSignsChecked: [],
        trimester: 'second',
        gestationalWeek: 20,
        meta: {}
      };
    } else {
      caseState = {
        symptoms: ['feeling_tired'],
        dangerSignsChecked: [],
        trimester: 'first',
        gestationalWeek: 10,
        meta: {}
      };
    }

    // 2. Run Pipeline
    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    const decision = buildDecision(events, caseState);
    const { hybridRetriever } = getRagModules();
    const careGuidanceContext = await assembleCareGuidanceContext({
      decision,
      caseState,
      knowledgeCards,
      hybridRetriever: (cfg) => hybridRetriever({ ...cfg, ragMode }),
    });

    // 3. Generate Explanation
    const aiResult = await generateTriageExplanation({ decision, careGuidanceContext, caseState });

    res.json({
      caseState,
      decision,
      careGuidanceContext,
      aiResult,
      // Add vector RAG debug info to response
      vectorRagDebug: {
        ragMode: careGuidanceContext.ragMode,
        vectorAttempted: careGuidanceContext.vectorAttempted,
        vectorSkippedReason: careGuidanceContext.vectorSkippedReason,
        vectorChunksCount: careGuidanceContext.vectorChunks?.length || 0,
        vectorFallbackUsed: careGuidanceContext.vectorFallbackUsed,
        vectorChunks: careGuidanceContext.vectorChunks,
        retrievalWarnings: careGuidanceContext.retrievalWarnings,
        vectorQueryText: careGuidanceContext.vectorQueryText,
        filtersApplied: careGuidanceContext.filtersApplied,
        rejectedChunksCount: careGuidanceContext.rejectedChunksCount,
        rejectedChunksPreview: careGuidanceContext.rejectedChunksPreview,
        embeddingProvider: careGuidanceContext.embeddingProvider,
        embeddingModel: careGuidanceContext.embeddingModel,
        vectorIndexName: careGuidanceContext.vectorIndexName,
        vectorCollectionName: careGuidanceContext.vectorCollectionName,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// VECTOR RAG PREVIEW
// ─────────────────────────────────────────────

// POST /api/admin/vector-rag/preview - Debug Vector RAG retrieval
router.post('/vector-rag/preview', async (req, res) => {
  try {
    const { riskLevel, symptoms, evidenceTags, allowedGuidanceType, topK = 5 } = req.body;
    
    // Import vector retriever
    const { retrieveRuleAware } = require('../vectorRag/retrieval/ruleAwareVectorRetriever');
    const EmbeddingClient = require('../vectorRag/providers/embeddingClient');
    const VectorKnowledgeChunk = require('../models/VectorKnowledgeChunk');
    
    // Build mock decision
    const decision = {
      riskLevel: riskLevel || 'MEDIUM',
      allowedGuidanceType: allowedGuidanceType || 'SELF_CARE_AND_MONITOR',
      evidenceTags: evidenceTags || []
    };
    
    // Build mock case state
    const caseState = {
      symptoms: symptoms || [],
      meta: {}
    };
    
    try {
      // Try to retrieve with vector RAG
      const embeddingClient = new EmbeddingClient();
      const result = await retrieveRuleAware({
        decision,
        caseState,
        embeddingClient,
        VectorKnowledgeChunk,
        topK
      });
      
      res.json({
        ok: true,
        mode: result.mode,
        queryText: result.queryText,
        filtersApplied: result.filtersApplied,
        retrievedChunks: result.retrievedChunks?.map(chunk => ({
          sourceId: chunk.sourceId,
          sourceTitle: chunk.sourceTitle,
          sourceKind: chunk.sourceKind,
          content: chunk.content?.substring(0, 200) + '...',
          fullContent: chunk.content,
          evidenceTags: chunk.evidenceTags,
          guidanceTypes: chunk.guidanceTypes,
          audience: chunk.audience,
          priority: chunk.priority,
          relevanceScore: chunk.relevanceScore,
          similarityScore: chunk.similarityScore
        })) || [],
        rejectedChunks: result.rejectedChunks?.map(c => ({
          sourceId: c.sourceId,
          sourceTitle: c.sourceTitle,
          reason: c.rejectionReason,
          content: c.content?.substring(0, 100) + '...'
        })) || [],
        fallbackRecommended: result.fallbackRecommended,
        warnings: result.warnings || []
      });
    } catch (vectorError) {
      // Vector retrieval failed, but return graceful response
      res.json({
        ok: false,
        mode: 'error',
        queryText: null,
        filtersApplied: null,
        retrievedChunks: [],
        rejectedChunks: [],
        fallbackRecommended: true,
        warnings: [
          `Vector retrieval failed: ${vectorError.message}`,
          'Recommend using JSON RAG for this query'
        ],
        error: vectorError.message
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
