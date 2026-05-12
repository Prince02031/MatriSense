/**
 * Groq STT Smoke Test
 * Manually run this to verify backend transcription connectivity.
 * 
 * Usage: node backend/speech/tests/runGroqSttSmokeTest.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { transcribeAudio } = require('../speechToTextService');

async function runTest() {
  console.log('\n🔍 --- Groq STT Smoke Test ---');

  // 1. Check API Key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log('⚠️  SKIPPED: GROQ_API_KEY is missing in backend/.env');
    process.exit(0);
  }

  // 2. Check Sample File
  const samplePath = path.join(__dirname, 'sample-bangla.webm');
  if (!fs.existsSync(samplePath)) {
    console.log('⚠️  SKIPPED: No sample audio file found.');
    console.log(`    Please place a small webm file at: \n    ${samplePath}`);
    process.exit(0);
  }

  console.log('🚀 Sending sample audio to Groq Whisper...');

  try {
    // Mock the multer file object
    const mockFile = {
      path: samplePath,
      originalname: 'sample-bangla.webm',
      mimetype: 'audio/webm',
      size: fs.statSync(samplePath).size
    };

    const result = await transcribeAudio({ file: mockFile, language: 'bn' });

    console.log('\n✅ Transcription Successful!');
    console.log('---------------------------');
    console.log(`Provider: ${result.provider}`);
    console.log(`Model:    ${result.model}`);
    console.log(`Text:     "${result.transcript}"`);
    console.log('---------------------------');

  } catch (error) {
    console.error('\n❌ Transcription Failed!');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

runTest();
