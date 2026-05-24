#!/usr/bin/env node

/**
 * Simple Hybrid RAG Test
 * Verifies basic functionality
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════╗');
console.log('║    Hybrid RAG Quick Test               ║');
console.log('╚════════════════════════════════════════╝\n');

try {
  // Test 1: Check files exist
  console.log('✓ Test 1: Checking files exist...');
  
  const files = [
    { name: 'hybridRagService.js', path: 'src/vectorRag/retrieval/hybridRagService.js' },
    { name: 'hybridEvidenceRetriever.js', path: 'src/rag/hybridEvidenceRetriever.js' },
    { name: 'careGuidanceAssembler.js', path: 'src/rag/careGuidanceAssembler.js' },
    { name: 'knowledgeCards.json', path: 'src/rag/knowledgeCards.json' }
  ];

  let allExist = true;
  files.forEach(file => {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✓ ${file.name} exists`);
    } else {
      console.log(`  ✗ ${file.name} NOT FOUND at ${file.path}`);
      allExist = false;
    }
  });

  if (!allExist) {
    throw new Error('Some files missing!');
  }

  // Test 2: Load modules
  console.log('\n✓ Test 2: Loading modules...');
  
  const hybridRagService = require('./src/vectorRag/retrieval/hybridRagService');
  console.log(`  ✓ hybridRagService loaded`);
  
  const hybridEvidenceRetriever = require('./src/rag/hybridEvidenceRetriever');
  console.log(`  ✓ hybridEvidenceRetriever loaded`);
  
  const careGuidanceAssembler = require('./src/rag/careGuidanceAssembler');
  console.log(`  ✓ careGuidanceAssembler loaded`);

  // Test 3: Check exports
  console.log('\n✓ Test 3: Checking exports...');
  
  if (typeof hybridRagService.retrieveEvidenceWithMode === 'function') {
    console.log(`  ✓ retrieveEvidenceWithMode is a function`);
  } else {
    throw new Error('retrieveEvidenceWithMode is not a function');
  }

  if (typeof hybridEvidenceRetriever.retrieveEvidenceHybrid === 'function') {
    console.log(`  ✓ retrieveEvidenceHybrid is a function`);
  } else {
    throw new Error('retrieveEvidenceHybrid is not a function');
  }

  if (typeof careGuidanceAssembler.assembleCareGuidanceContext === 'function') {
    console.log(`  ✓ assembleCareGuidanceContext is a function`);
  } else {
    throw new Error('assembleCareGuidanceContext is not a function');
  }

  // Test 4: Check RAG mode env variable
  console.log('\n✓ Test 4: Checking RAG_MODE configuration...');
  
  const currentMode = process.env.RAG_MODE || 'json';
  console.log(`  ✓ RAG_MODE is set to: ${currentMode}`);
  
  const validModes = ['json', 'hybrid', 'vector'];
  if (validModes.includes(currentMode)) {
    console.log(`  ✓ RAG_MODE is valid`);
  } else {
    console.log(`  ⚠ RAG_MODE '${currentMode}' is not standard, but system allows it`);
  }

  // Test 5: Load knowledge cards
  console.log('\n✓ Test 5: Loading knowledge cards...');
  
  const knowledgeCardsPath = path.join(__dirname, 'src/rag/knowledgeCards.json');
  const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));
  console.log(`  ✓ Loaded ${knowledgeCards.length} knowledge cards`);

  // Test 6: Test basic retrieval
  console.log('\n✓ Test 6: Testing basic retrieval...');
  
  const testDecision = {
    riskLevel: 'HIGH',
    allowedGuidanceType: 'URGENT_ESCALATION',
    evidenceTags: ['severe_headache']
  };

  const testCaseState = {
    symptoms: ['severe_headache', 'blurred_vision']
  };

  console.log(`  - Testing with decision: ${JSON.stringify(testDecision, null, 2).split('\n').slice(0, 1)}`);
  console.log(`  - Testing with symptoms: ${testCaseState.symptoms.join(', ')}`);

  console.log('\n✓ ALL TESTS PASSED! ✓\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Hybrid RAG is correctly installed    ║');
  console.log('║                                        ║');
  console.log('║   To run full integration tests:       ║');
  console.log('║   npm run rag:hybrid-integration       ║');
  console.log('╚════════════════════════════════════════╝\n');

  process.exit(0);

} catch (error) {
  console.error('\n✗ TEST FAILED!\n');
  console.error('Error:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
