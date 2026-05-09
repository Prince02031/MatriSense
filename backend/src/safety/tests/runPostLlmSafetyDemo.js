const { 
  validateLLMOutput, 
  REQUIRED_DISCLAIMER_BN, 
  ALWAYS_BLOCKED_ADVICE 
} = require('../index');

console.log('--- MatriSense Post-LLM Safety Validator Demo ---\n');

const decision = {
  riskLevel: 'HIGH',
  allowedGuidanceType: 'URGENT_ESCALATION'
};

const careGuidanceContext = {
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান'],
  monitorBn: [],
  urgentWarningBn: ['রক্তপাত', 'জ্বর'],
  sources: ['Source A'],
  blockedAdvice: ALWAYS_BLOCKED_ADVICE
};

console.log('[Context] Decision Risk Level:', decision.riskLevel);
console.log('[Context] Allowed Steps:', careGuidanceContext.stepsNowBn, '\n');

// 1. validOutput
const validOutput = {
  riskLevel: 'HIGH',
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান'],
  urgentWarningBn: ['রক্তপাত বা জ্বর হলে দ্রুত জানাবেন।'],
  safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
};

console.log('--- Test 1: Valid Output ---');
console.log('LLM Output:', JSON.stringify(validOutput, null, 2));
const result1 = validateLLMOutput(validOutput, decision, careGuidanceContext);
console.log('Validation Result:', JSON.stringify(result1, null, 2));
if (result1.valid) {
  console.log('✅ Passed Test 1');
} else {
  console.log('❌ Failed Test 1');
}
console.log('\n=======================================\n');

// 2. unsafeMedicineOutput
const unsafeMedicineOutput = {
  riskLevel: 'HIGH',
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান', 'এই ওষুধ খান'],
  urgentWarningBn: ['রক্তপাত বা জ্বর হলে দ্রুত জানাবেন।'],
  safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
};

console.log('--- Test 2: Unsafe Medicine Output ---');
console.log('LLM Output:', JSON.stringify(unsafeMedicineOutput, null, 2));
const result2 = validateLLMOutput(unsafeMedicineOutput, decision, careGuidanceContext);
console.log('Validation Result:', JSON.stringify(result2, null, 2));
if (!result2.valid && result2.issues.length > 0) {
  console.log('✅ Passed Test 2 (Successfully caught unsafe output and returned fallback)');
} else {
  console.log('❌ Failed Test 2');
}
console.log('\n=======================================\n');

// 3. unsafeDowngradeOutput
const unsafeDowngradeOutput = {
  riskLevel: 'LOW', // downgraded from HIGH
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান'],
  urgentWarningBn: ['রক্তপাত বা জ্বর হলে দ্রুত জানাবেন।'],
  safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
};

console.log('--- Test 3: Unsafe Risk Downgrade Output ---');
console.log('LLM Output:', JSON.stringify(unsafeDowngradeOutput, null, 2));
const result3 = validateLLMOutput(unsafeDowngradeOutput, decision, careGuidanceContext);
console.log('Validation Result:', JSON.stringify(result3, null, 2));
if (!result3.valid && result3.issues.length > 0) {
  console.log('✅ Passed Test 3 (Successfully caught downgrade and returned fallback)');
} else {
  console.log('❌ Failed Test 3');
}
console.log('\n=======================================\n');
