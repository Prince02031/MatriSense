/**
 * ttsService
 * Utility to handle Text-to-Speech (TTS) for MatriSense.
 */

let currentAudio = null;

export const isTtsSupported = () => {
  return (
    (window.puter && window.puter.ai && typeof window.puter.ai.txt2speech === 'function') ||
    'speechSynthesis' in window
  );
};

export const stopSpeaking = () => {
  if (currentAudio) {
    try { currentAudio.pause(); } catch(e) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * speakTextSegment
 * Aggressively ensures audio plays or falls back to browser TTS.
 */
export const speakTextSegment = (text, options = {}) => {
  return new Promise(async (resolve) => {
    if (!text) return resolve();

    const { rate = 1.0, pitch = 1.0, language = 'bn-BD' } = options;
    let finished = false;

    const onFinish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    // Safety timeout: Never wait more than 8 seconds for a segment
    setTimeout(onFinish, 8000);

    // 1. Try Puter.js (v2)
    if (window.puter && window.puter.ai) {
      try {
        const audio = await window.puter.ai.txt2speech(text, language);
        if (audio) {
          currentAudio = audio;
          audio.onended = onFinish;
          audio.onerror = (e) => {
             console.error('[TTSService] Puter Audio Error:', e);
             runFallback(text, language, rate, pitch, onFinish);
          };
          
          // Play with fallback if it doesn't start in 2 seconds
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.warn('[TTSService] Puter Autoplay blocked:', err);
              runFallback(text, language, rate, pitch, onFinish);
            });
          }
          
          // If not playing in 2 seconds, move to fallback
          setTimeout(() => {
            if (!finished && audio.paused) {
               console.warn('[TTSService] Puter silent, falling back.');
               runFallback(text, language, rate, pitch, onFinish);
            }
          }, 2000);
          
          return;
        }
      } catch (err) {
        console.warn('[TTSService] Puter failed:', err);
      }
    }

    // 2. Fallback
    runFallback(text, language, rate, pitch, onFinish);
  });
};

function runFallback(text, language, rate, pitch, callback) {
  if (!('speechSynthesis' in window)) return callback();

  const speakWithVoice = () => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = callback;
      utterance.onerror = (e) => {
        console.error('[TTSService] Fallback Error:', e);
        callback();
      };

      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(v => v.lang.startsWith('bn'));
      if (bnVoice) utterance.voice = bnVoice;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[TTSService] Fatal Fallback Error:', err);
      callback();
    }
  };

  // If voices aren't loaded yet, wait a bit or listen to event
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = speakWithVoice;
    // Timeout as a last resort
    setTimeout(() => {
      if (window.speechSynthesis.getVoices().length > 0) speakWithVoice();
      else speakWithVoice(); // Just speak with default
    }, 100);
  } else {
    speakWithVoice();
  }
}
