import React, { useState } from 'react';
import VoiceRecorderButton from '../voice/VoiceRecorderButton';

/**
 * BanglaSymptomInput
 * Dedicated input for the patient's story in Bangla with Voice STT support.
 */
const BanglaSymptomInput = ({ value, onChange, onAnalyze, onVoiceDiagnostics, isLoading }) => {
  const [error, setError] = useState(null);
  const [showReviewNote, setShowReviewNote] = useState(false);

  const handleTranscript = ({ transcript, audioMetadata, fullResult }) => {
    onChange(value ? `${value} ${transcript}` : transcript);
    setError(null);
    setShowReviewNote(true);
    
    // Pass diagnostics up
    if (onVoiceDiagnostics) {
      onVoiceDiagnostics({
        lastMime: audioMetadata.type,
        lastSize: audioMetadata.size,
        lastModel: fullResult.model,
        lastLang: fullResult.language || 'bn',
        lastTranscript: transcript
      });
    }
  };

  const handleTextChange = (e) => {
    onChange(e.target.value);
    if (showReviewNote) setShowReviewNote(false);
  };

  const handleVoiceError = (errMsg) => {
    setError(errMsg);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="আপনার সমস্যাটি বাংলায় বিস্তারিত বলুন (উদা: আমার মাথা ব্যথা করছে...)"
          className={`w-full min-h-[180px] p-5 text-lg border-2 rounded-2xl focus:ring-4 focus:ring-teal-50/50 outline-none transition-all resize-none shadow-inner bg-teal-50/10
            ${error ? 'border-rose-300' : 'border-teal-100 focus:border-teal-500'}`}
          dir="auto"
        />
        
        {/* Voice Control Overlay */}
        <div className="absolute top-4 right-4">
          <VoiceRecorderButton 
            onTranscript={handleTranscript}
            onError={handleVoiceError}
            disabled={isLoading}
          />
        </div>

        <div className="absolute bottom-4 left-5 text-[10px] text-gray-400 font-black uppercase tracking-widest">
          {value.length} characters | Voice Input Available
        </div>
      </div>

      {showReviewNote && !error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            ভয়েস থেকে পাওয়া লেখা দেখে ঠিক করে নিন, তারপর AI triage চালান।
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-rose-600 animate-in fade-in slide-in-from-top-1 px-2">
          ⚠️ {error}
        </p>
      )}

      <button
        onClick={onAnalyze}
        disabled={isLoading || value.trim().length < 5}
        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]
          ${isLoading || value.trim().length < 5
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-teal-200'}`}
      >
        {isLoading ? (
          <>
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            Analyzing Symptoms...
          </>
        ) : (
          <>
            <span>Analyze My Story</span>
            <span className="text-teal-200">|</span>
            <span className="font-bangla">তদন্ত শুরু করুন</span>
          </>
        )}
      </button>
    </div>
  );
};

export default BanglaSymptomInput;
