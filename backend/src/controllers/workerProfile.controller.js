const User = require('../models/User');
const UploadedDocument = require('../models/UploadedDocument');

// --- Constants ---

const EDITABLE_PROFILE_FIELDS = [
    'name',
    'phone',
    'email',
    'professionalTitle',
    'organizationName',
    'workplaceName',
    'registrationNumber',
    'certificationType',
    'yearsOfExperience',
    'coverageDistricts',
    'coverageUpazilas',
];

const ALLOWED_CERT_DOC_TYPES = [
    'MEDICAL_CERTIFICATE',
    'NURSING_CERTIFICATE',
    'COMMUNITY_HEALTH_WORKER_CERTIFICATE',
    'BMDC_OR_PROFESSIONAL_REGISTRATION',
    'ORGANIZATION_ID',
    'TRAINING_CERTIFICATE',
    'OTHER_CERTIFICATION',
];

/**
 * Fields safe to return in profile responses.
 * Excludes passwordHash and internal fields.
 */
const SAFE_PROFILE_FIELDS = [
    '_id',
    'name',
    'phone',
    'email',
    'role',
    'isActive',
    'professionalTitle',
    'organizationName',
    'workplaceName',
    'registrationNumber',
    'certificationType',
    'yearsOfExperience',
    'coverageDistricts',
    'coverageUpazilas',
    'certificationStatus',
    'certificationSubmittedAt',
    'verifiedAt',
    'verificationNote',
    'createdAt',
    'updatedAt',
];

/**
 * Fields safe to return for document metadata.
 * Excludes storagePath for security.
 */
const SAFE_DOC_FIELDS = [
    '_id',
    'ownerType',
    'ownerId',
    'uploadedByUserId',
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

const toSafeProfile = (user) => {
    const obj = user.toObject ? user.toObject() : user;
    const safe = {};
    SAFE_PROFILE_FIELDS.forEach((f) => {
        if (obj[f] !== undefined) safe[f] = obj[f];
    });
    return safe;
};

const toSafeDoc = (doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    const safe = {};
    SAFE_DOC_FIELDS.forEach((f) => {
        if (obj[f] !== undefined) safe[f] = obj[f];
    });
    return safe;
};

const { logAction } = require('../services/auditService');

// ============================================================================
// GET /api/worker/profile/me — Get the logged-in health worker's profile
// ============================================================================
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.',
            });
        }

        res.json({ success: true, profile: toSafeProfile(user) });
    } catch (error) {
        console.error('[WorkerProfile] GET /profile/me error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile.',
        });
    }
};

// ============================================================================
// PUT /api/worker/profile/me — Update the logged-in health worker's profile
// ============================================================================
exports.updateProfile = async (req, res) => {
    try {
        const updates = {};

        // Pick only allowed fields
        EDITABLE_PROFILE_FIELDS.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // SECURITY: Never allow the user to set certificationStatus to VERIFIED
        // (or any verification lifecycle field) through this endpoint.
        delete updates.certificationStatus;
        delete updates.certificationSubmittedAt;
        delete updates.verifiedAt;
        delete updates.verifiedByAdminId;
        delete updates.verificationNote;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update.',
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: false }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.',
            });
        }

        // Audit
        await logAction(null, 'HEALTH_WORKER_PROFILE_UPDATED', req.user.role, {
            updatedFields: Object.keys(updates),
        }, req.user._id);

        res.json({ success: true, profile: toSafeProfile(user) });
    } catch (error) {
        console.error('[WorkerProfile] PUT /profile/me error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile.',
        });
    }
};

// ============================================================================
// POST /api/worker/profile/certification — Upload certification document
// ============================================================================
exports.uploadCertification = async (req, res) => {
    try {
        // --- Validate file was received ---
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded. Send a file in the "file" field.',
            });
        }

        // --- Validate documentType ---
        const { documentType, title, description } = req.body;
        if (!documentType || !ALLOWED_CERT_DOC_TYPES.includes(documentType)) {
            return res.status(400).json({
                success: false,
                error: `documentType is required and must be one of: ${ALLOWED_CERT_DOC_TYPES.join(', ')}`,
            });
        }

        // --- Create UploadedDocument record ---
        const doc = await UploadedDocument.create({
            ownerType: 'HEALTH_WORKER',
            ownerId: req.user._id,
            uploadedByUserId: req.user._id,
            documentType,
            title: title || req.file.originalname,
            description: description || '',
            originalName: req.file.originalname,
            storedFileName: req.file.filename,
            storagePath: req.file.path,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            accessScope: 'OWNER_AND_ADMIN',
            verificationStatus: 'PENDING',
            isActive: true,
        });

        // --- Update User verification lifecycle ---
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                certificationStatus: 'PENDING',
                certificationSubmittedAt: new Date(),
            },
        });

        // --- Audit ---
        await logAction(null, 'HEALTH_WORKER_CERTIFICATION_UPLOADED', req.user.role, {
            documentId: doc._id,
            documentType,
            originalName: req.file.originalname,
            sizeBytes: req.file.size,
        }, req.user._id);
        await logAction(null, 'HEALTH_WORKER_VERIFICATION_PENDING', req.user.role, {
            documentId: doc._id,
        }, req.user._id);

        res.status(201).json({ success: true, document: toSafeDoc(doc) });
    } catch (error) {
        console.error('[WorkerProfile] POST /profile/certification error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to upload certification.',
        });
    }
};

// ============================================================================
// GET /api/worker/profile/certification — List active certification documents
// ============================================================================
exports.getCertifications = async (req, res) => {
    try {
        const docs = await UploadedDocument.find({
            ownerId: req.user._id,
            ownerType: 'HEALTH_WORKER',
            isActive: true,
        }).sort({ uploadedAt: -1 });

        res.json({
            success: true,
            documents: docs.map(toSafeDoc),
            total: docs.length,
        });
    } catch (error) {
        console.error('[WorkerProfile] GET /profile/certification error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve certifications.',
        });
    }
};
