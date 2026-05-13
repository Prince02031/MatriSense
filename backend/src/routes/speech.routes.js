const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('../speech');

// Configure Multer for temporary storage
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

/**
 * POST /api/speech/transcribe
 * Transcribes an uploaded audio file using the configured STT provider.
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided in the "audio" field.' });
    }

    const language = req.body.language || 'bn';

    // Call the centralized STT service
    const result = await transcribeAudio({ 
      file: req.file, 
      language 
    });

    // Cleanup: Remove temporary file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Success Response
    res.json({
      transcript: result.transcript,
      provider: result.provider,
      model: result.model
    });

  } catch (error) {
    console.error('[SpeechRoute] Transcription Error:', error.message);

    // Cleanup on failure
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Transcription failed', 
      message: error.message 
    });
  }
});

module.exports = router;
