# MatriSense Voice Triage: Accessibility Layer QA Checklist

This checklist is for internal testing of the **Speech-to-Text (STT)** and **Text-to-Speech (TTS)** integration in the AI Triage Lab.

## 🎤 Speech-to-Text (STT) Verification
- [ ] **Recording Start**: Clicking 🎙 `বলুন` triggers the microphone permission request (if not granted) and starts the timer.
- [ ] **Recording Animation**: The button pulses (Rose color) while recording is active.
- [ ] **Bangla Transcription**: Speaking a symptom in Bangla (e.g., *"মাথা ব্যথা করছে"*) results in accurate text appearing in the textarea.
- [ ] **Transcribing State**: The button shows a teal spinner and "ট্রান্সক্রাইব..." text while processing.
- [ ] **User Review**: The transcribed text is inserted into the `inputTextBn` textarea, but **DOES NOT** auto-submit.
- [ ] **Instructional Note**: A review note appears below the textarea: *"ভয়েস থেকে পাওয়া লেখা দেখে ঠিক করে নিন, তারপর AI triage চালান।"*
- [ ] **Manual Editing**: User can successfully add or remove text from the transcript before proceeding.
- [ ] **Fault Tolerance**: If the microphone is denied or unsupported, a "Mic Unsupported" badge appears instead of crashing.

## 🔊 Text-to-Speech (TTS) Verification
- [ ] **Follow-up Reading**: Clicking `শুনুন` on a Follow-up Question Card reads the question and options sequentially.
- [ ] **Visual Highlighting (Question)**: The question header highlights (Teal ring/bg) while the question text is being read.
- [ ] **Visual Highlighting (Options)**: Each option highlights (ring/scale effect) specifically when its corresponding text is being read.
- [ ] **Non-Blocking Logic**: Reading does **NOT** auto-select an answer. The user can still click options manually.
- [ ] **Final Result Reading**: The `ফলাফল শুনুন` button on the result card reads out the risk level, explanation, steps, and warnings in order.
- [ ] **Concurrency**: Starting a new read-aloud action automatically stops any previous ongoing speech.
- [ ] **Stop Function**: Clicking `বন্ধ করুন` immediately stops audio and clears all visual highlights.

## 🛡️ Security & Reliability
- [ ] **API Protection**: Verify that the browser's Network tab **DOES NOT** show any Groq API keys in request headers (should go through `/api/speech/transcribe`).
- [ ] **Timeout Handling**: If TTS takes longer than 12 seconds per segment, it automatically skips to the next segment to prevent UI hang.
- [ ] **Puter Fallback**: If Puter.js fails to load or returns an error, the system successfully switches to the browser's `SpeechSynthesis` API.
- [ ] **Offline Resilience**: If the internet is disconnected, the voice UI provides a friendly "Mic access failed" or "Transcription failed" message without breaking the main triage flow.

---
**Status**: Ready for Integration Testing
**Provider**: Groq Whisper (STT) + Puter.js (TTS)
**Last Updated**: 2026-05-11
