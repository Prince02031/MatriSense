const { extractSymptomsFromBangla } = require('../services/aiExtractorService');
const { keywordFallbackExtract } = require('../services/fallbackExtractor');

/**
 * Mock Tests for Symptom Extraction
 * Verifies keyword fallback and merging logic without hitting the live Gemini API.
 */

async function runTests() {
  console.log('--- Running Symptom Extraction Mock Tests ---');

  // Test 1: Keyword fallback detection
  const test1 = await extractSymptomsFromBangla({ 
    inputTextBn: 'আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি',
    patientProfile: { trimester: 'second' }
  });
  const hasHeadache = test1.detectedSymptoms.includes('headache') || test1.detectedSymptoms.includes('severe_headache');
  const hasBlurredVision = test1.detectedSymptoms.includes('blurred_vision');
  if (hasHeadache && hasBlurredVision) {
    console.log('✅ TEST 1 PASSED: Correctly extracted symptoms from combined Bangla input.');
  } else {
    console.log('❌ TEST 1 FAILED:', test1.detectedSymptoms);
  }

  // Test 2: Dangerous symptom detection
  const test2 = await extractSymptomsFromBangla({
    inputTextBn: 'রক্তপাত হচ্ছে'
  });
  if (test2.detectedSymptoms.includes('vaginal_bleeding')) {
    console.log('✅ TEST 2 PASSED: Correctly detected vaginal_bleeding.');
  } else {
    console.log('❌ TEST 2 FAILED');
  }

  // Test 3: Empty input handling
  const test3 = await extractSymptomsFromBangla({ inputTextBn: '' });
  if (Array.isArray(test3.detectedSymptoms) && test3.detectedSymptoms.length === 0) {
    console.log('✅ TEST 3 PASSED: Gracefully handled empty input.');
  } else {
    console.log('❌ TEST 3 FAILED');
  }

  // Test 4: Danger signs merge
  const test4 = await extractSymptomsFromBangla({
    inputTextBn: 'ব্যথা করছে',
    checkedDangerSigns: ['convulsion']
  });
  if (test4.detectedSymptoms.includes('convulsion')) {
    console.log('✅ TEST 4 PASSED: Correctly merged checkedDangerSigns.');
  } else {
    console.log('❌ TEST 4 FAILED');
  }

  // Test 5: Fallback consistency
  const fallback = keywordFallbackExtract({ 
    inputTextBn: 'খিঁচুনি হচ্ছে', 
    checkedDangerSigns: [] 
  });
  if (fallback.detectedSymptoms.includes('convulsion') && fallback.source === 'fallback') {
    console.log('✅ TEST 5 PASSED: Keyword fallback correctly identified danger sign.');
  } else {
    console.log('❌ TEST 5 FAILED');
  }

  console.log('\n--- All Extraction Mock Tests Completed ---\n');
}

runTests().catch(console.error);
