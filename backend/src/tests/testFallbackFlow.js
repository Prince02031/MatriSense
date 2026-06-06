const { fallbackTemplates } = require('../safety/fallbackTemplates');

console.log('================================================================');
console.log('MATRISENSE LOCAL FALLBACK TEMPLATE TEST (For API Quota Exceeded)');
console.log('================================================================\n');

for (const [level, template] of Object.entries(fallbackTemplates)) {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`RISK LEVEL: ${level}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Empathetic Explanation (motherExplanationBn):`);
  console.log(`  "${template.motherExplanationBn}"`);
  console.log(`Immediate Steps (stepsNowBn):`);
  template.stepsNowBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log(`Monitoring Advice (monitorBn):`);
  template.monitorBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log(`Urgent Warning (urgentWarningBn):`);
  template.urgentWarningBn.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
  console.log(`Disclaimer (safetyDisclaimerBn):`);
  console.log(`  "${template.safetyDisclaimerBn}"`);
}

console.log('\n================================================================');
console.log('Care Assistant Intent Fallbacks Preview:');
console.log('================================================================');
const { getFallbackByIntent } = require('../careAssistant/careAssistantIntentFallbacks');
const { INTENT_TYPES } = require('../careAssistant/careAssistantIntentClassifier');

const sampleIntents = [
  { intent: INTENT_TYPES.NEXT_STEPS, label: 'Next Steps (এখন কী করবো?)' },
  { intent: INTENT_TYPES.MEDICINE_REQUEST, label: 'Medicine Request (ওষুধের নাম বলুন)' },
  { intent: INTENT_TYPES.EMOTIONAL_SUPPORT, label: 'Emotional Support (ভয় লাগছে)' }
];

for (const item of sampleIntents) {
  console.log(`\nIntent: ${item.label}`);
  ['LOW', 'MEDIUM', 'HIGH'].forEach(risk => {
    const fallback = getFallbackByIntent(item.intent, risk);
    console.log(`  [Risk: ${risk}] replyBn: "${fallback.replyBn.replace(/\n/g, ' ')}"`);
  });
}
