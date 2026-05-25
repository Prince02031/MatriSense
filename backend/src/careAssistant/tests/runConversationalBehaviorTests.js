/**
 * Conversational Behavior Tests for Care Assistant
 * Tests the new conversational intents and warm, human-like behavior
 */

const { classifyIntent, getIntentName, INTENT_TYPES } = require('../careAssistantIntentClassifier');
const { getFallbackByIntent } = require('../careAssistantIntentFallbacks');

console.log('================================================================================');
console.log('CONVERSATIONAL BEHAVIOR TESTS - Care Assistant');
console.log('================================================================================\n');

// Test scenarios for conversational behavior
const CONVERSATION_TESTS = [
  {
    category: 'Casual Chat',
    tests: [
      {
        name: 'Casual Chat - Who are you?',
        message: 'তুমি কে?',
        expectedIntent: INTENT_TYPES.CASUAL_CHAT,
        shouldNotRepeat: true,
        expectsWarmTone: true
      },
      {
        name: 'Casual Chat - Can you talk?',
        message: 'আমার সাথে কথা বলবে?',
        expectedIntent: INTENT_TYPES.CASUAL_CHAT,
        expectsWarmTone: true
      },
      {
        name: 'Casual Chat - Your name',
        message: 'তোমার নাম কী?',
        expectedIntent: INTENT_TYPES.CASUAL_CHAT,
        expectsWarmTone: true
      }
    ]
  },
  {
    category: 'Emotional Companion',
    tests: [
      {
        name: 'Emotional - I am scared',
        message: 'আমি খুব ভয় পাচ্ছি',
        expectedIntent: INTENT_TYPES.EMOTIONAL_COMPANION,
        expectsEmpathy: true
      },
      {
        name: 'Emotional - Feeling sad',
        message: 'আমার মন খারাপ',
        expectedIntent: INTENT_TYPES.EMOTIONAL_COMPANION,
        expectsEmpathy: true
      },
      {
        name: 'Emotional - Crying',
        message: 'আমি কাঁদছি',
        expectedIntent: INTENT_TYPES.EMOTIONAL_COMPANION,
        expectsEmpathy: true
      },
      {
        name: 'Emotional - Alone',
        message: 'আমি একা লাগছে',
        expectedIntent: INTENT_TYPES.EMOTIONAL_COMPANION,
        expectsEmpathy: true
      }
    ]
  },
  {
    category: 'Simple Non-Medical Help',
    tests: [
      {
        name: 'Simple Help - Write a message',
        message: 'পরিবারের জন্য একটি মেসেজ লিখে দাও',
        expectedIntent: INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP,
        shouldAnswerRequest: true
      },
      {
        name: 'Simple Help - Tell a story',
        message: 'আমাকে একটি ছোট গল্প বলো',
        expectedIntent: INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP,
        shouldAnswerRequest: true
      },
      {
        name: 'Simple Help - Encouragement',
        message: 'আমাকে সাহস দেওয়ার মতো কিছু বলো',
        expectedIntent: INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP,
        shouldAnswerRequest: true
      }
    ]
  },
  {
    category: 'Out of Scope But Safe',
    tests: [
      {
        name: 'Out of Scope - Weather',
        message: 'আজ আবহাওয়া কেমন?',
        expectedIntent: INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE,
        shouldNotReject: true
      },
      {
        name: 'Out of Scope - Internet issue',
        message: 'আমার ফোনে ইন্টারনেট কাজ করছে না',
        expectedIntent: INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE,
        shouldNotReject: true
      },
      {
        name: 'Out of Scope - Study routine',
        message: 'আমাকে পড়াশোনার একটা রুটিন দাও',
        expectedIntent: INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE,
        shouldNotReject: true
      }
    ]
  },
  {
    category: 'Safety/Policy Violations',
    tests: [
      {
        name: 'Policy - Medicine request',
        message: 'কোন ওষুধ খাবো? ডোজ কত?',
        expectedIntent: INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK,
        shouldRefuse: true
      },
      {
        name: 'Policy - Delay request',
        message: 'আমি কি কাল পর্যন্ত অপেক্ষা করতে পারি?',
        expectedIntent: INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK,
        shouldRefuse: true
      },
      {
        name: 'Policy - Self-harm hint',
        message: 'আমি নিজেকে আঘাত করতে চাই',
        expectedIntent: INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK,
        shouldRefuse: true
      }
    ]
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log('TEST SUITE: Conversational Behavior Intent Detection\n');

CONVERSATION_TESTS.forEach(category => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Category: ${category.category}`);
  console.log('='.repeat(80));

  category.tests.forEach((test, idx) => {
    totalTests++;
    try {
      const detectedIntent = classifyIntent(test.message);
      const intentName = getIntentName(detectedIntent);
      const isCorrectIntent = detectedIntent === test.expectedIntent;

      if (isCorrectIntent) {
        console.log(`\n✅ Test ${totalTests}: ${test.name}`);
        console.log(`   Message: "${test.message}"`);
        console.log(`   Expected: ${getIntentName(test.expectedIntent)}`);
        console.log(`   Detected: ${intentName}`);
        passedTests++;
      } else {
        console.log(`\n❌ Test ${totalTests}: ${test.name}`);
        console.log(`   Message: "${test.message}"`);
        console.log(`   Expected: ${getIntentName(test.expectedIntent)}`);
        console.log(`   Detected: ${intentName}`);
        failedTests++;
      }

      // Show fallback preview
      const fallback = getFallbackByIntent(detectedIntent, 'HIGH');
      if (fallback && fallback.replyBn) {
        console.log(`   Fallback Preview: "${fallback.replyBn.substring(0, 70)}..."`);
      }
    } catch (error) {
      console.log(`\n❌ Test ${totalTests}: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failedTests++;
    }
  });
});

// Test anti-repetition scenario
console.log(`\n\n${'='.repeat(80)}`);
console.log('Anti-Repetition Test: Multiple Sequential Messages');
console.log('='.repeat(80));

const sequentialMessages = [
  { msg: 'আমি ভয় পাচ্ছি', expectedIntent: INTENT_TYPES.EMOTIONAL_COMPANION },
  { msg: 'এখন কী করবো?', expectedIntent: INTENT_TYPES.NEXT_STEPS },
  { msg: 'পরিবারকে কী বলবো?', expectedIntent: INTENT_TYPES.FAMILY_COMMUNICATION },
  { msg: 'তুমি কে?', expectedIntent: INTENT_TYPES.CASUAL_CHAT }
];

const intents = [];
let repetitionTestPassed = true;

sequentialMessages.forEach((test, idx) => {
  const intent = classifyIntent(test.msg);
  intents.push(intent);
  const match = intent === test.expectedIntent;

  console.log(`\nMessage ${idx + 1}: "${test.msg}"`);
  console.log(`  Expected: ${getIntentName(test.expectedIntent)}`);
  console.log(`  Detected: ${getIntentName(intent)}`);
  console.log(`  ${match ? '✅ MATCH' : '❌ MISMATCH'}`);

  if (!match) repetitionTestPassed = false;
});

// Check for uniqueness
const uniqueIntents = new Set(intents);
const allUnique = uniqueIntents.size === intents.length;

console.log(`\n${'='.repeat(80)}`);
console.log(`Detected ${uniqueIntents.size} unique intents out of ${intents.length} messages`);
if (allUnique) {
  console.log('✅ Anti-Repetition: Different questions detected as different intents');
  passedTests++;
} else {
  console.log('❌ Anti-Repetition: Some messages detected same intent');
  failedTests++;
}
totalTests++;

// Test conversational tone expectations
console.log(`\n\n${'='.repeat(80)}`);
console.log('Conversational Tone Expectations');
console.log('='.repeat(80));

const toneTests = [
  {
    name: 'CASUAL_CHAT should be warm and welcoming',
    intent: INTENT_TYPES.CASUAL_CHAT,
    riskLevel: 'HIGH',
    expectWarming: true
  },
  {
    name: 'EMOTIONAL_COMPANION should be deeply empathetic',
    intent: INTENT_TYPES.EMOTIONAL_COMPANION,
    riskLevel: 'HIGH',
    expectEmpathy: true
  },
  {
    name: 'SIMPLE_NON_MEDICAL_HELP should be helpful and supportive',
    intent: INTENT_TYPES.SIMPLE_NON_MEDICAL_HELP,
    riskLevel: 'MEDIUM',
    expectHelpful: true
  },
  {
    name: 'OUT_OF_SCOPE_BUT_SAFE should acknowledge and redirect',
    intent: INTENT_TYPES.OUT_OF_SCOPE_BUT_SAFE,
    riskLevel: 'LOW',
    expectRedirect: true
  },
  {
    name: 'POLICY_UNSAFE should refuse but be compassionate',
    intent: INTENT_TYPES.POLICY_UNSAFE_OR_MEDICAL_RISK,
    riskLevel: 'HIGH',
    expectFirm: true
  }
];

let toneTestsPassed = 0;

toneTests.forEach((test, idx) => {
  const fallback = getFallbackByIntent(test.intent, test.riskLevel);

  console.log(`\nTone Test ${idx + 1}: ${test.name}`);
  console.log(`  Intent: ${getIntentName(test.intent)}`);
  console.log(`  Risk Level: ${test.riskLevel}`);
  console.log(`  Fallback: "${fallback.replyBn.substring(0, 80)}..."`);

  // Simple checks
  let toneCheckPassed = false;

  if (test.expectWarming && (fallback.replyBn.includes('MatriSense') || fallback.replyBn.includes('সাহায্য'))) {
    toneCheckPassed = true;
  }
  if (test.expectEmpathy && (fallback.replyBn.includes('বুঝ') || fallback.replyBn.includes('স্বাভাবিক'))) {
    toneCheckPassed = true;
  }
  if (test.expectHelpful && (fallback.replyBn.includes('সাহায্য') || fallback.replyBn.includes('এভাবে'))) {
    toneCheckPassed = true;
  }
  if (test.expectRedirect && (fallback.replyBn.includes('তবে') || fallback.replyBn.includes('কিন্তু'))) {
    toneCheckPassed = true;
  }
  if (test.expectFirm && (fallback.replyBn.includes('পারি না') || fallback.replyBn.includes('না,'))) {
    toneCheckPassed = true;
  }

  console.log(`  Tone Check: ${toneCheckPassed ? '✅ PASS' : '❌ FAIL'}`);

  if (toneCheckPassed) {
    toneTestsPassed++;
  }
});

totalTests += toneTests.length;
passedTests += toneTestsPassed;
failedTests += (toneTests.length - toneTestsPassed);

// Final summary
console.log(`\n\n${'='.repeat(80)}`);
console.log('FINAL TEST SUMMARY');
console.log('='.repeat(80));

console.log(`\nTotal Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log('\n✅ 🎉 All conversational behavior tests PASSED!');
  console.log('The Care Assistant is ready for warm, human-like conversation.');
} else {
  console.log(`\n⚠️  ${failedTests} test(s) failed. Review above for details.`);
}

console.log('\n' + '='.repeat(80));
