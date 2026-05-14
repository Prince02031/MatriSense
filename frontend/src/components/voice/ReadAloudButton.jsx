'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { speakTextSegment, stopSpeaking, isTtsSupported } from '../../utils/voice/ttsService';

/**
 * ReadAloudButton
 * Component to read text or multiple segments aloud.
 * NOTE: This component handles Text-to-Speech (TTS) readout only. 
 * Any visual highlighting triggered via callbacks is for accessibility 
 * guidance and does not auto-select or perform any clinical actions.
 */
const ReadAloudButton = ({ 
  text, 
  segments, 
  onSegmentStart, 
  onSegmentEnd, 
  disabled, 
  label = "শুনুন",
  language = "bn-BD"
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    setTtsSupported(isTtsSupported());
  }, []);

  const handleToggleSpeak = async () => {
    if (!ttsSupported) return;

    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      return;
    }

    // Stop any other active speech first
    stopSpeaking();

    // Determine what to read
    const toRead = segments && segments.length > 0 
      ? segments 
      : (text ? [{ id: 'default', text }] : []);

    if (toRead.length === 0) return;

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    try {
      for (const segment of toRead) {
        if (!isSpeakingRef.current) break;

        if (onSegmentStart) onSegmentStart(segment);
        await speakTextSegment(segment.text, { language });
        if (onSegmentEnd) onSegmentEnd(segment);
      }
    } catch (err) {
      console.error('[ReadAloudButton] Playback failed:', err);
    } finally {
      if (isSpeakingRef.current) {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Final safety cleanup for highlights
        if (onSegmentEnd) onSegmentEnd(null);
      }
    }
  };

  if (!ttsSupported) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase text-gray-400 bg-gray-100 border border-gray-200 opacity-60 cursor-not-allowed">
         TTS Unavailable
      </div>
    );
  }

  return (
    <button
      onClick={handleToggleSpeak}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-all transform active:scale-95
        ${isSpeaking 
          ? 'bg-rose-100 text-rose-600 border border-rose-200' 
          : 'bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100'}`}
    >
      {isSpeaking ? (
        <>
          <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>বন্ধ করুন</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default ReadAloudButton;
