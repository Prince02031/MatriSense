const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// --- Constants ---
// Historical sub-folder labels, kept only as a namespace for generated
// filenames (pt_/hw_ prefixes) — files themselves are no longer written to
// disk, they're stored as Buffer data on the UploadedDocument record so
// they're available from any machine sharing the Atlas cluster instead of
// only the machine that received the upload.
const SUB_DIRS = {
    PATIENT: 'patient-documents',
    HEALTH_WORKER: 'healthworker-certifications',
};

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// --- Safe filename generator ---
// Format: <prefix>_<timestamp>_<random8chars><ext>
const generateSafeFilename = (ownerType, originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    const prefix = ownerType === 'HEALTH_WORKER' ? 'hw' : 'pt';
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    return `${prefix}_${timestamp}_${randomSuffix}${ext}`;
};

// --- Storage engine ---
// In-memory: multer buffers the upload as `file.buffer`, which routes then
// persist to `UploadedDocument.fileData` themselves.
const storage = multer.memoryStorage();

// --- File filter ---
const fileFilter = (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `File type "${file.mimetype}" is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`
            ),
            false
        );
    }
};

// --- Multer instance ---
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

// --- Error-handling wrapper ---
// Wraps multer's upload to return friendly JSON errors for size/type violations
const handleUploadErrors = (fieldName = 'file') => {
    return (req, res, next) => {
        const singleUpload = upload.single(fieldName);

        singleUpload(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // Multer-specific errors (e.g. file too large)
                    let message = err.message;
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        message = `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MB size limit.`;
                    }
                    return res.status(400).json({ success: false, error: message });
                }
                // Custom file-filter errors or other errors
                return res.status(400).json({ success: false, error: err.message });
            }

            // Attach a generated storage filename (display/reference only —
            // no longer a real path on disk) for routes to persist as
            // storedFileName, same naming convention as before.
            if (req.file) {
                const ownerType = req.body?.ownerType || 'PATIENT';
                req.file.generatedFileName = generateSafeFilename(ownerType, req.file.originalname);
            }

            next();
        });
    };
};

// --- Exports ---
module.exports = {
    upload,
    handleUploadErrors,
    SUB_DIRS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    generateSafeFilename,
};
