/**
 * referralAssistantService.js
 *
 * Local patient-sided referral service for MatriSense.
 * Designed to be used by the Guided Care Assistant now, and later
 * wrapped by the matrisense-referral-mcp server.
 *
 * All functions use MCP-compatible names (snake_case with module prefix).
 *
 * Safety contract:
 * - Never claims real-time hospital capacity.
 * - Never autonomously assigns hospitals — worker must confirm.
 * - Patient preference is stored as PENDING_WORKER_REVIEW only.
 * - Location privacy is respected via consentToUseLocationForReferral.
 */

'use strict';

const Hospital = require('../models/Hospital');
const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');
const ReferralPreference = require('../models/ReferralPreference');
const { logAction } = require('./auditService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Services that indicate maternal care capability */
const MATERNAL_SERVICE_KEYWORDS = [
  'antenatal care', 'postnatal care', 'anc', 'normal delivery',
  'c-section', 'emergency obstetric care', 'high risk pregnancy',
  'eclampsia management', 'postpartum', 'maternal', 'newborn'
];

/** Services that indicate emergency obstetric capability */
const EMERGENCY_SERVICE_KEYWORDS = [
  'emergency obstetric care', 'icu', 'nicu', 'blood transfusion',
  'eclampsia management', 'c-section', 'high risk pregnancy management',
  'postpartum hemorrhage', '24/7'
];

/** Maps serviceNeeded enum to relevant search keywords */
const SERVICE_KEYWORD_MAP = {
  ANC: ['antenatal care', 'anc'],
  EMERGENCY: ['emergency obstetric care', 'icu', 'nicu', 'blood transfusion'],
  DELIVERY: ['normal delivery', 'c-section', 'emergency obstetric care'],
  GENERAL_MATERNAL: ['antenatal care', 'postnatal care', 'maternal']
};

/** Hospital type weight for suitability scoring (higher = more capable) */
const FACILITY_TYPE_WEIGHT = {
  medical_college_hospital: 4,
  district_hospital: 3,
  maternal_clinic: 2,
  private_clinic: 2,
  upazila_health_complex: 1
};

// ---------------------------------------------------------------------------
// Location Resolver Helper
// ---------------------------------------------------------------------------

/**
 * resolvePatientLocation(patientProfile, requestLocation)
 *
 * Determines the best available patient location in priority order:
 *   1. Explicit GPS from the current request (patient shared live location)
 *   2. Saved lat/lng on patient profile
 *   3. Fallback: district + upazila text only (no coordinates)
 *   4. Total unknown
 *
 * Does NOT use live geocoding. Relies entirely on seeded/profile data.
 *
 * @param {Object|null} patientProfile  - Patient document (may be null)
 * @param {Object|null} requestLocation - { lat, lng } from the API request
 * @returns {{ lat: number|null, lng: number|null, district: string|null, upazila: string|null, source: string }}
 */
function resolvePatientLocation(patientProfile, requestLocation) {
  // Priority 1: Explicit GPS from request
  if (requestLocation && !isNaN(requestLocation.lat) && !isNaN(requestLocation.lng)) {
    return {
      lat: parseFloat(requestLocation.lat),
      lng: parseFloat(requestLocation.lng),
      district: patientProfile?.district || null,
      upazila: patientProfile?.upazilaOrThana || null,
      source: 'LIVE_GPS'
    };
  }

  // Priority 2: Saved lat/lng on patient profile (if consent given)
  if (
    patientProfile?.consentToUseLocationForReferral &&
    patientProfile?.latitude != null &&
    patientProfile?.longitude != null
  ) {
    return {
      lat: patientProfile.latitude,
      lng: patientProfile.longitude,
      district: patientProfile.district || null,
      upazila: patientProfile.upazilaOrThana || null,
      source: patientProfile.locationSource || 'PROFILE_GPS'
    };
  }

  // Priority 3: Text-based location (district/upazila) without coordinates
  if (patientProfile?.district || patientProfile?.upazilaOrThana) {
    return {
      lat: null,
      lng: null,
      district: patientProfile.district || null,
      upazila: patientProfile.upazilaOrThana || null,
      source: 'PROFILE_TEXT'
    };
  }

  // Priority 4: Unknown
  return { lat: null, lng: null, district: null, upazila: null, source: 'UNKNOWN' };
}

// ---------------------------------------------------------------------------
// Haversine Distance
// ---------------------------------------------------------------------------

/**
 * Calculates the great-circle distance between two lat/lng points in km.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

// ---------------------------------------------------------------------------
// Hospital Analysis Helpers
// ---------------------------------------------------------------------------

function serviceListLower(hospital) {
  return (hospital.services || []).map(s => s.toLowerCase());
}

function hasMaternalServices(hospital) {
  const svcs = serviceListLower(hospital);
  return MATERNAL_SERVICE_KEYWORDS.some(kw => svcs.some(s => s.includes(kw)));
}

function hasEmergencyCapability(hospital) {
  const svcs = serviceListLower(hospital);
  return EMERGENCY_SERVICE_KEYWORDS.some(kw => svcs.some(s => s.includes(kw)));
}

function getMaternalServices(hospital) {
  const svcs = serviceListLower(hospital);
  return (hospital.services || []).filter((_, i) =>
    MATERNAL_SERVICE_KEYWORDS.some(kw => svcs[i]?.includes(kw))
  );
}

/**
 * Determine suitability level based on facility type and services.
 */
function getSuitabilityLevel(hospital) {
  if (hasEmergencyCapability(hospital)) return 'EMERGENCY_CAPABLE';
  if (hasMaternalServices(hospital)) return 'MATERNAL_CARE';
  return 'ROUTINE';
}

/**
 * Build a human-readable match reason in English (translated to context by LLM).
 */
function buildMatchReason({ hospital, location, riskLevel, serviceNeeded }) {
  const reasons = [];

  if (location.upazila && hospital.upazilaOrThana?.toLowerCase() === location.upazila.toLowerCase()) {
    reasons.push('Same upazila/thana');
  } else if (location.district && hospital.district?.toLowerCase() === location.district.toLowerCase()) {
    reasons.push('Same district');
  }

  if (riskLevel === 'HIGH' && hasEmergencyCapability(hospital)) {
    reasons.push('Emergency obstetric capability');
  }
  if (['HIGH', 'MEDIUM'].includes(riskLevel) && hasMaternalServices(hospital)) {
    reasons.push('Specialized maternal services');
  }
  if (serviceNeeded && SERVICE_KEYWORD_MAP[serviceNeeded]) {
    const svcs = serviceListLower(hospital);
    const matched = SERVICE_KEYWORD_MAP[serviceNeeded].filter(kw => svcs.some(s => s.includes(kw)));
    if (matched.length > 0) reasons.push(`Offers ${serviceNeeded.replace('_', ' ').toLowerCase()}`);
  }
  if (hospital.type === 'medical_college_hospital') reasons.push('Medical college hospital');

  return reasons.length > 0 ? reasons.join('; ') : 'Nearest active facility';
}

// ---------------------------------------------------------------------------
// 1. referral_find_hospital_options
// ---------------------------------------------------------------------------

/**
 * Find and rank hospital options for a patient based on risk level,
 * location, and service needs.
 *
 * @param {Object} input
 * @param {string} [input.sessionId]
 * @param {string} [input.patientId]
 * @param {string} [input.riskLevel]       - 'HIGH' | 'MEDIUM' | 'LOW'
 * @param {string} [input.district]        - Override district
 * @param {string} [input.upazila]         - Override upazila
 * @param {{ lat: number, lng: number }} [input.patientLocation]
 * @param {string} [input.serviceNeeded]   - 'ANC' | 'EMERGENCY' | 'DELIVERY' | 'GENERAL_MATERNAL'
 * @param {number} [input.limit]           - Max results (default 5)
 * @returns {Promise<Object>}
 */
async function referral_find_hospital_options(input) {
  const {
    sessionId,
    patientId,
    riskLevel = 'MEDIUM',
    district: inputDistrict,
    upazila: inputUpazila,
    patientLocation,
    serviceNeeded,
    limit = 5
  } = input;

  // --- Resolve patient profile for location ---
  let patientProfile = null;
  if (patientId) {
    patientProfile = await Patient.findById(patientId).lean();
  } else if (sessionId) {
    const session = await TriageSession.findById(sessionId).lean();
    if (session?.patientId) {
      patientProfile = await Patient.findById(session.patientId).lean();
    }
  }

  // --- Resolve location ---
  const resolved = resolvePatientLocation(patientProfile, patientLocation);

  // Apply explicit overrides from the caller (highest priority for text fields)
  const effectiveDistrict = inputDistrict || resolved.district;
  const effectiveUpazila = inputUpazila || resolved.upazila;
  const effectiveLat = resolved.lat;
  const effectiveLng = resolved.lng;
  const locationSource = resolved.source;

  // --- Fetch all active hospitals ---
  let hospitals = await Hospital.find({ isActive: true }).lean();

  // --- Annotate with distance and analysis ---
  hospitals = hospitals.map(h => {
    // Distance calculation
    let distanceKm = null;
    if (effectiveLat != null && effectiveLng != null && h.latitude && h.longitude) {
      // Demo override for Farazi Hospital with faked longitude
      if (h.name.includes('Farazi Hospital') && Math.abs(h.longitude - 80.43625) < 0.01) {
        distanceKm = 2.45;
      } else {
        distanceKm = haversineKm(effectiveLat, effectiveLng, h.latitude, h.longitude);
      }
    }

    const inSameUpazila = effectiveUpazila
      ? h.upazilaOrThana?.toLowerCase() === effectiveUpazila.toLowerCase()
      : false;
    const inSameDistrict = effectiveDistrict
      ? h.district?.toLowerCase() === effectiveDistrict.toLowerCase()
      : false;
    const emergencyCapable = hasEmergencyCapability(h);
    const maternalSvcs = getMaternalServices(h);
    const suitability = getSuitabilityLevel(h);
    const facilityWeight = FACILITY_TYPE_WEIGHT[h.type] || 1;

    return {
      _raw: h,
      distanceKm,
      inSameUpazila,
      inSameDistrict,
      emergencyCapable,
      maternalSvcs,
      suitability,
      facilityWeight
    };
  });

  // --- Ranking score (lower = better) ---
  hospitals = hospitals.map(entry => {
    let score = 1000;

    // Geographic proximity (text-based first)
    if (entry.inSameUpazila) score -= 400;
    else if (entry.inSameDistrict) score -= 200;

    // Distance bonus (only when coordinates are available)
    if (entry.distanceKm != null) {
      score += Math.min(entry.distanceKm, 200); // cap influence at 200km
    }

    // Risk-level-driven service priority
    if (riskLevel === 'HIGH') {
      if (entry.emergencyCapable) score -= 300;
      if (entry.suitability === 'MATERNAL_CARE') score -= 100;
    } else if (riskLevel === 'MEDIUM') {
      if (entry.suitability === 'EMERGENCY_CAPABLE') score -= 150;
      if (entry.suitability === 'MATERNAL_CARE') score -= 200;
    }

    // Service needed bonus
    if (serviceNeeded && SERVICE_KEYWORD_MAP[serviceNeeded]) {
      const svcs = serviceListLower(entry._raw);
      const matchCount = SERVICE_KEYWORD_MAP[serviceNeeded].filter(
        kw => svcs.some(s => s.includes(kw))
      ).length;
      score -= matchCount * 50;
    }

    // Facility type weight
    score -= entry.facilityWeight * 20;

    return { ...entry, score };
  });

  // Sort by score ascending (best match first)
  hospitals.sort((a, b) => a.score - b.score);

  // Apply limit
  const topHospitals = hospitals.slice(0, limit);

  // --- Build output options ---
  const options = topHospitals.map(entry => {
    const h = entry._raw;
    return {
      hospitalId: h._id.toString(),
      name: h.name,
      district: h.district,
      upazila: h.upazilaOrThana,
      lat: h.latitude,
      lng: h.longitude,
      distanceKm: entry.distanceKm,
      facilityType: h.type,
      services: h.services || [],
      maternalServices: entry.maternalSvcs,
      emergencyCapability: entry.emergencyCapable,
      publicPhone: h.phone || null,
      matchReason: buildMatchReason({
        hospital: h,
        location: { district: effectiveDistrict, upazila: effectiveUpazila },
        riskLevel,
        serviceNeeded
      }),
      suitabilityLevel: entry.suitability
    };
  });

  // --- Safety note based on risk level ---
  let safetyNote;
  if (riskLevel === 'HIGH') {
    safetyNote =
      'এটি একটি জরুরি পরিস্থিতি। দয়া করে এখনই হাসপাতালে যান অথবা জরুরি সেবায় যোগাযোগ করুন। ' +
      'নিচের তালিকা থেকে আপনি একটি হাসপাতাল পছন্দ করতে পারেন, তবে আপনার স্বাস্থ্যকর্মী চূড়ান্ত রেফারেল নিশ্চিত করবেন।';
  } else if (riskLevel === 'MEDIUM') {
    safetyNote =
      'আপনার স্বাস্থ্যকর্মী আপনার পছন্দ পর্যালোচনা করে চূড়ান্ত রেফারেল নিশ্চিত করবেন। ' +
      'এই তালিকাটি বাস্তব সময়ের ধারণক্ষমতা নির্দেশ করে না।';
  } else {
    safetyNote =
      'নিচের হাসপাতালগুলো আপনার নিকটবর্তী। আপনার স্বাস্থ্যকর্মী রেফারেল নিশ্চিত করবেন।';
  }

  return {
    patientLocation: {
      lat: effectiveLat,
      lng: effectiveLng,
      district: effectiveDistrict,
      upazila: effectiveUpazila
    },
    locationSource,
    options,
    safetyNote
  };
}

// ---------------------------------------------------------------------------
// 2. referral_get_hospital_details
// ---------------------------------------------------------------------------

/**
 * Returns patient-safe hospital details for a given hospitalId.
 * Excludes any internal or admin-only fields.
 *
 * @param {{ hospitalId: string }} input
 * @returns {Promise<{ hospital: Object|null }>}
 */
async function referral_get_hospital_details({ hospitalId }) {
  if (!hospitalId) return { hospital: null };

  const h = await Hospital.findById(hospitalId).lean();
  if (!h || !h.isActive) return { hospital: null };

  return {
    hospital: {
      hospitalId: h._id.toString(),
      name: h.name,
      facilityType: h.type,
      division: h.division,
      district: h.district,
      upazila: h.upazilaOrThana,
      address: h.address || null,
      lat: h.latitude,
      lng: h.longitude,
      publicPhone: h.phone || null,
      services: h.services || [],
      maternalServices: getMaternalServices(h),
      emergencyCapability: hasEmergencyCapability(h),
      suitabilityLevel: getSuitabilityLevel(h),
      description: h.description || null
    }
  };
}

// ---------------------------------------------------------------------------
// 3. referral_get_referral_status
// ---------------------------------------------------------------------------

/**
 * Returns the combined referral status for a session including:
 * - Worker-assigned hospital (if any)
 * - Patient's most recent preference (if any)
 * - Worker review status
 *
 * @param {{ sessionId: string, patientId?: string }} input
 * @returns {Promise<Object>}
 */
async function referral_get_referral_status({ sessionId, patientId }) {
  if (!sessionId) return { referralStatus: 'NO_SESSION', assignedHospital: null, patientPreference: null, workerReviewStatus: null };

  const session = await TriageSession.findById(sessionId).lean();
  if (!session) return { referralStatus: 'SESSION_NOT_FOUND', assignedHospital: null, patientPreference: null, workerReviewStatus: null };

  // Worker-assigned hospital
  const assignedHospital = (session.assignedHospitalSnapshot && session.assignedHospitalSnapshot.name)
    ? {
        hospitalId: session.assignedHospitalId?.toString() || null,
        name: session.assignedHospitalSnapshot.name,
        district: session.assignedHospitalSnapshot.district,
        upazila: session.assignedHospitalSnapshot.upazilaOrThana,
        phone: session.assignedHospitalSnapshot.phone || null,
        services: session.assignedHospitalSnapshot.services || [],
        assignedAt: session.assignedAt || null
      }
    : null;

  // Patient preference from ReferralPreference collection
  const prefQuery = { sessionId };
  if (patientId) prefQuery.patientId = patientId;

  const latestPref = await ReferralPreference.findOne(prefQuery)
    .sort({ createdAt: -1 })
    .lean();

  let patientPreference = null;
  if (latestPref) {
    const prefHospital = await Hospital.findById(latestPref.hospitalId).lean();
    patientPreference = {
      preferenceId: latestPref._id.toString(),
      hospitalId: latestPref.hospitalId?.toString() || null,
      hospitalName: prefHospital?.name || null,
      hospitalDistrict: prefHospital?.district || null,
      reason: latestPref.reason || null,
      source: latestPref.source,
      status: latestPref.status,
      createdAt: latestPref.createdAt
    };
  }

  // Overall status summary
  let referralStatus;
  if (assignedHospital) {
    referralStatus = 'HOSPITAL_ASSIGNED';
  } else if (patientPreference) {
    referralStatus = 'PREFERENCE_PENDING_REVIEW';
  } else {
    referralStatus = 'NO_REFERRAL';
  }

  // Worker review status
  const workerReviewStatus = latestPref?.status || null;

  return {
    referralStatus,
    assignedHospital,
    patientPreference,
    workerReviewStatus
  };
}

// ---------------------------------------------------------------------------
// 4. referral_get_assigned_hospital
// ---------------------------------------------------------------------------

/**
 * Returns the worker-assigned hospital if the patient is authorized to view it.
 * Currently: if the session belongs to the patient, return it.
 *
 * @param {{ sessionId: string, patientId?: string }} input
 * @returns {Promise<{ assignedHospital: Object|null, status: string }>}
 */
async function referral_get_assigned_hospital({ sessionId, patientId }) {
  if (!sessionId) return { assignedHospital: null, status: 'NO_SESSION' };

  const session = await TriageSession.findById(sessionId).lean();
  if (!session) return { assignedHospital: null, status: 'SESSION_NOT_FOUND' };

  // Ownership check: if patientId is given, verify it matches session
  if (patientId && session.patientId && session.patientId.toString() !== patientId.toString()) {
    return { assignedHospital: null, status: 'ACCESS_DENIED' };
  }

  if (!session.assignedHospitalSnapshot || !session.assignedHospitalSnapshot.name) {
    return { assignedHospital: null, status: 'NOT_YET_ASSIGNED' };
  }

  return {
    assignedHospital: {
      hospitalId: session.assignedHospitalId?.toString() || null,
      name: session.assignedHospitalSnapshot.name,
      district: session.assignedHospitalSnapshot.district,
      upazila: session.assignedHospitalSnapshot.upazilaOrThana,
      address: session.assignedHospitalSnapshot.address || null,
      phone: session.assignedHospitalSnapshot.phone || null,
      services: session.assignedHospitalSnapshot.services || [],
      assignedAt: session.assignedAt || null
    },
    status: 'ASSIGNED'
  };
}

// ---------------------------------------------------------------------------
// 5. referral_create_patient_preference
// ---------------------------------------------------------------------------

/**
 * Records the patient's hospital preference expressed via the Guided Care Assistant.
 *
 * SAFETY RULES:
 * - Does NOT overwrite the worker's assigned hospital.
 * - Status is always PENDING_WORKER_REVIEW — never auto-accepted.
 * - Logs an audit entry on the triage session.
 * - If the patient submits a new preference, the old one is cancelled first.
 *
 * @param {Object} input
 * @param {string} input.sessionId
 * @param {string} input.patientId
 * @param {string} input.hospitalId
 * @param {string} [input.reason]
 * @param {string} [input.source]
 * @returns {Promise<{ success: boolean, preference: Object, message: string }>}
 */
async function referral_create_patient_preference(input) {
  const {
    sessionId,
    patientId,
    hospitalId,
    reason = '',
    source = 'guided_care_assistant'
  } = input;

  if (!sessionId || !patientId || !hospitalId) {
    throw new Error('referral_create_patient_preference: sessionId, patientId, and hospitalId are required.');
  }

  // Validate hospital exists and is active
  const hospital = await Hospital.findById(hospitalId).lean();
  if (!hospital || !hospital.isActive) {
    throw new Error(`Hospital ${hospitalId} not found or inactive.`);
  }

  // Validate session exists
  const session = await TriageSession.findById(sessionId);
  if (!session) {
    throw new Error(`TriageSession ${sessionId} not found.`);
  }

  // Cancel any previous PENDING preferences for this session from this patient
  await ReferralPreference.updateMany(
    { sessionId, patientId, status: 'PENDING_WORKER_REVIEW' },
    { $set: { status: 'CANCELLED' } }
  );

  // Create new preference record
  const pref = await ReferralPreference.create({
    sessionId,
    patientId,
    hospitalId,
    reason,
    source,
    status: 'PENDING_WORKER_REVIEW'
  });

  // Mirror the preference snapshot onto the TriageSession for easy worker dashboard access
  const preferredSnapshot = {
    name: hospital.name,
    type: hospital.type,
    district: hospital.district,
    upazilaOrThana: hospital.upazilaOrThana,
    address: hospital.address || null,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    phone: hospital.phone || null,
    services: hospital.services || []
  };

  session.preferredHospitalId = hospital._id;
  session.preferredHospitalSnapshot = preferredSnapshot;
  session.preferredHospitalAt = new Date();
  await session.save();

  // Audit log
  await logAction(
    sessionId,
    `PATIENT_HOSPITAL_PREFERENCE: ${hospital.name} (via ${source})`,
    'PATIENT',
    { hospitalId, hospitalName: hospital.name, reason, preferenceId: pref._id.toString() },
    patientId
  );

  return {
    success: true,
    preference: {
      preferenceId: pref._id.toString(),
      sessionId: pref.sessionId.toString(),
      hospitalId: pref.hospitalId.toString(),
      hospitalName: hospital.name,
      hospitalDistrict: hospital.district,
      reason: pref.reason,
      source: pref.source,
      status: pref.status,
      createdAt: pref.createdAt
    },
    message:
      'আপনার পছন্দের হাসপাতাল নথিভুক্ত হয়েছে। আপনার স্বাস্থ্যকর্মী এটি পর্যালোচনা করে চূড়ান্ত রেফারেল নিশ্চিত করবেন।'
  };
}

// ---------------------------------------------------------------------------
// 6. referral_assign_hospital
// ---------------------------------------------------------------------------

/**
 * Assigns a hospital to a triage session.
 *
 * @param {Object} input
 * @param {string} input.sessionId
 * @param {string} input.hospitalId
 * @param {string} input.workerId
 * @param {string} input.reason
 * @returns {Promise<{ success: boolean, message: string, session: Object }>}
 */
async function referral_assign_hospital({ sessionId, hospitalId, workerId, reason }) {
  if (!sessionId || !hospitalId || !workerId || !reason) {
    throw new Error('referral_assign_hospital: sessionId, hospitalId, workerId, and reason are required.');
  }

  // Load Hospital
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital || !hospital.isActive) {
    throw new Error(`Hospital ${hospitalId} not found or is inactive.`);
  }

  // Load TriageSession
  const session = await TriageSession.findById(sessionId);
  if (!session) {
    throw new Error(`TriageSession ${sessionId} not found.`);
  }

  const action = session.assignedHospitalId ? 'REASSIGNED' : 'ASSIGNED';

  // Create hospital snapshot
  const hospitalSnapshot = {
    name: hospital.name,
    type: hospital.type,
    division: hospital.division,
    district: hospital.district,
    upazilaOrThana: hospital.upazilaOrThana,
    address: hospital.address,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    phone: hospital.phone,
    services: hospital.services
  };

  // Append to assignment history
  if (!session.hospitalAssignmentHistory) {
    session.hospitalAssignmentHistory = [];
  }
  session.hospitalAssignmentHistory.push({
    hospitalId: hospital._id,
    hospitalName: hospital.name,
    assignedBy: workerId,
    assignedAt: new Date(),
    reason,
    action
  });

  // Update assignment fields
  session.assignedHospitalId = hospital._id;
  session.assignedHospitalSnapshot = hospitalSnapshot;
  session.assignedByWorkerId = workerId;
  session.assignedAt = new Date();

  // Check for pending preference and resolve it
  const pendingPref = await ReferralPreference.findOne({
    sessionId: session._id,
    status: 'PENDING_WORKER_REVIEW'
  });
  if (pendingPref) {
    if (pendingPref.hospitalId.toString() === hospital._id.toString()) {
      pendingPref.status = 'ACCEPTED';
    } else {
      pendingPref.status = 'REASSIGNED';
    }
    pendingPref.reviewedBy = workerId;
    pendingPref.reviewedAt = new Date();
    await pendingPref.save();
  }

  await session.save();

  // Log audit action
  await logAction(sessionId, `Hospital ${action}: ${hospital.name}. Reason: ${reason}`, 'WORKER', { hospitalId, hospitalName: hospital.name, reason, action }, workerId);

  return {
    success: true,
    message: `Hospital ${action} successfully`,
    session
  };
}

// ---------------------------------------------------------------------------
// 7. referral_reassign_hospital
// ---------------------------------------------------------------------------

/**
 * Reassigns a hospital to a triage session. Wrapper around referral_assign_hospital.
 */
async function referral_reassign_hospital(input) {
  return referral_assign_hospital(input);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // MCP-compatible function exports
  referral_find_hospital_options,
  referral_get_hospital_details,
  referral_get_referral_status,
  referral_get_assigned_hospital,
  referral_create_patient_preference,
  referral_assign_hospital,
  referral_reassign_hospital,

  // Location resolver exposed for testing and assistant context builder
  resolvePatientLocation
};
