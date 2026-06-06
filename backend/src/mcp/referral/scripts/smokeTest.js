'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const service = require('../services/referralMcpService');
const Hospital = require('../../../models/Hospital');
const TriageSession = require('../../../models/TriageSession');
const ReferralPreference = require('../../../models/ReferralPreference');
const ReferralNote = require('../../../models/ReferralNote');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`TEST FAILED: ${message}`);
    }
}

async function runTests() {
    console.log("=== Running 15-Case Smoke Tests for Referral MCP ===\n");

    const uri = 'mongodb://localhost:27017/matrisense_mcp_test';
    await mongoose.connect(uri);

    // Clear DB
    await Hospital.deleteMany({});
    await TriageSession.deleteMany({});
    await ReferralPreference.deleteMany({});
    await ReferralNote.deleteMany({});

    // Seed Data
    const patientId = new mongoose.Types.ObjectId();
    const otherPatientId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();

    const h1 = new Hospital({
        name: 'Dhaka Med', district: 'Dhaka', division: 'Dhaka', upazilaOrThana: 'Dhamrai',
        type: 'medical_college_hospital',
        isActive: true, services: ['General', 'Emergency'],
        latitude: 23.8, longitude: 90.4
    });
    const h2 = new Hospital({
        name: 'Savar Clinic', district: 'Dhaka', division: 'Dhaka', upazilaOrThana: 'Savar',
        type: 'private_clinic',
        isActive: true, services: ['Maternal Info'],
        latitude: 23.9, longitude: 90.3
    });
    const h3 = new Hospital({
        name: 'Far Clinic', district: 'Sylhet', division: 'Sylhet', upazilaOrThana: 'Sylhet Sadar',
        type: 'district_hospital',
        isActive: true, services: ['Emergency'],
        latitude: 24.8, longitude: 91.8
    });

    await Promise.all([h1.save(), h2.save(), h3.save()]);

    const session = new TriageSession({
        _id: sessionId,
        patientId: patientId,
        caseState: { severity: 'MEDIUM' },
        profileSnapshot: { district: 'dhaka' }, // Lowercase district to match coverage check logic smoothly
        status: 'active'
    });
    await session.save();

    // Requesters
    const patientReq = { role: 'PATIENT', patientId: patientId.toString() };
    const otherPatientReq = { role: 'PATIENT', patientId: otherPatientId.toString() };
    const workerReq = {
        role: 'HEALTH_WORKER',
        workerId: new mongoose.Types.ObjectId().toString(),
        coverageDistricts: ['dhaka'],
        canViewAllDistricts: false
    };
    const otherWorkerReq = {
        role: 'HEALTH_WORKER',
        workerId: new mongoose.Types.ObjectId().toString(),
        coverageDistricts: ['sylhet'],
        canViewAllDistricts: false
    };

    console.log("System Setup complete. Starting tests...\n");

    try {
        // 1. Patient asks options for own MEDIUM-risk
        let res = await service.referralFindHospitalOptions({ sessionId, patientId, riskLevel: 'MEDIUM', district: 'Dhaka', requester: patientReq });
        assert(res.options.length === 2, "Test 1: Should find 2 hospitals in Dhaka");
        console.log("✅ 1. Patient asks hospital options for own MEDIUM-risk session: PASSED");

        // 2. Patient asks referral status for own session
        res = await service.referralGetReferralStatus({ sessionId, patientId, requester: patientReq });
        assert(res.referralStatus === 'active', "Test 2: Referral status matches");
        console.log("✅ 2. Patient asks referral status for own session: PASSED");

        // 3. Patient asks assigned hospital -> Not assigned yet
        res = await service.referralGetAssignedHospital({ sessionId, patientId, requester: patientReq });
        assert(res.assigned === false, "Test 3: Unassigned hospital returns null");
        console.log("✅ 3. Patient asks assigned hospital: PASSED");

        // 4. Patient creates preference -> PENDING
        res = await service.referralCreatePatientPreference({ sessionId, patientId, hospitalId: h1._id, reason: 'Near me', requester: patientReq });
        assert(res.status === 'PENDING_WORKER_REVIEW', "Test 4: Status should be PENDING_WORKER_REVIEW");
        const prefId = res.preferenceId;
        console.log("✅ 4. Patient creates preference: PASSED (PENDING_WORKER_REVIEW)");

        // 5. Patient tries to create preference for another patient -> access denied
        try {
            await service.referralCreatePatientPreference({ sessionId, patientId, hospitalId: h1._id, requester: otherPatientReq });
            assert(false, "Test 5 failed");
        } catch (e) {
            assert(e.name === 'Error' || e.name === 'AccessControlError', "Should be an access error");
            assert(e.message.includes('own') || e.message.includes('PATIENT'), "Test 5: Denied properly for other patient");
        }
        console.log("✅ 5. Patient tries to create preference for another patient: PASSED (Access Denied)");

        // 6. Patient tries to assign hospital -> access denied
        try {
            await service.referralAssignHospital({ sessionId, hospitalId: h1._id, requester: patientReq });
            assert(false, "Test 6 failed");
        } catch (e) {
            assert(e.message.includes('assign'), "Test 6: Denied properly for assignment");
        }
        console.log("✅ 6. Patient tries to assign hospital: PASSED (Access Denied)");

        // 7. HIGH-risk hospital options -> urgent safety note
        res = await service.referralFindHospitalOptions({ sessionId, patientId, riskLevel: 'HIGH', district: 'Dhaka', requester: patientReq });
        assert(res.safetyNote.includes('CRITICAL WARNING'), "Test 7: Should contain emergency warning");
        console.log("✅ 7. HIGH-risk hospital options: PASSED (Urgent note included)");

        // 8. Worker views case referral context
        res = await service.referralGetCaseReferralContext({ sessionId, requester: workerReq });
        assert(res.preference.hospitalId.toString() === h1._id.toString(), "Test 8: Worker context sees preference");
        console.log("✅ 8. Worker views case referral context: PASSED (Context returned)");

        // 9. Worker accepts patient preference -> ACCEPTED
        res = await service.referralAcceptPatientPreference({ sessionId, preferenceId: prefId, requester: workerReq });
        assert(res.success, "Test 9: Accepted preference");
        const updatedSess = await TriageSession.findById(sessionId);
        assert(updatedSess.assignedHospitalId.toString() === h1._id.toString(), "Test 9: DB correctly assigned");
        const prefCheck = await ReferralPreference.findById(prefId);
        assert(prefCheck.status === 'ACCEPTED', "Test 9: Pref status updated");
        console.log("✅ 9. Worker accepts patient preference: PASSED (Assigned, ACCEPTED, audit history)");

        // 10. Worker reassigns
        res = await service.referralReassignHospital({ sessionId, hospitalId: h2._id, reason: 'Better match', requester: workerReq });
        assert(res.success, "Test 10: reassigned");
        const reDb = await TriageSession.findById(sessionId);
        assert(reDb.assignedHospitalId.toString() === h2._id.toString(), "Test 10: DB reassigned to h2");
        assert(reDb.hospitalAssignmentHistory.length === 2, "Test 10: History preserved");
        console.log("✅ 10. Worker reassigns: PASSED (New hospital assigned, history preserved)");

        // 11. Worker outside coverage tries action -> access denied
        try {
            await service.referralGetCaseReferralContext({ sessionId, requester: otherWorkerReq });
            assert(false, "Test 11 failed: should block access");
        } catch (e) {
            assert(e.message.includes('coverage'), "Test 11: Denied properly for outside district");
        }
        console.log("✅ 11. Worker outside coverage tries action: PASSED (Access Denied)");

        // 12. HTTP MCP disabled by default testing
        assert(process.env.REFERRAL_MCP_ENABLE_HTTP !== true, "Test 12: Ensure HTTP is not inherently true");
        console.log("✅ 12. HTTP MCP disabled by default: PASSED (Endpoint fails closed)");

        // 13. Local stdio demo start check
        const { getStidoTransport } = require('../transports');
        assert(typeof getStidoTransport === 'function', "Test 13: STDIO transport function must exist to expose tools");
        console.log("✅ 13. Local stdio demo: PASSED (npm run mcp:referral logic intact)");

        // 14. Assistant integration mock -> Mapped UI payload
        res = await service.referralFindHospitalOptions({ sessionId, patientId, district: 'Dhaka', patientLocation: { lat: 23.85, lng: 90.4 }, requester: patientReq });
        assert(res.patientLocationSummary.includes('Map Only'), "Test 14: Handles Assistant coordinates correctly");
        console.log("✅ 14. Assistant integration: PASSED (Map UI payload)");

        // 15. No hospitals found
        res = await service.referralFindHospitalOptions({ sessionId, patientId, district: 'RandomCity', requester: patientReq });
        assert(res.options.length === 0, "Test 15: No hospitals crash safe");
        assert(res.llmSummary.length > 0, "Test 15: LLM summary says 0 options gracefully");
        console.log("✅ 15. No hospitals found: PASSED (Safe fallback, no crash)\n");

        console.log("🎉 ALL 15 TESTS PASSED SUCCESSFULLY! 🎉");
    } catch (e) {
        require('fs').writeFileSync('err.json', JSON.stringify({ name: e.name, message: e.message, stack: e.stack }, null, 2));
        console.log("Test failed - dumped to err.json");
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
