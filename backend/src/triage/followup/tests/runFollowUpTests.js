const { selectFollowUpQuestions } = require('../followUpSelector');
const { normalizeFollowUpAnswers } = require('../answerNormalizer');

/**
 * Tests for Follow-up Selection and Answer Normalization
 */

function runTests() {
  console.log('--- Running Follow-Up and Normalization Tests ---');

  // Test 1: Selection for headache
  const s1 = selectFollowUpQuestions({ 
    extraction: { detectedSymptoms: ['headache'] } 
  });
  const s1Ids = s1.questions.map(q => q.id);
  if (s1Ids.includes('blurred_vision') && s1Ids.includes('swelling')) {
    console.log('✅ TEST 1 PASSED: Correctly selected follow-ups for headache.');
  } else {
    console.log('❌ TEST 1 FAILED:', s1Ids);
  }

  // Test 2: Third trimester logic
  const s2 = selectFollowUpQuestions({
    extraction: { detectedSymptoms: ['fever'] },
    patientProfile: { trimester: 'third' }
  });
  const s2Ids = s2.questions.map(q => q.id);
  if (s2Ids.includes('reduced_fetal_movement')) {
    console.log('✅ TEST 2 PASSED: Correctly added third trimester fetal movement check.');
  } else {
    console.log('❌ TEST 2 FAILED');
  }

  // Test 3: Max questions limit
  const s3 = selectFollowUpQuestions({
    extraction: { detectedSymptoms: ['headache', 'fever', 'abdominal_pain'] },
    maxQuestions: 3
  });
  if (s3.questions.length === 3) {
    console.log('✅ TEST 3 PASSED: Never exceeds maxQuestions limit.');
  } else {
    console.log('❌ TEST 3 FAILED');
  }

  // Test 4: Already answered filtering
  const s4 = selectFollowUpQuestions({
    extraction: { detectedSymptoms: ['headache'] },
    caseState: { followUpAnswers: { blurred_vision: true } }
  });
  if (!s4.questions.some(q => q.id === 'blurred_vision')) {
    console.log('✅ TEST 4 PASSED: Does not repeat already answered questions.');
  } else {
    console.log('❌ TEST 4 FAILED');
  }

  // Test 5: Normalization - Boolean
  const n1 = normalizeFollowUpAnswers([
    { questionId: 'blurred_vision', value: true }
  ]);
  if (n1.symptomsToAdd.includes('blurred_vision')) {
    console.log('✅ TEST 5 PASSED: Correctly normalized boolean symptom.');
  } else {
    console.log('❌ TEST 5 FAILED');
  }

  // Test 6: Normalization - Severity Upgrade
  const n2 = normalizeFollowUpAnswers([
    { questionId: 'headache_severity', value: 'severe' }
  ]);
  if (n2.symptomsToAdd.includes('severe_headache') && n2.severityUpdates.headache === 'severe') {
    console.log('✅ TEST 6 PASSED: Correctly upgraded headache to severe_headache.');
  } else {
    console.log('❌ TEST 6 FAILED');
  }

  // Test 7: Normalization - Unknown value
  const n3 = normalizeFollowUpAnswers([
    { questionId: 'vaginal_bleeding', value: 'unknown' }
  ]);
  if (n3.symptomsToAdd.length === 0) {
    console.log('✅ TEST 7 PASSED: Unknown answer does not add danger symptoms.');
  } else {
    console.log('❌ TEST 7 FAILED');
  }

  console.log('\n--- All Follow-Up Tests Completed ---\n');
}

try {
  runTests();
} catch (e) {
  console.error(e);
}
