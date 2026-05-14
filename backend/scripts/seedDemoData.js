require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('../src/models/Patient');
const TriageSession = require('../src/models/TriageSession');
const ReferralNote = require('../src/models/ReferralNote');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const testCases = require('../src/triage/tests/testCases.json');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {});
        console.log('MongoDB connected for seeding');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();

        console.log('Clearing old data...');
        await Patient.deleteMany({});
        await TriageSession.deleteMany({});
        await ReferralNote.deleteMany({});
        await User.deleteMany({});
        await AuditLog.deleteMany({});

        console.log('Seeding Demo Users...');
        await User.create({ name: 'Mother Demo', email: 'mother@demo.com', password: 'password', role: 'patient' });
        const demoWorker = await User.create({ name: 'Worker Demo', email: 'worker@demo.com', password: 'password', role: 'worker' });

        console.log('Seeding fake patients and triage sessions...');

        // Seed cases based on testCases.json to give us HIGH, MEDIUM, LOW risks
        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];

            // 1. Create Patient
            const newPatient = await Patient.create({
                name: `Mother ${tc.id}`,
                age: tc.profile.age,
                trimester: tc.profile.trimester,
                gestationalWeek: tc.profile.gestationalWeek,
                phone: '017000000' + (i < 10 ? '0' + i : i),
                knownRiskFactors: tc.profile.riskFactors
            });

            // 2. Create mock decision and llm output
            const decision = {
                riskLevel: tc.expectedRiskLevel,
                recommendedAction: tc.expectedAction,
                matchedRules: tc.expectedMatchedRules,
                allowedGuidanceType: tc.expectedGuidanceType
            };

            const safeOutput = {
                riskLevel: tc.expectedRiskLevel,
                urgency: tc.expectedRiskLevel === 'HIGH' ? "Immediate attention needed" : "Monitor closely",
                motherExplanationBn: "আপনার লক্ষণগুলো আমরা বিশ্লেষণ করেছি।",
                stepsNowBn: tc.expectedRiskLevel === 'HIGH' ? ["দ্রুত স্বাস্থ্যকেন্দ্রে যান"] : ["বিশ্রাম নিন"],
                monitorBn: [],
                urgentWarningBn: []
            };

            // 3. Create Case State
            const caseState = {
                symptoms: tc.confirmedSymptoms,
                dangerSignsChecked: tc.followUpAnswers?.dangerSignsChecked || [],
                trimester: tc.profile.trimester,
                gestationalWeek: tc.profile.gestationalWeek,
                riskFactors: tc.profile.riskFactors,
                followUpAnswers: tc.followUpAnswers
            };

            // Randomize status for the dashboard
            const statuses = ['NEW', 'VIEWED', 'VIEWED', 'CONTACTED', 'REFERRED', 'RESOLVED'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            // Date fuzzing - spread out over the last 3 days
            const fakeDate = new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000));

            const session = await TriageSession.create({
                patientId: newPatient._id,
                inputTextBn: tc.inputBn,
                caseState: caseState,
                decision: decision,
                safeOutput: safeOutput,
                status: randomStatus,
                createdAt: fakeDate,
                updatedAt: fakeDate
            });

            // Seed initial audit log for start
            await AuditLog.create({
                triageSessionId: session._id,
                action: 'Triage run completed',
                actorRole: 'SYSTEM',
                createdAt: new Date(fakeDate.getTime() + 1000)
            });

            // Create some referral notes and corresponding audit logs if status demands it
            if (['CONTACTED', 'REFERRED', 'RESOLVED'].includes(randomStatus)) {
                await AuditLog.create({
                    triageSessionId: session._id,
                    action: 'Case viewed',
                    actorRole: 'WORKER',
                    createdAt: new Date(fakeDate.getTime() + 60000)
                });

                await ReferralNote.create({
                    triageSessionId: session._id,
                    patientId: newPatient._id,
                    actionTaken: randomStatus === 'REFERRED' ? 'URGENT_REFERRAL' : 'CONTACTED',
                    referredTo: randomStatus === 'REFERRED' ? 'Dhaka Medical College' : undefined,
                    note: 'Followed up with the patient based on their reported symptoms.',
                    statusAfterNote: randomStatus,
                    createdAt: new Date(fakeDate.getTime() + 120000)
                });

                await AuditLog.create({
                    triageSessionId: session._id,
                    action: 'Referral note added',
                    actorRole: 'WORKER',
                    details: { actionTaken: randomStatus === 'REFERRED' ? 'URGENT_REFERRAL' : 'CONTACTED' },
                    createdAt: new Date(fakeDate.getTime() + 125000)
                });

                await AuditLog.create({
                    triageSessionId: session._id,
                    action: 'Status updated',
                    actorRole: 'WORKER',
                    details: { status: randomStatus },
                    createdAt: new Date(fakeDate.getTime() + 130000)
                });
            }
        }

        console.log(`Successfully seeded ${testCases.length} mock cases!`);
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
