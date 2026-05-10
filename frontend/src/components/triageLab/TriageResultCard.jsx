import React from 'react';

/**
 * TriageResultCard
 * Displays the final clinical recommendation and AI explanation.
 */
const TriageResultCard = ({ 
  riskLevel, 
  action, 
  summaryBn, 
  steps = [], 
  monitor = [],
  warnings = [],
  disclaimerBn,
  sources = [],
  isFallback = false 
}) => {
  const getRiskStyles = () => {
    switch (riskLevel) {
      case 'HIGH': return { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700', label: 'জরুরী পদক্ষেপ প্রয়োজন (Urgent Action Required)' };
      case 'MEDIUM': return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', label: 'চিকিৎসকের পরামর্শ নিন (Clinical Assessment Needed)' };
      case 'LOW': return { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700', label: 'বাড়িতে পর্যবেক্ষণ করুন (Monitor at Home)' };
      default: return { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-700', label: 'অসম্পূর্ণ (Incomplete)' };
    }
  };

  const styles = getRiskStyles();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Risk Banner */}
      <div className={`${styles.bg} ${styles.text} p-8 rounded-3xl shadow-xl border-b-8 ${styles.border} relative overflow-hidden`}>
        {/* Decorative background element */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            Triage Result
          </span>
          <div className="bg-white/20 px-4 py-1.5 rounded-full text-[11px] font-black backdrop-blur-md border border-white/30">
            {styles.label}
          </div>
        </div>
        
        <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">
          {action?.replace(/_/g, ' ')}
        </h2>
        
        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
          <p className="text-xl leading-relaxed font-bangla font-medium">
            {summaryBn}
          </p>
        </div>

        {isFallback && (
          <div className="mt-4 px-3 py-1 bg-rose-900/40 border border-rose-400/30 rounded text-[10px] font-bold text-rose-100 italic">
            Note: Fallback safety template used because unsafe output was detected.
          </div>
        )}
      </div>

      {/* Immediate Steps */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-xs font-black text-teal-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-teal-500 rounded-full"></div>
          অবিলম্বে করণীয় (Immediate Steps)
        </h3>
        <ul className="space-y-5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-4 items-start group">
              <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-black border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all">
                {i + 1}
              </span>
              <span className="text-gray-800 leading-relaxed font-medium pt-0.5 text-lg">
                {step}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Monitoring Section */}
      {monitor.length > 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
            নজরে রাখুন (Monitoring)
          </h3>
          <ul className="space-y-4">
            {monitor.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-2.5 w-2 h-2 rounded-full bg-amber-200 flex-shrink-0"></span>
                <span className="text-gray-700 font-medium leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning Signs (ALWAYS SHOWN if present) */}
      {warnings.length > 0 && (
        <div className="bg-rose-50 rounded-3xl p-8 border-2 border-dashed border-rose-200 shadow-inner">
          <h3 className="text-xs font-black text-rose-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            সতর্ক সংকেত (Urgent Warnings)
          </h3>
          <ul className="space-y-3">
            {warnings.map((warn, i) => (
              <li key={i} className="text-rose-800 font-bold flex gap-3 items-start text-lg">
                <span className="mt-2 w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></span>
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Meta */}
      <div className="px-4 space-y-4">
        {/* Sources */}
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center justify-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Evidence Sources:</span>
            {sources.map((src, i) => (
              <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold border border-gray-200">
                {src}
              </span>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-4 bg-gray-100/50 rounded-2xl">
          <p className="text-[11px] text-gray-500 text-center leading-relaxed italic font-bangla">
            {disclaimerBn || "এই পরামর্শগুলি বিশ্ব স্বাস্থ্য সংস্থা (WHO) প্রোটোকলের উপর ভিত্তি করে। এটি কোনো চিকিৎসার বিকল্প নয়।"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TriageResultCard;
