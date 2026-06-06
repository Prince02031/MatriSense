require('dotenv').config();
const path = require('path');
const fs = require('fs');

const { runRules } = require('../triage/engine/ruleRunner');
const { buildDecision } = require('../triage/decision/decisionBuilder');
const { assembleCareGuidanceContext } = require('../rag/careGuidanceAssembler');

const knowledgeCardsPath = path.join(__dirname, '../rag/knowledgeCards.json');
const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

async function testScenario(name, symptoms, trimester = 'second', gestationalWeek = 20) {
  console.log(`\n=========================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Symptoms: [${symptoms.join(', ')}]`);
  console.log(`=========================================`);

  const caseState = {
    symptoms,
    dangerSignsChecked: symptoms,
    trimester,
    gestationalWeek,
    riskFactors: {},
    followUpAnswers: {},
    meta: { sourceRefs: [] }
  };

  try {
    const runResult = await runRules(caseState);
    const events = Array.isArray(runResult) ? runResult : (runResult?.events || []);
    const decision = buildDecision(events, caseState);
    const careGuidanceContext = await assembleCareGuidanceContext({ decision, caseState, knowledgeCards });

    console.log(`Risk Level: ${decision.riskLevel}`);
    console.log(`Recommended Action: ${decision.recommendedAction}`);
    console.log(`Evidence Tags: ${JSON.stringify(decision.evidenceTags)}`);
    console.log(`Sources: ${JSON.stringify(careGuidanceContext.sources)}`);
    console.log(`Blocked Advice: ${JSON.stringify(careGuidanceContext.blockedAdvice)}`);
    console.log(`Steps Now (Bangla):`);
    if (careGuidanceContext.stepsNowBn?.length) {
      careGuidanceContext.stepsNowBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    } else {
      console.log('  (None)');
    }
    console.log(`Monitor (Bangla):`);
    if (careGuidanceContext.monitorBn?.length) {
      careGuidanceContext.monitorBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    } else {
      console.log('  (None)');
    }
    console.log(`Urgent Warning (Bangla):`);
    if (careGuidanceContext.urgentWarningBn?.length) {
      careGuidanceContext.urgentWarningBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    } else {
      console.log('  (None)');
    }
  } catch (error) {
    console.error(`Error in scenario ${name}:`, error);
  }
}

async function runAll() {
  await testScenario('1. High Risk (Severe Abdominal Pain)', ['severe_abdominal_pain'], 'third', 32);
  await testScenario('2. Medium Risk (Headache Only)', ['headache'], 'second', 20);
  await testScenario('3. Low Risk (Mild Nausea Only)', ['nausea'], 'first', 8);
}

runAll();
