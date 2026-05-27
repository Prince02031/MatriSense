const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { protect } = require('../middleware/authMiddleware');

// --- Helpers ---
const ALLOWED_TRIMESTER_VALUES = ['first', 'second', 'third', 'unknown'];

const buildPatientData = (body, userId) => {
  const {
    name,
    age,
    phone,
    trimester,
    gestationalWeek,
    expectedDeliveryDate,
    lastCheckupDate,
    knownRiskFactors,
    emergencyContactName,
    emergencyContactPhone,
    addressOrVillage,
    // New location fields
    division,
    district,
    upazilaOrThana,
    latitude,
    longitude,
    locationSource
  } = body;

  const data = {
    name,
    age,
    phone,
    trimester: ALLOWED_TRIMESTER_VALUES.includes(trimester) ? trimester : 'unknown',
    updatedAt: new Date()
  };

  if (gestationalWeek !== undefined) data.gestationalWeek = gestationalWeek;
  if (expectedDeliveryDate) data.expectedDeliveryDate = expectedDeliveryDate;
  if (lastCheckupDate) data.lastCheckupDate = lastCheckupDate;
  if (knownRiskFactors !== undefined) data.knownRiskFactors = knownRiskFactors;
  if (emergencyContactName) data.emergencyContactName = emergencyContactName;
  if (emergencyContactPhone) data.emergencyContactPhone = emergencyContactPhone;
  if (addressOrVillage) data.addressOrVillage = addressOrVillage;
  if (userId) data.userId = userId;

  // Location fields
  if (division) data.division = division;
  if (district) data.district = district;
  if (upazilaOrThana) data.upazilaOrThana = upazilaOrThana;
  if (latitude !== undefined && latitude !== null) data.latitude = latitude;
  if (longitude !== undefined && longitude !== null) data.longitude = longitude;
  if (locationSource) data.locationSource = locationSource;

  return data;
};

// --- Optional auth: attaches userId if token is present, does not reject if absent ---
const softAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return protect(req, res, next);
  }
  next();
};

// POST /api/patients — Create a new patient profile
router.post('/', softAuth, async (req, res) => {
  try {
    const { name, age, trimester } = req.body;

    if (!name || !age || !trimester) {
      return res.status(400).json({
        success: false,
        error: 'name, age, and trimester are required fields.'
      });
    }

    const userId = req.user?._id || null;
    const patientData = buildPatientData(req.body, userId);

    const patient = await Patient.create(patientData);

    res.status(201).json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] POST /api/patients error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create patient profile', message: error.message });
  }
});

// GET /api/patients/me — Get the patient profile linked to the logged-in user
router.get('/me', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });

    if (!patient) {
      return res.status(404).json({ success: false, error: 'No patient profile found for this user.' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] GET /api/patients/me error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve patient profile', message: error.message });
  }
});

// GET /api/patients/:id — Get a patient profile by ID
router.get('/:id', softAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] GET /api/patients/:id error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve patient', message: error.message });
  }
});

// PUT /api/patients/:id — Update a patient profile
router.put('/:id', softAuth, async (req, res) => {
  try {
    const userId = req.user?._id || null;
    const updates = buildPatientData(req.body, userId);

    // Remove undefined keys so we don't unset fields accidentally
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false }
    );

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] PUT /api/patients/:id error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update patient profile', message: error.message });
  }
});

module.exports = router;
