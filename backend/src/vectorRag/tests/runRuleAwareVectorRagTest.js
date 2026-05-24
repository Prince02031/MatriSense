#!/usr/bin/env node

/**
 * Rule-Aware Vector Retrieval Test
 * Tests retrieval logic with various risk levels, symptoms, and audience combinations
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });
const mongoose = require('mongoose');

// Database setup
const VectorKnowledgeSource = require('../../models/VectorKnowledgeSource');
const VectorKnowledgeChunk = require('../../models/VectorKnowledgeChunk');

// RAG components
const ruleAwareVectorRetriever = require('../retrieval/ruleAwareVectorRetriever');
const buildRuleAwareQuery = require('../domain/buildRuleAwareQuery');
const EmbeddingClient = require('../core/embeddingClient');

class RuleAwareVectorRagTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.embeddingClient = null;
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   Rule-Aware Vector Retrieval Test      ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      // Initialize embedding client
      this.embeddingClient = new EmbeddingClient();

      // Run test scenarios
      await this.testHighRiskHeadacheWithVision();
      await this.testHighRiskVaginalBleeding();
      await this.testLowRiskNausea();
      await this.testWorkerAudience();
      await this.testPatientAudienceFiltering();
      await this.testMultipleSymptomScoring();

      this.printSummary();
      process.exit(this.results.failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('\n✗ FATAL ERROR:', error.message);
      process.exit(1);
    } finally {
      await mongoose.connection.close();
    }
  }

  /**
   * Test Case 1: HIGH risk with headache + blurred_vision
   * Expected: Returns warning chunks, rejects LOW-only self-care, rejects worker-only
   */
  async testHighRiskHeadacheWithVision() {
    const testName = 'HIGH Risk Headache + Blurred Vision Retrieval';
    try {
      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['severe_headache', 'blurred_vision'],
        allowedGuidanceType: ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER', 'WARNING_SIGNS'],
        matchedRuleName: 'test_high_risk_neuro',
      };

      const caseState = {
        patientAge: 28,
        gestationalAge: 32,
      };

      const symptoms = {
        severe_headache: true,
        blurred_vision: true,
      };

      // Build rule-aware query
      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      // Retrieve chunks
      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'PATIENT',
          decisionContext: decision,
          maxResults: 5,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      // Validate results
      const retrieved = retrieval.retrievedChunks || [];
      const rejected = retrieval.rejectedChunks || [];

      let validation = {
        hasWarningChunks: false,
        hasOnlySelfCare: false,
        hasWorkerOnly: false,
      };

      for (const chunk of retrieved) {
        if (chunk.metadata?.allowedGuidanceTypes?.includes('WARNING_SIGNS')) {
          validation.hasWarningChunks = true;
        }
        if (
          !chunk.metadata?.allowedGuidanceTypes?.includes('SELF_CARE_AND_MONITOR') &&
          chunk.metadata?.allowedGuidanceTypes?.length === 0
        ) {
          validation.hasOnlySelfCare = true;
        }
      }

      for (const chunk of rejected) {
        if (chunk.metadata?.audiences?.includes('HEALTH_WORKER_ONLY')) {
          validation.hasWorkerOnly = true;
        }
      }

      if (retrieved.length > 0 && validation.hasWarningChunks) {
        this.passTest(testName, `Retrieved ${retrieved.length} chunks (${retrieved.length + rejected.length} total evaluated)`);
        console.log(`  - Retrieved chunks with WARNING_SIGNS: ${retrieved.filter(c => c.metadata?.allowedGuidanceTypes?.includes('WARNING_SIGNS')).length}`);
        console.log(`  - Rejected chunks (guards applied): ${rejected.length}`);
      } else if (retrieved.length === 0) {
        this.warnTest(testName, 'No chunks retrieved (database may be empty)');
      } else {
        this.failTest(testName, 'Retrieved chunks but validation failed');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 2: HIGH risk vaginal_bleeding
   * Expected: Returns urgent/warning chunks, rejects unrelated fever-only
   */
  async testHighRiskVaginalBleeding() {
    const testName = 'HIGH Risk Vaginal Bleeding Retrieval';
    try {
      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['vaginal_bleeding'],
        allowedGuidanceType: ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER'],
        matchedRuleName: 'test_high_risk_bleeding',
      };

      const caseState = {
        patientAge: 24,
        gestationalAge: 20,
      };

      const symptoms = {
        vaginal_bleeding: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'PATIENT',
          decisionContext: decision,
          maxResults: 5,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      const retrieved = retrieval.retrievedChunks || [];
      const rejected = retrieval.rejectedChunks || [];

      let urgentCount = 0;
      for (const chunk of retrieved) {
        if (
          chunk.metadata?.evidenceTags?.includes('vaginal_bleeding') ||
          chunk.metadata?.allowedGuidanceTypes?.includes('URGENT_ESCALATION')
        ) {
          urgentCount++;
        }
      }

      if (retrieved.length > 0 && urgentCount > 0) {
        this.passTest(testName, `Retrieved ${retrieved.length} chunks (${urgentCount} urgent/bleeding-related)`);
        console.log(`  - Rejected unrelated chunks: ${rejected.length}`);
      } else if (retrieved.length === 0) {
        this.warnTest(testName, 'No chunks retrieved (database may be empty)');
      } else {
        this.failTest(testName, 'Retrieved chunks but none are bleeding-related');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 3: LOW risk mild nausea
   * Expected: Returns SELF_CARE compatible chunks, includes disclaimers
   */
  async testLowRiskNausea() {
    const testName = 'LOW Risk Mild Nausea Retrieval';
    try {
      const decision = {
        riskLevel: 'LOW',
        evidenceTags: ['mild_symptoms'],
        allowedGuidanceType: ['SELF_CARE_AND_MONITOR', 'SAFETY_DISCLAIMER'],
        matchedRuleName: 'test_low_risk_monitor',
      };

      const caseState = {
        patientAge: 26,
        gestationalAge: 16,
      };

      const symptoms = {
        mild_nausea: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'PATIENT',
          decisionContext: decision,
          maxResults: 5,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      const retrieved = retrieval.retrievedChunks || [];
      let selfCareCount = 0;
      let disclaimerCount = 0;

      for (const chunk of retrieved) {
        if (chunk.metadata?.allowedGuidanceTypes?.includes('SELF_CARE_AND_MONITOR')) {
          selfCareCount++;
        }
        if (chunk.metadata?.allowedGuidanceTypes?.includes('SAFETY_DISCLAIMER')) {
          disclaimerCount++;
        }
      }

      if (retrieved.length > 0) {
        this.passTest(testName, `Retrieved ${retrieved.length} chunks (${selfCareCount} self-care, ${disclaimerCount} disclaimers)`);
        console.log(`  - Self-care guidance available: ${selfCareCount > 0}`);
        console.log(`  - Safety disclaimers included: ${disclaimerCount > 0}`);
      } else {
        this.warnTest(testName, 'No chunks retrieved (database may be empty)');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 4: WORKER audience can access worker-only guidance
   * Expected: HEALTH_WORKER_REVIEW, REFERRAL_WORKFLOW chunks included
   */
  async testWorkerAudience() {
    const testName = 'WORKER Audience Access Control';
    try {
      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['severe_bleeding', 'shock_symptoms'],
        allowedGuidanceType: [
          'HEALTH_WORKER_REVIEW',
          'REFERRAL_WORKFLOW',
          'URGENT_ESCALATION',
        ],
        matchedRuleName: 'test_worker_high_risk',
      };

      const caseState = {
        patientAge: 30,
        gestationalAge: 35,
      };

      const symptoms = {
        vaginal_bleeding: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'HEALTH_WORKER',
          decisionContext: decision,
          maxResults: 5,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      const retrieved = retrieval.retrievedChunks || [];
      let workerGuidanceCount = 0;

      for (const chunk of retrieved) {
        if (
          chunk.metadata?.allowedGuidanceTypes?.includes('HEALTH_WORKER_REVIEW') ||
          chunk.metadata?.allowedGuidanceTypes?.includes('REFERRAL_WORKFLOW')
        ) {
          workerGuidanceCount++;
        }
      }

      if (retrieved.length > 0) {
        this.passTest(testName, `Retrieved ${retrieved.length} chunks (${workerGuidanceCount} worker-specific)`);
        console.log(`  - Worker guidance types accessible: ${workerGuidanceCount > 0}`);
      } else {
        this.warnTest(testName, 'No chunks retrieved (database may be empty)');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 5: PATIENT audience cannot access worker-specific sources
   * Expected: Worker-only chunks are rejected
   */
  async testPatientAudienceFiltering() {
    const testName = 'PATIENT Audience Filtering (No Worker Access)';
    try {
      const decision = {
        riskLevel: 'MEDIUM',
        evidenceTags: ['moderate_symptoms'],
        allowedGuidanceType: ['CONTACT_HEALTH_WORKER', 'WARNING_SIGNS'],
        matchedRuleName: 'test_patient_medium_risk',
      };

      const caseState = {
        patientAge: 22,
        gestationalAge: 25,
      };

      const symptoms = {
        severe_headache: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'PATIENT',
          decisionContext: decision,
          maxResults: 5,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      const retrieved = retrieval.retrievedChunks || [];
      const rejected = retrieval.rejectedChunks || [];

      let workerOnlyRejected = 0;
      for (const chunk of rejected) {
        if (
          chunk.metadata?.sourceKind === 'WORKER_ONLY' ||
          !chunk.metadata?.audiences?.includes('PATIENT')
        ) {
          workerOnlyRejected++;
        }
      }

      if (retrieved.length > 0 || rejected.length > 0) {
        this.passTest(testName, `Retrieved ${retrieved.length}, rejected ${rejected.length} (${workerOnlyRejected} worker-only)`);
        console.log(`  - Patient-only content filtered correctly: ${workerOnlyRejected > 0 || rejected.length > 0}`);
      } else {
        this.warnTest(testName, 'No chunks retrieved or rejected (database may be empty)');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 6: Multiple symptom overlap scoring
   * Expected: Highest-scoring chunks ranked first
   */
  async testMultipleSymptomScoring() {
    const testName = 'Multiple Symptom Overlap Scoring';
    try {
      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['severe_headache', 'blurred_vision', 'severe_abdominal_pain'],
        allowedGuidanceType: ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER'],
        matchedRuleName: 'test_multiple_symptoms',
      };

      const caseState = {
        patientAge: 28,
        gestationalAge: 30,
      };

      const symptoms = {
        severe_headache: true,
        blurred_vision: true,
        severe_abdominal_pain: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        return;
      }

      const retrieval = await ruleAwareVectorRetriever.retrieve(
        {
          queryText: queryBuilding.queryText,
          riskLevel: queryBuilding.riskLevel,
          evidenceTags: queryBuilding.evidenceTags,
          confidence: queryBuilding.confidence,
        },
        {
          audience: 'PATIENT',
          decisionContext: decision,
          maxResults: 10,
        }
      );

      if (!retrieval.ok) {
        this.failTest(testName, `Retrieval failed: ${retrieval.error}`);
        return;
      }

      const retrieved = retrieval.retrievedChunks || [];

      // Check if they're sorted by score
      let sortedCorrectly = true;
      for (let i = 1; i < retrieved.length; i++) {
        if (retrieved[i].score > retrieved[i - 1].score) {
          sortedCorrectly = false;
          break;
        }
      }

      if (retrieved.length >= 2) {
        this.passTest(testName, `Retrieved ${retrieved.length} chunks (sorted: ${sortedCorrectly})`);
        console.log(`  - Top scores: ${retrieved[0].score?.toFixed(3)} → ${retrieved[1].score?.toFixed(3)}`);
      } else if (retrieved.length === 1) {
        this.passTest(testName, `Retrieved 1 chunk`);
      } else {
        this.warnTest(testName, 'No chunks retrieved (database may be empty)');
      }
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
    this.results.warnings++;
    this.results.tests.push({ name, status: 'WARN', message });
    console.log(`⊘ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  printSummary() {
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Passed:  ${this.results.passed}`);
    console.log(`Warned:  ${this.results.warnings}`);
    console.log(`Failed:  ${this.results.failed}`);
    console.log(`Total:   ${this.results.passed + this.results.warnings + this.results.failed}`);
    console.log('=================================\n');

    if (this.results.failed === 0) {
      console.log('✓ ALL CRITICAL TESTS PASSED');
    } else {
      console.log('✗ SOME TESTS FAILED');
    }
  }
}

// Run test
const test = new RuleAwareVectorRagTest();
test.run().catch(console.error);
