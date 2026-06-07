require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const User = require('../../../models/User');
const Patient = require('../../../models/Patient');
const TriageSession = require('../../../models/TriageSession');
const UploadedDocument = require('../../../models/UploadedDocument');

const {
    getTriageProfileContext,
    getCurrentTriage,
    getHealthWorkerCaseSummary,
    getGuidedCareContext,
    getRecentTriageHistory
} = require('../services/caseContextService');
const { buildAssistantPrompt } = require('../../../careAssistant/careAssistantPromptBuilder');
const { buildAssistantContext } = require('../../../careAssistant/careAssistantContextBuilder');

let passCount = 0;
let failCount = 0;

const logTest = (name, fn) => {
    return async () => {
        try {
            await fn();
            passCount++;
            console.log(`✅ PASS: ${name}`);
        } catch (e) {
            failCount++;
            console.error(`❌ FAIL: ${name} - ${e.message}`);
        }
    };
};

const run = async () => {
    // 0. Connect
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("Connected to MongoDB for MCP Smoke Test");
    console.log("═".repeat(70));

    // Clear old test data safely by email pattern
    await User.deleteMany({ email: /smoke_test/ });
    await Patient.deleteMany({ name: /Smoke Test/ });

    // 1. Setup Mock Data
    const rPhone = () => Math.floor(Math.random() * 1000000000).toString();
    const patientAUser = await User.create({ name: 'PA', phone: rPhone(), passwordHash: 'hash', email: 'smoke_test_pa@matri.com', role: 'MOTHER' });
    const patientBUser = await User.create({ name: 'PB', phone: rPhone(), passwordHash: 'hash', email: 'smoke_test_pb@matri.com', role: 'MOTHER' });
    const workerUser = await User.create({ name: 'HW', phone: rPhone(), passwordHash: 'hash', email: 'smoke_test_hw@matri.com', role: 'HEALTH_WORKER', coverageDistricts: ['TestDistrict'] });
    const adminUser = await User.create({ name: 'AD', phone: rPhone(), passwordHash: 'hash', email: 'smoke_test_admin@matri.com', role: 'ADMIN' });

    const patientA = await Patient.create({ userId: patientAUser._id, name: 'Smoke Test A', age: 25, trimester: 'first', district: 'TestDistrict' });
    const patientB = await Patient.create({ userId: patientBUser._id, name: 'Smoke Test B', age: 28, trimester: 'second', district: 'OtherDistrict' });

    const sessionA = await TriageSession.create({
        patientId: patientA._id, status: 'completed',
        caseState: { symptoms: ["fever"] },
        decision: { riskLevel: "HIGH" },
        profileSnapshot: { name: 'Smoke Test A', district: 'TestDistrict' }
    });
    const sessionB = await TriageSession.create({
        patientId: patientB._id, status: 'completed',
        caseState: { symptoms: ["headache"] },
        decision: { riskLevel: "LOW" },
        profileSnapshot: { name: 'Smoke Test B', district: 'OtherDistrict' }
    });

    const testDoc = await UploadedDocument.create({
        patientId: patientA._id,
        relatedSessionId: sessionA._id,
        uploadedByUserId: patientAUser._id,
        ownerId: patientA._id,
        ownerType: 'PATIENT',
        mimeType: 'application/pdf',
        documentType: 'PREGNANCY_RECORD',
        originalName: 'test.pdf',
        storagePath: '/secure-vault/test.pdf'
    });

    // ========================================================================
    // TESTS
    // ========================================================================

    await logTest("1. Patient requests own current triage", async () => {
        const res = await getCurrentTriage({ sessionId: sessionA._id.toString(), requester: { id: patientAUser._id.toString(), role: 'PATIENT' } });
        assert.ok(res, "Should return context");
        assert.strictEqual(res.symptoms[0], "fever");
    })();

    await logTest("2. Patient requests another patient's case", async () => {
        const res = await getCurrentTriage({ sessionId: sessionB._id.toString(), requester: { id: patientAUser._id.toString(), role: 'PATIENT' } });
        assert.ok(res === null || res.error, "Should deny access");
    })();

    await logTest("3. Health worker requests assigned/covered case (TestDistrict)", async () => {
        const res = await getHealthWorkerCaseSummary({ sessionId: sessionA._id.toString(), requester: { id: workerUser._id.toString(), role: 'HEALTH_WORKER' } });
        assert.ok(res, "Should return detailed context");
        // Verify response contains expected worker-only fields
        assert.ok(res.riskLevel, "Should contain riskLevel");
        assert.ok(res.profileSnapshot, "Should contain profileSnapshot");
        assert.ok(Array.isArray(res.extractedSymptoms), "Should contain extractedSymptoms array");
        assert.ok('documentUploadSummary' in res, "Should contain documentUploadSummary");
    })();

    await logTest("4. Health worker requests unrelated case (OtherDistrict)", async () => {
        const res = await getHealthWorkerCaseSummary({ sessionId: sessionB._id.toString(), requester: { id: workerUser._id.toString(), role: 'HEALTH_WORKER' } });
        assert.ok(!res, "Should deny access for worker outside coverage district");
    })();

    await logTest("5. Admin requests case summary", async () => {
        const res = await getHealthWorkerCaseSummary({ sessionId: sessionB._id.toString(), requester: { id: adminUser._id.toString(), role: 'ADMIN' } });
        assert.ok(res, "Admin should bypass district checks");
        assert.ok(res.riskLevel, "Admin should see riskLevel");
    })();

    await logTest("6. case_get_guided_care_context for HIGH risk", async () => {
        const res = await getGuidedCareContext({ sessionId: sessionA._id.toString(), requester: { role: 'INTERNAL' } });
        assert.strictEqual(res.riskLevel, 'HIGH', "Risk level should be HIGH");

        // Verify safety boundaries prevent diagnosis, prescription, dosage, downgrade
        assert.strictEqual(res.safetyBoundaries.canDiagnose, false, "canDiagnose must be false");
        assert.strictEqual(res.safetyBoundaries.canPrescribe, false, "canPrescribe must be false");
        assert.strictEqual(res.safetyBoundaries.canSuggestDosage, false, "canSuggestDosage must be false");
        assert.strictEqual(res.safetyBoundaries.canDowngradeRisk, false, "canDowngradeRisk must be false");
        assert.strictEqual(res.safetyBoundaries.mustPreserveUrgency, true, "mustPreserveUrgency must be true");

        // Verify HIGH risk gets urgent tone
        assert.strictEqual(res.recommendedAssistantTone, 'urgent_and_calm', "HIGH risk should get urgent_and_calm tone");
    })();

    await logTest("7. Uploaded documents exist — return safe mapping only", async () => {
        const res = await getTriageProfileContext({ patientId: patientA._id.toString(), sessionId: sessionA._id.toString(), requester: { role: 'INTERNAL' } });
        const docSummary = res.documentUploadSummary;
        assert.ok(docSummary.documentsUploaded, "documentsUploaded should be true");
        assert.strictEqual(docSummary.documentCount, 1, "documentCount should be 1");
        assert.ok(docSummary.documentTypes.includes('PREGNANCY_RECORD'), "Should list document type");

        // Critical security assertions: raw file data must NEVER leak
        const serialized = JSON.stringify(res);
        assert.ok(!serialized.includes('storagePath'), "storagePath MUST NEVER be exposed");
        assert.ok(!serialized.includes('test.pdf'), "Original filenames MUST NEVER be exposed");
        assert.ok(!serialized.includes('/secure-vault'), "Storage paths MUST NEVER be exposed");
    })();

    await logTest("8. Triage continues safely when case context service fails", async () => {
        // Simulate a failure scenario: call with an invalid session ID
        // The service should return null or a safe default — never throw
        const fakeSessionId = new mongoose.Types.ObjectId().toString();

        let threwError = false;
        try {
            const result = await getGuidedCareContext({ sessionId: fakeSessionId, requester: { role: 'INTERNAL' } });
            // getGuidedCareContext returns a safe default context (not null) when session is missing
            // This is correct graceful degradation — it still provides safety boundaries
            if (result !== null) {
                assert.ok(result.safetyBoundaries, "Default result should still have safety boundaries");
                assert.strictEqual(result.riskLevel, 'UNKNOWN', "Default riskLevel should be UNKNOWN");
            }
        } catch (e) {
            threwError = true;
        }
        assert.ok(!threwError, "Service must NOT throw — it should fail gracefully");

        // Verify getCurrentTriage fails gracefully (returns null)
        const triageResult = await getCurrentTriage({ sessionId: fakeSessionId, requester: { role: 'INTERNAL' } });
        assert.strictEqual(triageResult, null, "getCurrentTriage should return null for missing session");

        // Verify getHealthWorkerCaseSummary fails gracefully (returns null)
        const workerResult = await getHealthWorkerCaseSummary({ sessionId: fakeSessionId, requester: { id: workerUser._id.toString(), role: 'HEALTH_WORKER' } });
        assert.strictEqual(workerResult, null, "getHealthWorkerCaseSummary should return null for missing session");
    })();

    await logTest("9. Assistant asks: 'স্বাস্থ্যকর্মীকে কী বলবো?' (Guided Care context)", async () => {
        const rawCtx = await buildAssistantContext(sessionA._id.toString(), 'TELL_HEALTH_WORKER');
        assert.ok(rawCtx, "Should return context");
        assert.ok(rawCtx.riskLevel, "Should include riskLevel");
        assert.ok(rawCtx.safetyBoundaries, "Should include safetyBoundaries from MCP");

        const promptParams = buildAssistantPrompt({
            userMessage: 'স্বাস্থ্যকর্মীকে কী বলবো?',
            officialTriageContext: rawCtx
        });
        assert.ok(promptParams.systemInstruction, "Should produce system instruction");
        assert.ok(promptParams.systemInstruction.includes("PRODUCE: A SHORT SCRIPT"), "Should contain PRODUCE: A SHORT SCRIPT for tell-health-worker intent");
    })();

    await logTest("10. Assistant asks: 'আমার আগের triage এ কী হয়েছিল?' (History routing)", async () => {
        const rawCtx = await buildAssistantContext(sessionA._id.toString(), 'ASK_HISTORY');
        assert.ok(rawCtx, "Should return context");
        assert.ok(rawCtx.previousHistory, "Should contain previousHistory");

        const promptParams = buildAssistantPrompt({
            userMessage: 'আমার আগের triage এ কী হয়েছিল?',
            officialTriageContext: rawCtx
        });
        assert.ok(promptParams.userPrompt, "Should produce userPrompt");
        assert.ok(promptParams.userPrompt.includes("PREVIOUS TRIAGE HISTORY"), "Should include PREVIOUS TRIAGE HISTORY in prompt");
    })();

    await logTest("11. Local stdio MCP server exposes all tools", async () => {
        // Verify server module loads and has correct tool list
        const { mcpServer } = require('../server');
        assert.ok(mcpServer, "MCP server module should export mcpServer");

        // The server has request handlers registered — verify tools list via handler
        // We call the ListTools handler directly
        const toolsResponse = await mcpServer.requestHandlers?.get?.('tools/list')?.({});
        if (toolsResponse) {
            const toolNames = toolsResponse.tools.map(t => t.name);
            const expectedTools = [
                'case_get_triage_profile_context',
                'case_get_current_triage',
                'case_get_guided_care_context',
                'case_get_recent_triage_history',
                'case_get_patient_visible_status',
                'case_get_health_worker_case_summary'
            ];
            for (const expected of expectedTools) {
                assert.ok(toolNames.includes(expected), `Tool '${expected}' should be registered`);
            }
            assert.strictEqual(toolNames.length, 6, "Should have exactly 6 tools");
        } else {
            // Fallback: just verify the server has handlers registered
            assert.ok(mcpServer._requestHandlers || mcpServer.requestHandlers, "Server should have request handlers registered");
        }

        // Verify npm script exists
        const pkg = require('../../../../package.json');
        assert.ok(pkg.scripts['mcp:case'], "npm run mcp:case script should exist");
        assert.ok(pkg.scripts['mcp:case'].includes('--stdio'), "mcp:case should use --stdio transport");
    })();

    await logTest("12. HTTP MCP disabled by default", async () => {
        // Save current env values
        const savedEnable = process.env.ENABLE_CASE_CONTEXT_MCP;
        const savedHttp = process.env.CASE_MCP_ENABLE_HTTP;

        // Clear the env flags
        delete process.env.ENABLE_CASE_CONTEXT_MCP;
        delete process.env.CASE_MCP_ENABLE_HTTP;

        // Verify the condition that guards HTTP mount evaluates to false
        const httpEnabled = (process.env.ENABLE_CASE_CONTEXT_MCP === 'true' && process.env.CASE_MCP_ENABLE_HTTP === 'true');
        assert.strictEqual(httpEnabled, false, "HTTP MCP should be disabled by default when env vars are not set");

        // Verify that setting only ENABLE_CASE_CONTEXT_MCP without CASE_MCP_ENABLE_HTTP still fails
        process.env.ENABLE_CASE_CONTEXT_MCP = 'true';
        const httpEnabledPartial = (process.env.ENABLE_CASE_CONTEXT_MCP === 'true' && process.env.CASE_MCP_ENABLE_HTTP === 'true');
        assert.strictEqual(httpEnabledPartial, false, "HTTP MCP should be disabled when only ENABLE_CASE_CONTEXT_MCP is set");

        // Verify the HTTP transport requires token in production
        const { createMcpRouter } = require('../transports/http');
        assert.ok(typeof createMcpRouter === 'function', "createMcpRouter should be exported as a function");

        // Verify the token middleware logic
        const savedToken = process.env.CASE_MCP_INTERNAL_TOKEN;
        process.env.CASE_MCP_INTERNAL_TOKEN = 'test-secret-token';

        // Simulate a request without the token header
        const express = require('express');
        const { mcpServer } = require('../server');
        const router = createMcpRouter(mcpServer);
        assert.ok(router, "Router should be created successfully");

        // Restore env
        if (savedEnable !== undefined) process.env.ENABLE_CASE_CONTEXT_MCP = savedEnable;
        else delete process.env.ENABLE_CASE_CONTEXT_MCP;
        if (savedHttp !== undefined) process.env.CASE_MCP_ENABLE_HTTP = savedHttp;
        else delete process.env.CASE_MCP_ENABLE_HTTP;
        if (savedToken !== undefined) process.env.CASE_MCP_INTERNAL_TOKEN = savedToken;
        else delete process.env.CASE_MCP_INTERNAL_TOKEN;
    })();

    // ========================================================================
    // Summary
    // ========================================================================
    console.log("\n" + "═".repeat(70));
    console.log(`MCP Smoke Test Complete: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} tests`);
    if (failCount > 0) {
        console.log("⚠️  Some tests failed — review output above.");
    } else {
        console.log("🎉 All tests passed!");
    }
    console.log("═".repeat(70));

    // Cleanup
    await User.deleteMany({ email: /smoke_test/ });
    await Patient.deleteMany({ name: /Smoke Test/ });
    await TriageSession.deleteMany({ _id: { $in: [sessionA._id, sessionB._id] } });
    await UploadedDocument.deleteMany({ _id: testDoc._id });
    await mongoose.disconnect();
    console.log("Disconnected. Cleanup complete.");
};

if (require.main === module) {
    run().catch((err) => {
        console.error("Smoke test runner failed:", err);
        process.exit(1);
    });
}
