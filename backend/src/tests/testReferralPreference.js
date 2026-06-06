require('dotenv').config();
const mongoose = require('mongoose');
const { 
  referral_find_hospital_options,
  referral_create_patient_preference,
  referral_get_referral_status,
  referral_get_assigned_hospital
} = require('../services/referralAssistantService');
const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const ReferralPreference = require('../models/ReferralPreference');
const { assignHospital } = require('../controllers/worker.controller');

async function runTests() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not configured in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  try {
    // 1. Create a dummy patient
    console.log('Creating dummy patient...');
    const patient = await Patient.create({
      name: 'Test Patient Preference',
      age: 26,
      trimester: 'second',
      district: 'Dhaka',
      upazilaOrThana: 'Mirpur',
      latitude: 23.7932,
      longitude: 90.3644,
      consentToUseLocationForReferral: true,
      locationSource: 'PROFILE_GPS',
      phone: '01700000000'
    });

    // 2. Create dummy triage session
    console.log('Creating dummy session...');
    const session = await TriageSession.create({
      patientId: patient._id,
      riskLevel: 'MEDIUM',
      status: 'active',
      profileSnapshot: {
        name: 'Test Patient Preference',
        age: 26,
        district: 'Dhaka',
        upazilaOrThana: 'Mirpur',
        latitude: 23.7932,
        longitude: 90.3644,
        locationSource: 'PROFILE_GPS'
      }
    });

    // 3. Create active dummy hospital options
    console.log('Creating active dummy hospitals...');
    const hospital1 = await Hospital.create({
      name: 'Test Referral Hosp A (Mirpur)',
      type: 'upazila_health_complex',
      division: 'Dhaka',
      district: 'Dhaka',
      upazilaOrThana: 'Mirpur',
      latitude: 23.7935,
      longitude: 90.3650,
      phone: '01711111111',
      services: ['Antenatal Care', 'Normal Delivery'],
      isActive: true
    });

    const hospital2 = await Hospital.create({
      name: 'Test Referral Hosp B (Gulshan)',
      type: 'private_clinic',
      division: 'Dhaka',
      district: 'Dhaka',
      upazilaOrThana: 'Gulshan',
      latitude: 23.7989,
      longitude: 90.4187,
      phone: '01722222222',
      services: ['Antenatal Care', 'C-Section', 'NICU'],
      isActive: true
    });

    // Test 1: find hospital options
    console.log('\n--- Test 1: referral_find_hospital_options ---');
    const optionsResult = await referral_find_hospital_options({
      sessionId: session._id.toString(),
      riskLevel: 'MEDIUM',
      serviceNeeded: 'ANC',
      limit: 5
    });
    console.log('Options count:', optionsResult.options.length);
    console.log('Patient location:', optionsResult.patientLocation);
    console.log('First option suitability:', optionsResult.options[0]?.suitabilityLevel);
    if (optionsResult.options.length === 0) {
      throw new Error('Failed to find hospital options.');
    }

    // Test 2: create preference
    console.log('\n--- Test 2: referral_create_patient_preference ---');
    const prefResult = await referral_create_patient_preference({
      sessionId: session._id.toString(),
      patientId: patient._id.toString(),
      hospitalId: hospital1._id.toString(),
      reason: 'Close to my home'
    });
    console.log('Pref creation message:', prefResult.message);
    console.log('Preference status:', prefResult.preference.status);
    if (prefResult.preference.status !== 'PENDING_WORKER_REVIEW') {
      throw new Error('Preference should be in PENDING_WORKER_REVIEW status.');
    }

    // Assert triage session has updated preferredHospitalId
    const updatedSession1 = await TriageSession.findById(session._id);
    console.log('Session preferredHospitalId:', updatedSession1.preferredHospitalId?.toString());
    console.log('Session preferredHospitalSnapshot.name:', updatedSession1.preferredHospitalSnapshot?.name);
    if (updatedSession1.preferredHospitalId?.toString() !== hospital1._id.toString()) {
      throw new Error('Session did not mirror the preferredHospitalId.');
    }

    // Test 3: status check
    console.log('\n--- Test 3: referral_get_referral_status ---');
    const statusResult = await referral_get_referral_status({
      sessionId: session._id.toString()
    });
    console.log('Status Result Object:', JSON.stringify(statusResult, null, 2));
    console.log('TriageSession from DB:', JSON.stringify(await TriageSession.findById(session._id).lean(), null, 2));
    console.log('Referral status:', statusResult.referralStatus);
    console.log('Worker review status:', statusResult.workerReviewStatus);
    console.log('Patient preference hospitalName:', statusResult.patientPreference?.hospitalName);
    if (statusResult.referralStatus !== 'PREFERENCE_PENDING_REVIEW') {
      throw new Error('Referral status should show PREFERENCE_PENDING_REVIEW.');
    }

    // Test 4: assign hospital (acceptance of preference)
    console.log('\n--- Test 4: Accept preference by assigning the preferred hospital ---');
    // We mock res and req objects for worker controller
    const reqAccept = {
      params: { sessionId: session._id.toString() },
      body: { hospitalId: hospital1._id.toString(), reason: 'Accepting preference' },
      user: { _id: new mongoose.Types.ObjectId() }
    };
    let resDataAccept = null;
    const resAccept = {
      json: (data) => { resDataAccept = data; },
      status: (code) => ({
        json: (data) => { resDataAccept = { code, ...data }; }
      })
    };
    await assignHospital(reqAccept, resAccept);
    console.log('Assign status:', resDataAccept?.success ? 'Success' : 'Fail');
    
    // Check preference is marked ACCEPTED
    const finalPrefAccept = await ReferralPreference.findById(prefResult.preference.preferenceId);
    console.log('Final preference status:', finalPrefAccept.status);
    if (finalPrefAccept.status !== 'ACCEPTED') {
      throw new Error('Preference status should have updated to ACCEPTED.');
    }

    // Test 5: reassign to different hospital
    console.log('\n--- Test 5: Reassign to different hospital marks preference as REASSIGNED ---');
    // Reset preference status to PENDING
    finalPrefAccept.status = 'PENDING_WORKER_REVIEW';
    await finalPrefAccept.save();

    const reqReassign = {
      params: { sessionId: session._id.toString() },
      body: { hospitalId: hospital2._id.toString(), reason: 'Reassigned for higher facility capability' },
      user: { _id: new mongoose.Types.ObjectId() }
    };
    let resDataReassign = null;
    const resReassign = {
      json: (data) => { resDataReassign = data; },
      status: (code) => ({
        json: (data) => { resDataReassign = { code, ...data }; }
      })
    };
    await assignHospital(reqReassign, resReassign);
    console.log('Reassign status:', resDataReassign?.success ? 'Success' : 'Fail');

    const finalPrefReassign = await ReferralPreference.findById(prefResult.preference.preferenceId);
    console.log('Final preference status after reassign:', finalPrefReassign.status);
    if (finalPrefReassign.status !== 'REASSIGNED') {
      throw new Error('Preference status should have updated to REASSIGNED.');
    }

    // Clean up
    console.log('\nCleaning up database entries...');
    await Patient.findByIdAndDelete(patient._id);
    await TriageSession.findByIdAndDelete(session._id);
    await Hospital.findByIdAndDelete(hospital1._id);
    await Hospital.findByIdAndDelete(hospital2._id);
    await ReferralPreference.findByIdAndDelete(prefResult.preference.preferenceId);
    console.log('Cleanup complete.');

    console.log('\n✅ ALL PREFERENCE WORKFLOW TESTS PASSED');
    process.exit(0);

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
