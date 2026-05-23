const { 
  validatePreGeneration, 
  validateLLMOutput, 
  getSafeFallback, 
  REQUIRED_DISCLAIMER_BN, 
  ALWAYS_BLOCKED_ADVICE 
} = require('../index');

let passed = 0;
let failed = 0;

function runTest(name, expectedPass, result) {
  const passedTest = result.valid === expectedPass;
  if (passedTest) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Expected valid=${expectedPass}, but got valid=${result.valid}`);
    if (result.issues && result.issues.length) {
      console.log(`   Issues: ${result.issues.join(', ')}`);
    }
    failed++;
  }
}

// Basic mocks
const validContextHigh = {
  sources: ['Source A'],
  blockedAdvice: ALWAYS_BLOCKED_ADVICE,
  stepsNowBn: ['অবিলম্বে হাসপাতালে যান']
};

const validDecisionHigh = {
  riskLevel: 'HIGH',
  allowedGuidanceType: 'URGENT_ESCALATION'
};

const validContextLow = {
  sources: ['Source B'],
  blockedAdvice: ALWAYS_BLOCKED_ADVICE,
  stepsNowBn: ['পর্যাপ্ত বিশ্রাম নিন।']
};

const validDecisionLow = {
  riskLevel: 'LOW',
  allowedGuidanceType: 'SELF_CARE_AND_MONITOR'
};

console.log('--- Running MatriSense Safety Tests ---\n');

// 1. HIGH risk with urgent guidance and source = PASS
runTest(
  '1. HIGH risk with urgent guidance and source',
  true,
  validatePreGeneration(validDecisionHigh, validContextHigh)
);

// 2. HIGH risk with "শুধু বাসায় থাকুন" = FAIL
runTest(
  '2. HIGH risk with "শুধু বাসায় থাকুন"',
  false,
  validatePreGeneration(validDecisionHigh, {
    ...validContextHigh,
    stepsNowBn: ['শুধু বাসায় থাকুন', 'অবিলম্বে হাসপাতালে যান']
  })
);

// 3. Output containing "এই ওষুধ খান" = FAIL
runTest(
  '3. Output containing "এই ওষুধ খান"',
  false,
  validateLLMOutput(
    {
      riskLevel: 'HIGH',
      stepsNowBn: ['এই ওষুধ খান'],
      safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
    },
    validDecisionHigh,
    validContextHigh
  )
);

// 4. Output containing "আপনার রোগ হলো" = FAIL
runTest(
  '4. Output containing "আপনার রোগ হলো"',
  false,
  validateLLMOutput(
    {
      riskLevel: 'HIGH',
      stepsNowBn: ['আপনার রোগ হলো এক্লাম্পসিয়া'],
      safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
    },
    validDecisionHigh,
    validContextHigh
  )
);

// 5. LOW risk output without urgentWarningBn = FAIL
runTest(
  '5. LOW risk output without urgentWarningBn',
  false,
  validateLLMOutput(
    {
      riskLevel: 'LOW',
      stepsNowBn: ['পর্যাপ্ত বিশ্রাম নিন।'],
      urgentWarningBn: '',
      safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
    },
    validDecisionLow,
    validContextLow
  )
);

// 6. Output missing safety disclaimer = FAIL
runTest(
  '6. Output missing safety disclaimer',
  false,
  validateLLMOutput(
    {
      riskLevel: 'LOW',
      stepsNowBn: ['পর্যাপ্ত বিশ্রাম নিন।'],
      urgentWarningBn: 'কোনো সমস্যা হলে ডাক্তার দেখান',
      safetyDisclaimerBn: 'Some random text'
    },
    validDecisionLow,
    validContextLow
  )
);

// 7. LLM output riskLevel LOW while decision riskLevel HIGH = FAIL
runTest(
  '7. LLM output riskLevel LOW while decision riskLevel HIGH',
  false,
  validateLLMOutput(
    {
      riskLevel: 'LOW',
      stepsNowBn: ['অবিলম্বে হাসপাতালে যান'],
      safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
    },
    validDecisionHigh,
    validContextHigh
  )
);

// 8. careGuidanceContext without sources = FAIL pre-generation
runTest(
  '8. careGuidanceContext without sources',
  false,
  validatePreGeneration(validDecisionHigh, {
    ...validContextHigh,
    sources: []
  })
);

// 9. HIGH risk careGuidanceContext with self-care card/id/type = FAIL
runTest(
  '9. HIGH risk careGuidanceContext with self-care allowed guidance type',
  false,
  validatePreGeneration({ ...validDecisionHigh, allowedGuidanceType: 'SELF_CARE_AND_MONITOR' }, validContextHigh)
);

// 10. Valid LOW output with warning signs and disclaimer = PASS
runTest(
  '10. Valid LOW output with warning signs and disclaimer',
  true,
  validateLLMOutput(
    {
      riskLevel: 'LOW',
      stepsNowBn: ['পর্যাপ্ত বিশ্রাম নিন'],
      urgentWarningBn: ['তীব্র পেট ব্যথা হলে দ্রুত যোগাযোগ করুন'],
      safetyDisclaimerBn: REQUIRED_DISCLAIMER_BN
    },
    validDecisionLow,
    validContextLow
  )
);

console.log(`\nTotal Passed: ${passed}`);
console.log(`Total Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
