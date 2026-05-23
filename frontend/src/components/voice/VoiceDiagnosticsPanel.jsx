'use client';

import React from 'react';

/**
 * VoiceDiagnosticsPanel
 * Dev tool to inspect the state of voice services.
 */
const VoiceDiagnosticsPanel = ({ stats = {} }) => {
  const [statuses, setStatuses] = React.useState({
    mediaRecorder: false,
    puterSdk: false,
    puterAi: false,
    speechSynth: false,
    isSecureContext: false
  });

  React.useEffect(() => {
    const check = () => {
      setStatuses({
        mediaRecorder: typeof window !== 'undefined' && !!window.MediaRecorder,
        puterSdk: typeof window !== 'undefined' && !!window.puter,
        puterAi: typeof window !== 'undefined' && !!window.puter?.ai,
        speechSynth: typeof window !== 'undefined' && 'speechSynthesis' in window,
        isSecureContext: typeof window !== 'undefined' && window.isSecureContext
      });
    };

    check();
    const interval = setInterval(check, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000); // Poll for 10s

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const StatusBadge = ({ condition, label, subtext }) => (
    <div className={`flex flex-col p-2 rounded-lg text-[10px] font-bold border transition-colors ${
      condition ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-rose-50 border-rose-200 text-rose-700'
    }`}>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${condition ? 'bg-teal-500 animate-pulse' : 'bg-rose-500'}`}></div>
      </div>
      {subtext && <span className="text-[8px] opacity-60 font-normal mt-0.5">{subtext}</span>}
    </div>
  );

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Voice Diagnostics</h3>
        </div>
        {!statuses.isSecureContext && (
          <span className="text-[8px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Insecure Context</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatusBadge condition={statuses.mediaRecorder} label="MediaRecorder" subtext={!statuses.isSecureContext ? "Requires HTTPS/Localhost" : "Available"} />
        <StatusBadge condition={statuses.puterSdk} label="Puter.js SDK" subtext={statuses.puterSdk ? "Loaded" : "Checking..."} />
        <StatusBadge condition={statuses.puterAi} label="Puter AI API" subtext={statuses.puterAi ? "Ready" : "Waiting..."} />
        <StatusBadge condition={statuses.speechSynth} label="Browser TTS" subtext="Fallback System" />
      </div>

      <div className="space-y-1 pt-2 border-t border-gray-50">
        <DiagnosticItem label="Last MIME" value={stats.lastMime || 'N/A'} />
        <DiagnosticItem label="Last Size" value={stats.lastSize ? `${(stats.lastSize / 1024).toFixed(1)} KB` : 'N/A'} />
        <DiagnosticItem label="STT Model" value={stats.lastModel || 'N/A'} />
        <DiagnosticItem label="STT Lang" value={stats.lastLang || 'N/A'} />
        <DiagnosticItem label="TTS Error" value={stats.lastTtsError || 'None'} isError={!!stats.lastTtsError} />
      </div>

      {stats.lastTranscript && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Transcript</p>
          <p className="text-xs text-gray-600 font-medium italic">"{stats.lastTranscript}"</p>
        </div>
      )}
    </div>
  );
};

const DiagnosticItem = ({ label, value, isError }) => (
  <div className="flex justify-between text-[11px] py-1">
    <span className="font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
    <span className={`font-mono ${isError ? 'text-rose-600 font-bold' : 'text-gray-600'}`}>{value}</span>
  </div>
);

export default VoiceDiagnosticsPanel;
