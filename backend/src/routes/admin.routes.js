const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

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
  return { assembleCareGuidanceContext, knowledgeCards };
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
router.post('/rag-preview/assemble', (req, res) => {
  try {
    const { decision, caseState } = req.body;
    const { assembleCareGuidanceContext, knowledgeCards } = getRagModules();
    const result = assembleCareGuidanceContext({ decision, caseState, knowledgeCards });
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

    // Safety check on input text (basic keyword scan until safetyValidator.js is implemented)
    const violations = [];
    const warnings = [];

    const diagnosisKeywords = ['প্রি-এক্লাম্পসিয়া', 'এক্লাম্পসিয়া', 'গর্ভপাত', 'ক্যান্সার'];
    const medicineKeywords = ['প্যারাসিটামল', 'আইবুপ্রোফেন', 'ওষুধ খান', 'ট্যাবলেট'];

    for (const kw of diagnosisKeywords) {
      if (inputBn.includes(kw)) {
        violations.push({ rule: 'NO_DIAGNOSIS', reason: `Input contains diagnosis term: "${kw}"`, snippet: kw });
      }
    }
    for (const kw of medicineKeywords) {
      if (inputBn.includes(kw)) {
        violations.push({ rule: 'NO_MEDICINE_ADVICE', reason: `Input requests medicine: "${kw}"`, snippet: kw });
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
    const violations = [];

    // Basic structural safety checks on LLM JSON output
    const forbidden = ['diagnose', 'diagnosis', 'medicine', 'drug', 'tablet', 'mg', 'dose'];
    const outputStr = JSON.stringify(llmOutput).toLowerCase();

    for (const term of forbidden) {
      if (outputStr.includes(term)) {
        violations.push({ rule: 'NO_MEDICINE_ADVICE', reason: `Output contains forbidden term: "${term}"` });
      }
    }

    if (!llmOutput.symptoms && !llmOutput.dangerSigns) {
      violations.push({ rule: 'MISSING_REQUIRED_FIELDS', reason: 'LLM output must include "symptoms" and "dangerSigns" arrays.' });
    }

    res.json({ safe: violations.length === 0, violations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
