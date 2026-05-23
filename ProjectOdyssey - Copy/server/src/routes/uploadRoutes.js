const router = require("express").Router();
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabaseClient");
const authMiddleware = require("../middleware/authMiddleware");

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only images are allowed"));
        }
    },
});

/**
 * POST /api/upload
 * Upload an image to Supabase Storage
 * Body: multipart/form-data with 'image' field
 */
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const userId = req.user.id;
        const file = req.file;
        const fileExt = file.originalname.split(".").pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
        const bucketName = "reviews";

        // 1. Ensure bucket exists (Check if we can access it, if not try to create)
        // Note: Creating buckets via API requires service_role key. 
        // If using anon key, this might fail if bucket doesn't exist.
        // We assume bucket 'reviews' exists or we try to create it if we have permissions.
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        let bucketExists = false;
        if (buckets) {
            bucketExists = buckets.some(b => b.name === bucketName);
        }

        if (!bucketExists) {
            // Try to create bucket (might fail if no permissions)
            const { error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true
            });
            if (createError) {
                console.warn("Could not create bucket (might need manual creation):", createError.message);
            }
        }

        // 2. Upload file
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            console.error("Supabase storage upload error:", error);
            return res.status(500).json({ error: `Upload failed: ${error.message}` });
        }

        // 3. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return res.status(201).json({
            success: true,
            message: "Image uploaded successfully",
            imageUrl: publicUrlData.publicUrl,
        });

    } catch (err) {
        console.error("POST /api/upload error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});

module.exports = router;
