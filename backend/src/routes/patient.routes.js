const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const UploadedDocument = require('../models/UploadedDocument');
const { protect } = require('../middleware/authMiddleware');
const { handleUploadErrors } = require('../middleware/uploadMiddleware');

// --- Constants ---
const ALLOWED_TRIMESTER_VALUES = ['first', 'second', 'third', 'unknown'];

const ALLOWED_PATIENT_DOC_TYPES = [
  'NATIONAL_ID',
  'BIRTH_CERTIFICATE',
  'PREVIOUS_MEDICAL_REPORT',
  'PRESCRIPTION',
  'ULTRASOUND_REPORT',
  'LAB_REPORT',
  'OTHER_MEDICAL_DOCUMENT',
];

/**
 * Full list of patient-editable fields.
 * Only these keys are picked from req.body — everything else is ignored.
 */
const EDITABLE_FIELDS = [
  // Core / maternal
  'name',
  'age',
  'phone',
  'email',
  'trimester',
  'gestationalWeek',
  'expectedDeliveryDate',
  'lastCheckupDate',
  'knownRiskFactors',
  'emergencyContactName',
  'emergencyContactPhone',

  // Location
  'division',
  'district',
  'upazilaOrThana',
  'addressOrVillage',
  'latitude',
  'longitude',
  'locationSource',

  // Identity (optional)
  'nationalIdNumber',
  'birthCertificateNumber',

  // Consent
  'consentToShareWithHealthWorker',
  'consentToUseLocationForReferral',
  'consentToStoreDocuments',
];

/**
 * Fields returned to the client for documents.
 * storagePath is intentionally excluded for security.
 */
const SAFE_DOC_FIELDS = [
  '_id',
  'ownerType',
  'ownerId',
  'uploadedByUserId',
  'relatedSessionId',
  'documentType',
  'title',
  'description',
  'originalName',
  'storedFileName',
  'mimeType',
  'sizeBytes',
  'accessScope',
  'verificationStatus',
  'isActive',
  'uploadedAt',
];

// --- Helpers ---

/**
 * Build a safe update/create object from the request body.
 * Only whitelisted fields are included.
 */
const buildPatientData = (body, userId) => {
  const data = {};

  EDITABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  });

  // Normalize trimester
  if (data.trimester) {
    data.trimester = ALLOWED_TRIMESTER_VALUES.includes(data.trimester)
      ? data.trimester
      : 'unknown';
  }

  // Attach userId if available
  if (userId) data.userId = userId;

  // Mark update timestamp
  data.updatedAt = new Date();

  return data;
};

const { logAction } = require('../services/auditService');

/**
 * Project safe doc fields from a document object (strip storagePath).
 */
const toSafeDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const safe = {};
  SAFE_DOC_FIELDS.forEach((f) => {
    if (obj[f] !== undefined) safe[f] = obj[f];
  });
  return safe;
};

/**
 * Pre-multer middleware: inject ownerType=PATIENT into the body so that
 * uploadMiddleware routes the file to the patient-documents subfolder.
 */
const injectPatientOwnerType = (req, _res, next) => {
  // req.body may not exist yet for multipart; create it
  if (!req.body) req.body = {};
  req.body.ownerType = 'PATIENT';
  next();
};

// --- Optional auth: attaches userId if token is present, does not reject if absent ---
const softAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return protect(req, res, next);
  }
  next();
};

// ============================================================================
// POST /api/patients — Create a new patient profile
// ============================================================================
router.post('/', softAuth, async (req, res) => {
  try {
    const { name, age, trimester } = req.body;

    if (!name || !age || !trimester) {
      return res.status(400).json({
        success: false,
        error: 'name, age, and trimester are required fields.',
      });
    }

    const userId = req.user?._id || null;
    const patientData = buildPatientData(req.body, userId);

    const patient = await Patient.create(patientData);

    await logAction(null, 'PATIENT_PROFILE_CREATED', 'PATIENT', { patientId: patient._id }, userId);

    res.status(201).json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] POST /api/patients error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create patient profile',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/patients/me — Get the full patient profile for the logged-in mother
// ============================================================================
router.get('/me', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, error: 'No patient profile found for this user.' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] GET /api/patients/me error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient profile',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/patients/me/documents — Upload a document for the logged-in patient
// ============================================================================
router.post(
  '/me/documents',
  protect,
  injectPatientOwnerType,
  handleUploadErrors('file'),
  async (req, res) => {
    try {
      // --- Find patient profile ---
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'No patient profile found. Create a profile before uploading documents.',
        });
      }

      // --- Validate file was received ---
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Send a file in the "file" field.',
        });
      }

      // --- Validate documentType ---
      const { documentType, title, description, relatedSessionId } = req.body;
      if (!documentType || !ALLOWED_PATIENT_DOC_TYPES.includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: `documentType is required and must be one of: ${ALLOWED_PATIENT_DOC_TYPES.join(', ')}`,
        });
      }

      // --- Create UploadedDocument record ---
      const doc = await UploadedDocument.create({
        ownerType: 'PATIENT',
        ownerId: patient._id,
        uploadedByUserId: req.user._id,
        relatedSessionId: relatedSessionId || undefined,
        documentType,
        title: title || req.file.originalname,
        description: description || '',
        originalName: req.file.originalname,
        storedFileName: req.file.filename,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        accessScope: 'PATIENT_AND_ASSIGNED_HEALTH_WORKER',
        verificationStatus: 'NOT_REQUIRED',
        isActive: true,
      });

      // --- Audit ---
      await logAction(null, 'PATIENT_DOCUMENT_UPLOADED', 'PATIENT', {
        patientId: patient._id,
        documentId: doc._id,
        documentType,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
      }, req.user._id);

      res.status(201).json({ success: true, document: toSafeDoc(doc) });
    } catch (error) {
      console.error('[PatientRoutes] POST /me/documents error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to upload document',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// GET /api/patients/me/documents — List active documents for the logged-in patient
// ============================================================================
router.get('/me/documents', protect, async (req, res) => {
  try {
    // --- Find patient profile ---
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'No patient profile found for this user.',
      });
    }

    // --- Fetch active documents belonging to this patient ---
    const docs = await UploadedDocument.find({
      ownerId: patient._id,
      ownerType: 'PATIENT',
      isActive: true,
    }).sort({ uploadedAt: -1 });

    res.json({
      success: true,
      documents: docs.map(toSafeDoc),
      total: docs.length,
    });
  } catch (error) {
    console.error('[PatientRoutes] GET /me/documents error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents',
      message: error.message,
    });
  }
});

// ============================================================================
// DELETE /api/patients/me/documents/:documentId — Soft-delete a patient document
// ============================================================================
router.delete('/me/documents/:documentId', protect, async (req, res) => {
  try {
    // --- Find patient profile ---
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'No patient profile found for this user.',
      });
    }

    // --- Find the document and verify ownership ---
    const doc = await UploadedDocument.findOne({
      _id: req.params.documentId,
      ownerId: patient._id,
      ownerType: 'PATIENT',
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or you do not have access.',
      });
    }

    if (!doc.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Document has already been deleted.',
      });
    }

    // --- Soft delete ---
    doc.isActive = false;
    await doc.save();

    // --- Audit ---
    await logAction(null, 'PATIENT_DOCUMENT_DELETED', 'PATIENT', {
      patientId: patient._id,
      documentId: doc._id,
      documentType: doc.documentType,
      originalName: doc.originalName,
    }, req.user._id);

    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('[PatientRoutes] DELETE /me/documents/:documentId error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/patients/:id — Get a patient profile by ID (soft-auth)
// ============================================================================
router.get('/:id', softAuth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] GET /api/patients/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve patient',
      message: error.message,
    });
  }
});

// ============================================================================
// PUT /api/patients/:id — Update a patient profile (ownership-protected)
// ============================================================================
router.put('/:id', protect, async (req, res) => {
  try {
    // --- Ownership check ---
    // Fetch patient first to verify the caller owns this profile.
    const existing = await Patient.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Patient not found.' });
    }

    // If the patient has a linked userId, only that user (or an admin) may edit.
    if (existing.userId) {
      const callerId = req.user._id.toString();
      const ownerId = existing.userId.toString();
      const isAdmin = req.user.role === 'ADMIN';

      if (callerId !== ownerId && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to edit this patient profile.',
        });
      }
    }

    // --- Build update payload ---
    const updates = buildPatientData(req.body, null); // don't overwrite userId

    // Remove undefined keys so we don't unset fields accidentally
    Object.keys(updates).forEach((k) => {
      if (updates[k] === undefined) delete updates[k];
    });

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false }
    );

    // --- Audit ---
    await logAction(null, 'PATIENT_PROFILE_UPDATED', req.user.role, {
      patientId: req.params.id,
      updatedFields: Object.keys(updates).filter((k) => k !== 'updatedAt'),
    }, req.user._id);

    res.json({ success: true, patient });
  } catch (error) {
    console.error('[PatientRoutes] PUT /api/patients/:id error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update patient profile',
      message: error.message,
    });
  }
});

module.exports = router;
