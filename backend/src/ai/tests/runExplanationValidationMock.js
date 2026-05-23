const { validateExplanationOutput } = require('../schemas/explanationSchema');
const { validateLLMOutput, REQUIRED_DISCLAIMER_BN, ALWAYS_BLOCKED_ADVICE } = require('../../safety');

console.log('--- MatriSense AI Explanation Validation Mock Test ---\n');

const decision = {
  riskLevel: 'HIGH',
  allowedGuidanceType: 'URGENT_ESCALATION'
};

const careGuidanceContext = {
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান', 'যাওয়ার পথে কাউকে সাথে নিন'],
  monitorBn: [],
  urgentWarningBn: ['তীব্র রক্তপাত', 'জ্বর'],
  sources: ['Source A'],
  blockedAdvice: ALWAYS_BLOCKED_ADVICE
};

console.log('[Context] Risk Level:', decision.riskLevel);
console.log('[Context] Allowed Steps:', careGuidanceContext.stepsNowBn, '\n');

// 1. Valid Output
const validOutput = {
  riskLevel: 'HIGH',
  motherExplanationBn: 'আপনার লক্ষণগুলো ঝুঁকিপূর্ণ।',
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান'],
  monitorBn: [],
  urgentWarningBn: ['তীব্র রক্তপাত'],
  healthWorkerSummaryBn: 'Patient presents with high risk signs.',
  safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
};

// 2. Unsafe Medicine Output
const unsafeMedicineOutput = {
  ...validOutput,
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান', 'এই ওষুধ খান']
};

// 3. Unsafe Downgrade Output
const unsafeDowngradeOutput = {
  ...validOutput,
  riskLevel: 'LOW'
};

const runTest = (name, mockOutput, shouldBeValid) => {
  console.log(`--- Test: ${name} ---`);
  
  // Phase 1: JS Schema Validation
  const schemaValidation = validateExplanationOutput(mockOutput);
  if (!schemaValidation.valid) {
    if (!shouldBeValid) {
      console.log('✅ PASS (Caught by Schema Validation)');
    } else {
      console.log('❌ FAIL (Schema Validation blocked valid output)');
      console.log('Issues:', schemaValidation.issues);
    }
    console.log('\n=======================================\n');
    return;
  }

  // Phase 2: Medical Safety Validation
  const safetyValidation = validateLLMOutput(schemaValidation.data, decision, careGuidanceContext);
  
  if (safetyValidation.valid === shouldBeValid) {
    console.log(`✅ PASS (${shouldBeValid ? 'Successfully validated' : 'Successfully caught unsafe output and returned fallback'})`);
  } else {
    console.log(`❌ FAIL (Expected valid=${shouldBeValid}, got valid=${safetyValidation.valid})`);
    if (!safetyValidation.valid) console.log('Issues:', safetyValidation.issues);
  }
  console.log('\n=======================================\n');
};

runTest('1. Valid Output', validOutput, true);
runTest('2. Unsafe Medicine Advice', unsafeMedicineOutput, false);
runTest('3. Unsafe Risk Downgrade', unsafeDowngradeOutput, false);
