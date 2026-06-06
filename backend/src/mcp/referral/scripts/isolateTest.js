'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { executeToolWrapper } = require('../tools');
const User = require('../../../models/User');
const Patient = require('../../../models/Patient');
const TriageSession = require('../../../models/TriageSession');

const connUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/matrisense';

async function runTest1() {
    await mongoose.connect(connUrl);
    const testPatient = await Patient.findOne({ name: 'Smoke Test Patient' });
    const testSession = await TriageSession.findOne({ status: 'active' });

    const pReq = { role: 'PATIENT', patientId: testPatient._id.toString() };

    const res = await executeToolWrapper('referral_find_hospital_options', {
        sessionId: testSession._id.toString(),
        patientId: testPatient._id.toString(),
        district: 'Dhaka',
        requester: pReq,
        riskLevel: 'MEDIUM',
        patientLocation: { lat: 23.8, lng: 90.3 }
    });

    require('fs').writeFileSync('res_test1.json', JSON.stringify(res, null, 2));
    await mongoose.disconnect();
    process.exit(0);
}
runTest1().catch(console.error);
