require('dotenv').config();
const path = require('path');
const fs = require('fs');

const { runRules } = require('../triage/engine/ruleRunner');
const { buildDecision } = require('../triage/decision/decisionBuilder');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');
const { validatePreGeneration } = require('../safety');
const { generateTriageExplanation } = require('../ai');

const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

const runPipeline = async () => {
  console.log('--- Running MatriSense Full Pipeline Test ---\n');

  // 1. Mock case state (e.g. HIGH risk scenario)
  const caseState = {
    symptoms: ['severe_abdominal_pain'],
    dangerSignsChecked: ['severe_abdominal_pain'],
    trimester: 'third',
    gestationalWeek: 32,
    riskFactors: {},
    followUpAnswers: {},
    meta: { sourceRefs: [] }
  };
  
  console.log('[1] Initial Case State:');
  console.log(JSON.stringify(caseState, null, 2));

  try {
    // 2. Rule Runner
    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);

    // 3. Decision Builder
    const decision = buildDecision(events, caseState);
    
    // 4. Care Guidance Assembler (which internally calls Evidence Retriever)
    const careGuidanceContext = assembleCareGuidanceContext({ decision, caseState, knowledgeCards });
    
    // 5. Validate Pre-Generation
    const preGenerationSafety = validatePreGeneration(decision, careGuidanceContext);

    // 6. Optional LLM Generation
    let aiExplanation = null;
    const shouldRunLlm = process.env.RUN_LLM === 'true';
    
    if (shouldRunLlm && preGenerationSafety.valid) {
      if (!process.env.GEMINI_API_KEY) {
        console.log('\n⚠️  LLM generation requested but GEMINI_API_KEY is missing. Skipping.');
      } else {
        console.log('\n[Phase] Calling generateTriageExplanation (Live API)...');
        aiExplanation = await generateTriageExplanation({ decision, careGuidanceContext, caseState });
      }
    }

    // Final Output formatting
    const finalOutput = {
      decision,
      retrievedCards: careGuidanceContext.retrievedCards.map(c => c.id || c.name || c.guidanceType), // mapped for succinctness
      careGuidanceContext: {
        stepsNowBn: careGuidanceContext.stepsNowBn,
        monitorBn: careGuidanceContext.monitorBn,
        urgentWarningBn: careGuidanceContext.urgentWarningBn,
        sources: careGuidanceContext.sources,
        blockedAdvice: careGuidanceContext.blockedAdvice
      },
      preGenerationSafety: {
        valid: preGenerationSafety.valid,
        issues: preGenerationSafety.issues
      },
      aiExplanation: aiExplanation ? {
        valid: aiExplanation.safetyValidation.valid,
        issues: aiExplanation.safetyValidation.issues,
        motherExplanationBn: aiExplanation.safeOutput.motherExplanationBn,
        healthWorkerSummaryBn: aiExplanation.safeOutput.healthWorkerSummaryBn,
        provider: aiExplanation.provider,
        model: aiExplanation.model
      } : 'SKIPPED'
    };

    console.log('\n[2] Pipeline Output:');
    console.log(JSON.stringify(finalOutput, null, 2));

    if (!preGenerationSafety.valid) {
      console.log('\n❌ Pre-Generation Safety Issues Found:');
      preGenerationSafety.issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ Pipeline PASSED');
      process.exit(0);
    }

  } catch (error) {
    console.error('Pipeline Error:', error);
    process.exit(1);
  }
};

runPipeline();
