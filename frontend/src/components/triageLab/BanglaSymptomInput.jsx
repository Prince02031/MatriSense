import React from 'react';

/**
 * BanglaSymptomInput
 * Dedicated input for the patient's story in Bangla.
 */
const BanglaSymptomInput = ({ value, onChange, onAnalyze, isLoading }) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="আপনার সমস্যাটি বাংলায় বিস্তারিত বলুন (উদা: আমার মাথা ব্যথা করছে...)"
          className="w-full min-h-[160px] p-5 text-lg border-2 border-teal-100 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-50/50 outline-none transition-all resize-none shadow-inner bg-teal-50/10"
          dir="auto"
        />
        <div className="absolute bottom-4 right-4 text-xs text-gray-400 font-medium">
          {value.length} characters
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={isLoading || value.trim().length < 5}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]
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
