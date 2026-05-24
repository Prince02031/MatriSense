#!/usr/bin/env node

/**
 * Hybrid Fallback Test
 * Tests fallback behavior when embedding provider fails (quota, rate-limit, network errors)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });
const mongoose = require('mongoose');

// RAG components
const ruleAwareVectorRetriever = require('../retrieval/ruleAwareVectorRetriever');
const buildRuleAwareQuery = require('../domain/buildRuleAwareQuery');
const EmbeddingClient = require('../core/embeddingClient');

class HybridFallbackTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   Hybrid Fallback Test (Provider Fail)  ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      // Run test scenarios
      await this.testQuotaExhausted();
      await this.testRateLimited();
      await this.testNetworkError();
      await this.testGracefulDegradation();

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
   * Test Case 1: QUOTA_EXHAUSTED error
   * Expected: fallbackRecommended=true, ok=false, no throw
   */
  async testQuotaExhausted() {
    const testName = 'Provider Failure: QUOTA_EXHAUSTED';
    try {
      // Mock the embedding client to fail with quota error
      const originalEmbed = EmbeddingClient.prototype.embed;
      EmbeddingClient.prototype.embed = async () => {
        const error = new Error('Quota exhausted');
        error.code = 'QUOTA_EXHAUSTED';
        throw error;
      };

      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['severe_headache'],
        allowedGuidanceType: ['URGENT_ESCALATION'],
        matchedRuleName: 'test_failure_quota',
      };

      const caseState = {
        patientAge: 28,
        gestationalAge: 30,
      };

      const symptoms = {
        severe_headache: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        EmbeddingClient.prototype.embed = originalEmbed;
        return;
      }

      let retrieval;
      let errorThrown = false;

      try {
        retrieval = await ruleAwareVectorRetriever.retrieve(
          {
            queryText: queryBuilding.queryText,
            riskLevel: queryBuilding.riskLevel,
            evidenceTags: queryBuilding.evidenceTags,
          },
          {
            audience: 'PATIENT',
            decisionContext: decision,
          }
        );
      } catch (error) {
        errorThrown = true;
        console.log(`  - Error thrown: ${error.message}`);
      }

      // Restore original
      EmbeddingClient.prototype.embed = originalEmbed;

      if (errorThrown) {
        this.failTest(testName, 'Error was thrown (should fail gracefully)');
      } else if (retrieval && !retrieval.ok && retrieval.fallbackRecommended) {
        this.passTest(testName, 'Gracefully handled: fallbackRecommended=true, ok=false');
        console.log(`  - Mode: ${retrieval.mode}`);
        console.log(`  - Error: ${retrieval.error}`);
      } else if (retrieval && !retrieval.ok) {
        this.failTest(testName, 'Failed but fallbackRecommended not set');
      } else {
        this.failTest(testName, 'Unexpected retrieval result');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 2: RATE_LIMITED error
   * Expected: fallbackRecommended=true, ok=false, no throw
   */
  async testRateLimited() {
    const testName = 'Provider Failure: RATE_LIMITED';
    try {
      // Mock the embedding client to fail with rate limit error
      const originalEmbed = EmbeddingClient.prototype.embed;
      EmbeddingClient.prototype.embed = async () => {
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMITED';
        throw error;
      };

      const decision = {
        riskLevel: 'HIGH',
        evidenceTags: ['vaginal_bleeding'],
        allowedGuidanceType: ['URGENT_ESCALATION'],
        matchedRuleName: 'test_failure_ratelimit',
      };

      const caseState = {
        patientAge: 26,
        gestationalAge: 28,
      };

      const symptoms = {
        vaginal_bleeding: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        EmbeddingClient.prototype.embed = originalEmbed;
        return;
      }

      let retrieval;
      let errorThrown = false;

      try {
        retrieval = await ruleAwareVectorRetriever.retrieve(
          {
            queryText: queryBuilding.queryText,
            riskLevel: queryBuilding.riskLevel,
            evidenceTags: queryBuilding.evidenceTags,
          },
          {
            audience: 'PATIENT',
            decisionContext: decision,
          }
        );
      } catch (error) {
        errorThrown = true;
        console.log(`  - Error thrown: ${error.message}`);
      }

      // Restore original
      EmbeddingClient.prototype.embed = originalEmbed;

      if (errorThrown) {
        this.failTest(testName, 'Error was thrown (should fail gracefully)');
      } else if (retrieval && !retrieval.ok && retrieval.fallbackRecommended) {
        this.passTest(testName, 'Gracefully handled: fallbackRecommended=true, ok=false');
        console.log(`  - Mode: ${retrieval.mode}`);
        console.log(`  - Error: ${retrieval.error}`);
      } else if (retrieval && !retrieval.ok) {
        this.failTest(testName, 'Failed but fallbackRecommended not set');
      } else {
        this.failTest(testName, 'Unexpected retrieval result');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 3: Generic network error
   * Expected: fallbackRecommended=true, ok=false, no throw
   */
  async testNetworkError() {
    const testName = 'Provider Failure: NETWORK_ERROR';
    try {
      // Mock the embedding client to fail with network error
      const originalEmbed = EmbeddingClient.prototype.embed;
      EmbeddingClient.prototype.embed = async () => {
        const error = new Error('Failed to connect to embedding provider');
        error.code = 'NETWORK_ERROR';
        throw error;
      };

      const decision = {
        riskLevel: 'MEDIUM',
        evidenceTags: ['fever'],
        allowedGuidanceType: ['CONTACT_HEALTH_WORKER', 'WARNING_SIGNS'],
        matchedRuleName: 'test_failure_network',
      };

      const caseState = {
        patientAge: 24,
        gestationalAge: 20,
      };

      const symptoms = {
        fever: true,
      };

      const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);
      if (!queryBuilding.ok) {
        this.failTest(testName, `Query build failed: ${queryBuilding.error}`);
        EmbeddingClient.prototype.embed = originalEmbed;
        return;
      }

      let retrieval;
      let errorThrown = false;

      try {
        retrieval = await ruleAwareVectorRetriever.retrieve(
          {
            queryText: queryBuilding.queryText,
            riskLevel: queryBuilding.riskLevel,
            evidenceTags: queryBuilding.evidenceTags,
          },
          {
            audience: 'PATIENT',
            decisionContext: decision,
          }
        );
      } catch (error) {
        errorThrown = true;
        console.log(`  - Error thrown: ${error.message}`);
      }

      // Restore original
      EmbeddingClient.prototype.embed = originalEmbed;

      if (errorThrown) {
        this.failTest(testName, 'Error was thrown (should fail gracefully)');
      } else if (retrieval && !retrieval.ok && retrieval.fallbackRecommended) {
        this.passTest(testName, 'Gracefully handled: fallbackRecommended=true, ok=false');
        console.log(`  - Mode: ${retrieval.mode}`);
        console.log(`  - Error: ${retrieval.error}`);
      } else if (retrieval && !retrieval.ok) {
        this.failTest(testName, 'Failed but fallbackRecommended not set');
      } else {
        this.failTest(testName, 'Unexpected retrieval result');
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  /**
   * Test Case 4: Graceful degradation validation
   * Expected: Multiple sequential failures maintain consistent fallback state
   */
  async testGracefulDegradation() {
    const testName = 'Graceful Degradation (Multiple Failures)';
    try {
      // Mock the embedding client to always fail
      const originalEmbed = EmbeddingClient.prototype.embed;
      EmbeddingClient.prototype.embed = async () => {
        const error = new Error('Persistent provider failure');
        error.code = 'SERVICE_UNAVAILABLE';
        throw error;
      };

      const failureStates = [];

      // Run 3 sequential failures
      for (let i = 0; i < 3; i++) {
        const decision = {
          riskLevel: 'HIGH',
          evidenceTags: ['severe_abdominal_pain'],
          allowedGuidanceType: ['URGENT_ESCALATION'],
          matchedRuleName: `test_degradation_${i}`,
        };

        const caseState = {
          patientAge: 28 + i,
          gestationalAge: 30 - i,
        };

        const symptoms = {
          severe_abdominal_pain: true,
        };

        const queryBuilding = buildRuleAwareQuery(decision, caseState, symptoms);

        let retrieval;
        try {
          retrieval = await ruleAwareVectorRetriever.retrieve(
            {
              queryText: queryBuilding.queryText,
              riskLevel: queryBuilding.riskLevel,
              evidenceTags: queryBuilding.evidenceTags,
            },
            {
              audience: 'PATIENT',
              decisionContext: decision,
            }
          );
        } catch (error) {
          retrieval = { ok: false, error: error.message };
        }

        failureStates.push({
          attempt: i + 1,
          ok: retrieval.ok,
          fallbackRecommended: retrieval.fallbackRecommended,
          error: retrieval.error,
        });
      }

      // Restore original
      EmbeddingClient.prototype.embed = originalEmbed;

      // Check consistency
      const allFailedCorrectly = failureStates.every(
        state => !state.ok && state.fallbackRecommended
      );

      if (allFailedCorrectly) {
        this.passTest(
          testName,
          `All ${failureStates.length} failures handled consistently (fallback=true)`
        );
        console.log(`  - Failure pattern maintained across retries`);
      } else {
        this.failTest(testName, 'Inconsistent failure handling');
        console.log(`  - States:`, failureStates);
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
      console.log('✓ ALL FALLBACK TESTS PASSED - Graceful degradation working');
    } else {
      console.log('✗ SOME TESTS FAILED - Provider failure handling needs review');
    }
  }
}

// Run test
const test = new HybridFallbackTest();
test.run().catch(console.error);
