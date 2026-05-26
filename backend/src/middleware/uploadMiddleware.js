const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// --- Constants ---
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

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

// --- Ensure upload directories exist ---
const ensureUploadDirs = () => {
    Object.values(SUB_DIRS).forEach((sub) => {
        const dirPath = path.join(UPLOADS_ROOT, sub);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
};

// Create directories on module load
ensureUploadDirs();

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
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        // Determine subfolder from req.body.ownerType or default to patient
        const ownerType = req.body?.ownerType || 'PATIENT';
        const subDir = SUB_DIRS[ownerType] || SUB_DIRS.PATIENT;
        const destPath = path.join(UPLOADS_ROOT, subDir);

        // Ensure dir exists (idempotent)
        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }

        cb(null, destPath);
    },

    filename: (req, file, cb) => {
        const ownerType = req.body?.ownerType || 'PATIENT';
        const safeName = generateSafeFilename(ownerType, file.originalname);
        cb(null, safeName);
    },
});

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
            next();
        });
    };
};

// --- Exports ---
module.exports = {
    upload,
    handleUploadErrors,
    UPLOADS_ROOT,
    SUB_DIRS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    generateSafeFilename,
    ensureUploadDirs,
};
