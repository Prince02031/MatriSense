'use client';

import React, { useState } from 'react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { transcribeAudio } from '../../api/speechApi';

/**
 * VoiceRecorderButton
 * Reusable component to record audio and get transcript.
 * NOTE: This component only handles Speech-to-Text (STT) and inserts the 
 * resulting transcript into the target field. It DOES NOT bypass clinical 
 * review; the user must still verify and edit the text manually.
 */
const VoiceRecorderButton = ({ onTranscript, onError, disabled, language = 'bn' }) => {
  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecording } = useVoiceRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micSupport, setMicSupport] = useState(true);

  // Check support on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined' && (!window.MediaRecorder || !navigator.mediaDevices)) {
      setMicSupport(false);
    }
  }, []);

  const handleToggleRecord = async () => {
    if (!micSupport) return;
    try {
      if (isRecording) {
        stopRecording();
      } else {
        resetRecording();
        await startRecording();
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? 'Microphone permission denied' : (err.message || 'Mic access failed');
      if (onError) onError(msg);
    }
  };

  // Handle auto-transcription when blob is ready
  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      const performTranscription = async () => {
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio({ audioBlob, language });
          if (result && result.transcript) {
            onTranscript({ 
              transcript: result.transcript, 
              audioMetadata: { 
                size: audioBlob.size, 
                type: audioBlob.type 
              },
              fullResult: result 
            });
          }
        } catch (err) {
          if (onError) onError(err.message || 'Transcription failed');
        } finally {
          setIsTranscribing(false);
          resetRecording();
        }
      };
      performTranscription();
    }
  }, [audioBlob, isRecording, language, onTranscript, onError, resetRecording]);

  if (!micSupport) {
    return (
      <div className="flex flex-col items-center opacity-50 cursor-not-allowed grayscale" title="Microphone not supported">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
        <span className="text-[9px] font-black uppercase text-gray-500 mt-1">Mic Unsupported</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleToggleRecord}
        disabled={disabled || isTranscribing}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-90
          ${isRecording 
            ? 'bg-rose-600 ring-4 ring-rose-100' 
            : isTranscribing
              ? 'bg-teal-100 text-teal-600 cursor-wait shadow-none border-2 border-teal-200'
              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'}`}
        title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
      >
        {isTranscribing ? (
          <div className="w-6 h-6 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
        ) : isRecording ? (
          <div className="voice-wave">
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      <div className="flex flex-col items-center">
        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors
          ${isTranscribing ? 'text-teal-600' : isRecording ? 'text-rose-600' : 'text-gray-400'}`}>
          {isTranscribing ? 'ট্রান্সক্রাইব...' : isRecording ? 'বন্ধ করুন' : 'বলুন'}
        </span>
        {isRecording && (
          <span className="text-xs font-black text-rose-600 tabular-nums">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorderButton;
