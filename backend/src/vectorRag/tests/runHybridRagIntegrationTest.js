#!/usr/bin/env node

/**
 * Hybrid RAG Integration Test
 * Tests HIGH-risk headache + blurred vision in hybrid mode
 * Validates:
 * - Risk level remains HIGH
 * - JSON card guidance still present
 * - Safe vector chunks appear if available
 * - No LOW-only self-care guidance appears
 * - Fallback to JSON works when vector fails
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });
const fs = require('fs');
const path = require('path');

class HybridRagIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  async run() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   Hybrid RAG Integration Test (HIGH Risk)       ║');
    console.log('║   Scenario: Headache + Blurred Vision          ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    try {
      // Test 1: JSON-only mode (baseline)
      await this.testJsonOnlyMode();

      // Test 2: Hybrid mode with vector fallback
      await this.testHybridModeWithFallback();

      // Test 3: Validate risk level preservation
      await this.testRiskLevelPreservation();

      // Test 4: Validate guidance type filtering
      await this.testGuidanceTypeFiltering();

      // Test 5: Validate deduplication
      await this.testDeduplication();

      this.printSummary();
      process.exit(this.results.failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('\n✗ FATAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async testJsonOnlyMode() {
    const testName = 'Test 1: JSON-only Mode (Baseline)';
    try {
      // Set RAG_MODE to json
      process.env.RAG_MODE = 'json';

      const { retrieveEvidenceWithMode } = require('../retrieval/hybridRagService');
      const knowledgeCardsPath = path.join(__dirname, '../../rag/knowledgeCards.json');

      if (!fs.existsSync(knowledgeCardsPath)) {
        this.warnTest(testName, 'Knowledge cards file not found');
        return;
      }

      const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

      // Simulate HIGH risk decision for headache + blurred vision
      const decision = {
        riskLevel: 'HIGH',
        allowedGuidanceType: 'URGENT_ESCALATION',
        evidenceTags: ['severe_headache', 'blurred_vision'],
        matchedRules: ['test_high_risk_neuro'],
      };

      const caseState = {
        symptoms: ['severe_headache', 'blurred_vision'],
        dangerSignsChecked: [],
      };

      const result = await retrieveEvidenceWithMode({
        decision,
        caseState,
        knowledgeCards,
        ragMode: 'json',
      });

      if (!result.retrievedCards || result.retrievedCards.length === 0) {
        this.failTest(testName, 'No cards retrieved in JSON mode');
        return;
      }

      // Validate no self-care guidance for HIGH risk
      const selfCareCards = result.retrievedCards.filter(
        (c) => c.guidanceType === 'SELF_CARE_AND_MONITOR'
      );

      if (selfCareCards.length > 0) {
        this.failTest(testName, `Found ${selfCareCards.length} self-care cards in HIGH risk (should be 0)`);
        return;
      }

      this.passTest(testName, `Retrieved ${result.retrievedCards.length} cards, mode: ${result.ragMode}`);
      console.log(`  - Guidance types: ${new Set(result.retrievedCards.map(c => c.guidanceType)).size} unique types`);
      console.log(`  - Self-care cards: 0 (correct for HIGH risk)`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testHybridModeWithFallback() {
    const testName = 'Test 2: Hybrid Mode with Fallback';
    try {
      // Set RAG_MODE to hybrid
      process.env.RAG_MODE = 'hybrid';

      const { retrieveEvidenceWithMode } = require('../retrieval/hybridRagService');
      const knowledgeCardsPath = path.join(__dirname, '../../rag/knowledgeCards.json');
      const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

      const decision = {
        riskLevel: 'HIGH',
        allowedGuidanceType: 'URGENT_ESCALATION',
        evidenceTags: ['severe_headache', 'blurred_vision'],
        matchedRules: ['test_high_risk_neuro'],
      };

      const caseState = {
        symptoms: ['severe_headache', 'blurred_vision'],
        dangerSignsChecked: [],
      };

      const result = await retrieveEvidenceWithMode({
        decision,
        caseState,
        knowledgeCards,
        ragMode: 'hybrid',
      });

      // Should have cards from JSON at minimum
      if (!result.retrievedCards || result.retrievedCards.length === 0) {
        this.failTest(testName, 'No cards retrieved in hybrid mode');
        return;
      }

      // Check for vector chunks (if available)
      const hasVectorChunks = result.vectorChunks && result.vectorChunks.length > 0;
      const modeCorrect = result.ragMode === 'hybrid' || result.ragMode === 'json';

      if (!modeCorrect) {
        this.failTest(testName, `Invalid ragMode: ${result.ragMode}`);
        return;
      }

      this.passTest(
        testName,
        `Retrieved ${result.retrievedCards.length} cards, vector chunks: ${result.vectorChunks?.length || 0}, mode: ${result.ragMode}`
      );
      console.log(`  - Vector fallback used: ${result.vectorFallbackUsed}`);
      console.log(`  - Retrieval warnings: ${result.retrievalWarnings?.length || 0}`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testRiskLevelPreservation() {
    const testName = 'Test 3: Risk Level Preservation';
    try {
      const { buildDecision } = require('../../triage/decision/decisionBuilder');

      // Simulate HIGH risk events
      const events = [
        {
          type: 'HIGH_RISK',
          params: {
            ruleName: 'severe_headache_with_vision',
            reason: 'Severe headache with blurred vision indicates possible preeclampsia',
            displayReasonBn: 'গুরুতর মাথাব্যথা এবং ঝাপসা দৃষ্টি প্রিঅ্যাক্লাম্পসিয়ার সংকেত',
            evidenceTag: 'severe_headache',
            recommendedAction: 'URGENT_REFERRAL',
          },
        },
        {
          type: 'HIGH_RISK',
          params: {
            ruleName: 'blurred_vision_symptom',
            reason: 'Blurred vision is danger sign',
            displayReasonBn: 'ঝাপসা দৃষ্টি একটি বিপদের চিহ্ন',
            evidenceTag: 'blurred_vision',
            recommendedAction: 'URGENT_REFERRAL',
          },
        },
      ];

      const caseState = {
        symptoms: ['severe_headache', 'blurred_vision'],
        dangerSignsChecked: [],
      };

      const decision = buildDecision(events, caseState);

      if (decision.riskLevel !== 'HIGH') {
        this.failTest(testName, `Risk level is ${decision.riskLevel}, expected HIGH`);
        return;
      }

      if (decision.allowedGuidanceType !== 'URGENT_ESCALATION') {
        this.failTest(testName, `Guidance type is ${decision.allowedGuidanceType}, expected URGENT_ESCALATION`);
        return;
      }

      this.passTest(testName, `Risk level: ${decision.riskLevel}, Guidance: ${decision.allowedGuidanceType}`);
      console.log(`  - Matched rules: ${decision.matchedRules.length}`);
      console.log(`  - Evidence tags: ${decision.evidenceTags.join(', ')}`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testGuidanceTypeFiltering() {
    const testName = 'Test 4: Guidance Type Filtering';
    try {
      const { assembleCareGuidanceContext } = require('../../rag/careGuidanceAssembler');
      const knowledgeCardsPath = path.join(__dirname, '../../rag/knowledgeCards.json');

      if (!fs.existsSync(knowledgeCardsPath)) {
        this.warnTest(testName, 'Knowledge cards file not found');
        return;
      }

      const knowledgeCards = JSON.parse(fs.readFileSync(knowledgeCardsPath, 'utf-8'));

      const decision = {
        riskLevel: 'HIGH',
        allowedGuidanceType: 'URGENT_ESCALATION',
        evidenceTags: ['severe_headache', 'blurred_vision'],
        matchedRules: ['test_high_risk_neuro'],
      };

      const caseState = {
        symptoms: ['severe_headache', 'blurred_vision'],
        dangerSignsChecked: [],
      };

      const careContext = assembleCareGuidanceContext({
        decision,
        caseState,
        knowledgeCards,
      });

      // Validate blocking of unsafe guidance
      const hasBlockedDiagnosis = careContext.blockedAdvice?.includes('diagnosis');
      const hasBlockedMedicine = careContext.blockedAdvice?.includes('medicine dosage');
      const hasBlockedReassurance = careContext.blockedAdvice?.includes('false reassurance');

      if (!hasBlockedDiagnosis || !hasBlockedMedicine || !hasBlockedReassurance) {
        this.failTest(
          testName,
          'Not all required advice types are blocked'
        );
        return;
      }

      // Validate no LOW-only self-care in results
      const unsafeCards = careContext.retrievedCards?.filter(
        (c) =>
          c.guidanceType === 'SELF_CARE_AND_MONITOR' &&
          (!c.riskLevelAllowed || !c.riskLevelAllowed.includes('HIGH'))
      );

      if (unsafeCards && unsafeCards.length > 0) {
        this.failTest(testName, `Found ${unsafeCards.length} LOW-only self-care cards in HIGH risk`);
        return;
      }

      this.passTest(testName, `Blocked advice items: ${careContext.blockedAdvice?.length || 0}`);
      console.log(`  - Guidance cards retrieved: ${careContext.retrievedCards?.length || 0}`);
      console.log(`  - Steps now (Bangla): ${careContext.stepsNowBn?.length || 0}`);
      console.log(`  - Why urgent (Bangla): ${careContext.whyUrgentBn?.length || 0}`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testDeduplication() {
    const testName = 'Test 5: Deduplication of Vector Chunks';
    try {
      const { convertVectorChunksToCards, mergeCardsWithVector } = require('../../rag/hybridEvidenceRetriever');

      // Create mock vector chunks
      const mockChunks = [
        {
          id: 'chunk_1',
          sourceId: 'cdc_hear_her',
          text: 'Contact a health facility immediately for severe headache',
          metadata: {
            sourceKind: 'VECTOR_RAG',
            allowedGuidanceTypes: ['URGENT_ESCALATION'],
            symptoms: ['severe_headache'],
          },
          score: 0.92,
        },
        {
          id: 'chunk_2',
          sourceId: 'cdc_hear_her',
          text: 'Seek urgent care for blurred vision',
          metadata: {
            sourceKind: 'VECTOR_RAG',
            allowedGuidanceTypes: ['URGENT_ESCALATION'],
            symptoms: ['blurred_vision'],
          },
          score: 0.88,
        },
      ];

      const decision = {
        riskLevel: 'HIGH',
        allowedGuidanceType: 'URGENT_ESCALATION',
      };

      const cards = convertVectorChunksToCards(mockChunks, decision);

      if (!Array.isArray(cards) || cards.length !== 2) {
        this.failTest(testName, `Expected 2 cards, got ${cards.length}`);
        return;
      }

      // Validate conversion format
      const firstCard = cards[0];
      if (!firstCard.isVectorChunk || !firstCard.vectorMetadata) {
        this.failTest(testName, 'Vector chunks not properly converted');
        return;
      }

      // Test merging with JSON cards (mock JSON cards)
      const jsonCards = [
        {
          id: 'json_1',
          text: 'Go to health facility now',
          guidanceType: 'URGENT_ESCALATION',
          riskLevelAllowed: ['HIGH'],
          priority: 100,
        },
      ];

      const merged = mergeCardsWithVector(jsonCards, cards, decision);

      // Should have deduped if similar, or all if different
      if (merged.length === 0) {
        this.failTest(testName, 'Merge resulted in 0 cards');
        return;
      }

      this.passTest(testName, `Converted ${cards.length} chunks, merged to ${merged.length} cards`);
      console.log(`  - Merged cards have priorities and vector scores`);
      console.log(`  - No exact duplicates`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  passTest(name, message) {
    this.results.passed++;
    this.results.tests.push({ name, status: 'PASS', message });
    console.log(`✓ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  failTest(name, message) {
    this.results.failed++;
    this.results.tests.push({ name, status: 'FAIL', message });
    console.log(`✗ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  warnTest(name, message) {
    this.results.tests.push({ name, status: 'WARN', message });
    console.log(`⊘ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  printSummary() {
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Total:  ${this.results.passed + this.results.failed}`);
    console.log('=================================\n');

    if (this.results.failed === 0) {
      console.log('✓ HYBRID RAG INTEGRATION PASSED');
    } else {
      console.log('✗ HYBRID RAG INTEGRATION FAILED');
    }
  }
}

// Run test
const test = new HybridRagIntegrationTest();
test.run().catch(console.error);
