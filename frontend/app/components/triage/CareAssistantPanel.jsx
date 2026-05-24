'use client';

import { useState, useEffect, useRef } from 'react';
import { sendCareAssistantMessage } from '../../api/triageApi';
import { speakTextSegment, stopSpeaking, isTtsSupported } from '../../../src/utils/voice/ttsService';
import { useVoiceRecorder } from '../../../src/hooks/useVoiceRecorder';
import { transcribeAudio } from '../../../src/api/speechApi';

/**
 * CareAssistantPanel - Premium conversational UI drawer for post-triage assistance
 * Incorporates:
 * - 72-hour localStorage TTL state caching
 * - Quick-reply prompt buttons
 * - Sticky high-risk indicators
 * - Accessible keyboard navigation & focus states
 * - Collapsible developer debug inspector
 * - Voice read-aloud support (Puter.js + Web Speech Synthesis fallback)
 * - Voice input/transcription support (MediaRecorder + Whisper API fallback)
 */
export default function CareAssistantPanel({ sessionId, riskLevel, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Voice output states
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [ttsLoadingIndex, setTtsLoadingIndex] = useState(null);
  const [activeBubbleIndex, setActiveBubbleIndex] = useState(null);
  const [ttsSupported, setTtsSupported] = useState(true);

  // Voice input states
  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, resetRecording } = useVoiceRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micSupport, setMicSupport] = useState(true);
  const [sttError, setSttError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const localStorageKey = `matrisense:careAssistant:${sessionId}`;
  const firstReadStorageKey = `${localStorageKey}:firstReplyRead`;
  const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

  // Quick reply options in Bangla
  const quickPrompts = [
    "আমি এখন কী করবো?",
    "স্বাস্থ্যকর্মীকে কী বলবো?",
    "কখন জরুরি হবে?",
    "পরিবারকে কীভাবে বলবো?",
    "হাসপাতালে গেলে কী প্রস্তুতি নেব?"
  ];

  // Check if we are running in development mode
  const isDev = process.env.NODE_ENV === 'development';

  // 1. Initial State Loading & TTL check on mount
  useEffect(() => {
    if (!sessionId) return;

    // Check if TTS is supported in this browser
    setTtsSupported(isTtsSupported());

    // Check if Microphone/MediaRecorder is supported
    if (typeof window !== 'undefined' && (!window.MediaRecorder || !navigator.mediaDevices)) {
      setMicSupport(false);
    }

    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();

        // Expire check (72 hours check)
        if (parsed && parsed.createdAt && (now - parsed.createdAt < TTL_MS) && parsed.sessionId === sessionId) {
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(parsed.messages);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[CareAssistant] Failed to parse localStorage. Resetting storage.', err);
      localStorage.removeItem(localStorageKey);
    }

    // Default starting state
    const initialTurn = {
      role: 'assistant',
      content: "আমি আপনার triage ফলাফলের ভিত্তিতে সাহায্য করতে পারি। আমি ডাক্তার নই, তবে নিরাপদ পরবর্তী ধাপ বুঝতে সাহায্য করতে পারি।",
      timestamp: Date.now()
    };
    
    setMessages([initialTurn]);
    persistChat([initialTurn]);

  }, [sessionId]);

  // 2. Keyboard listener for Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 3. Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 4. Scroll to bottom as messages stream
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // 5. Cleanup voice output & recording when panel closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      setSpeakingIndex(null);
      setTtsLoadingIndex(null);

      if (isRecording) {
        try { stopRecording(); } catch (e) {}
      }
      setIsTranscribing(false);
      resetRecording();
      setSttError(null);
    }
  }, [isOpen, isRecording, stopRecording, resetRecording]);

  // Unmount safety cleanup for speech/recording
  const stopRecordingRef = useRef(stopRecording);
  const isRecordingRef = useRef(isRecording);
  
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
    isRecordingRef.current = isRecording;
  }, [stopRecording, isRecording]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (isRecordingRef.current) {
        try { stopRecordingRef.current(); } catch(e) {}
      }
    };
  }, []);

  // 6. Auto-read the first assistant message on initial opening
  useEffect(() => {
    if (isOpen && messages.length === 1 && messages[0].role === 'assistant' && ttsSupported) {
      const hasReadFirst = localStorage.getItem(firstReadStorageKey) === 'true';
      if (!hasReadFirst) {
        localStorage.setItem(firstReadStorageKey, 'true');
        setTimeout(() => {
          handleSpeakMessage(messages[0], 0);
        }, 800);
      }
    }
  }, [isOpen, messages, ttsSupported]);

  // 7. Handle audio transcription once recording stops and Blob is resolved
  useEffect(() => {
    if (audioBlob && !isRecording) {
      const performTranscription = async () => {
        setIsTranscribing(true);
        setSttError(null);
        try {
          const result = await transcribeAudio({ audioBlob, language: 'bn' });
          if (result && result.transcript) {
            setInput(prev => {
              const trimmedPrev = prev.trim();
              return trimmedPrev ? `${trimmedPrev} ${result.transcript.trim()}` : result.transcript.trim();
            });
            // Focus the input to let the user review
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          } else {
            setSttError("ভয়েস থেকে লেখা তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন বা লিখে প্রশ্ন করুন।");
          }
        } catch (err) {
          console.error('[CareAssistant STT] Transcription error:', err);
          setSttError("ভয়েস থেকে লেখা তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন বা লিখে প্রশ্ন করুন।");
        } finally {
          setIsTranscribing(false);
          resetRecording();
        }
      };
      performTranscription();
    }
  }, [audioBlob, isRecording]);

  // Helper to persist chat history to localstorage
  const persistChat = (chatList) => {
    try {
      const payload = {
        sessionId,
        riskLevel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: chatList
      };
      localStorage.setItem(localStorageKey, JSON.stringify(payload));
    } catch (err) {
      console.error('[CareAssistant] localStorage save failure:', err);
    }
  };

  // Speaks/Stops the text segments
  const handleSpeakMessage = async (msg, index) => {
    if (!msg || !msg.content || !ttsSupported) return;

    if (speakingIndex === index) {
      stopSpeaking();
      setSpeakingIndex(null);
      setTtsLoadingIndex(null);
      return;
    }

    // Stop active speech and start loading spinner
    stopSpeaking();
    setSpeakingIndex(null);
    setTtsLoadingIndex(index);

    try {
      setTtsLoadingIndex(null);
      setSpeakingIndex(index);

      // Read final assistant-visible reply in Bangla (moderate rate of 0.9)
      await speakTextSegment(msg.content, { language: 'bn-BD', rate: 0.9 });
    } catch (err) {
      console.error('[CareAssistant] Voice readout failed:', err);
    } finally {
      setSpeakingIndex(prev => prev === index ? null : prev);
    }
  };

  // Start / Stop recording trigger
  const handleToggleRecord = async () => {
    if (!micSupport) {
      setSttError("এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে লিখে প্রশ্ন করুন।");
      return;
    }

    // Stop active TTS when beginning a recording
    stopSpeaking();
    setSpeakingIndex(null);
    setTtsLoadingIndex(null);

    try {
      if (isRecording) {
        stopRecording();
      } else {
        resetRecording();
        setSttError(null);
        await startRecording();
      }
    } catch (err) {
      console.error('[CareAssistant STT] Mic capture initialization failed:', err);
      setSttError("মাইক্রোফোন ব্যবহার করার অনুমতি পাওয়া যায়নি। আপনি চাইলে লিখে প্রশ্ন করতে পারেন।");
    }
  };

  // Submit message routine
  const handleSend = async (userText) => {
    if (!userText.trim() || loading) return;

    // Stop speaking immediately when user interacts
    stopSpeaking();
    setSpeakingIndex(null);
    setTtsLoadingIndex(null);

    const trimmedMsg = userText.trim();
    setInput('');
    setError(null);
    setLoading(true);

    const userMessageTurn = {
      role: 'user',
      content: trimmedMsg,
      timestamp: Date.now()
    };

    const updatedList = [...messages, userMessageTurn];
    setMessages(updatedList);
    persistChat(updatedList);

    // Keep only conversational history turns for context
    const cleanHistory = updatedList.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await sendCareAssistantMessage(sessionId, {
        message: trimmedMsg,
        chatHistory: cleanHistory,
        language: 'bn'
      });

      if (response.success) {
        const assistantTurn = {
          role: 'assistant',
          content: response.answer,
          quickReplies: response.quickReplies,
          safetyDisclaimer: response.safetyDisclaimer,
          debug: response.debug || null,
          timestamp: Date.now()
        };

        const finalChatList = [...updatedList, assistantTurn];
        setMessages(finalChatList);
        persistChat(finalChatList);
      }
    } catch (err) {
      console.error('[CareAssistant] Fetch response error:', err);
      setError("বার্তাটি পাঠানো যায়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
      
      let customErrReply = "দুঃখিত, সংযোগে কিছুটা বিঘ্ন ঘটেছে। আপনার লক্ষণ বা জরুরী সেবার জন্য আপনার স্বাস্থ্যকর্মী অথবা নিকটস্থ হাসপাতালে সরাসরি যোগাযোগ করুন।";
      if (riskLevel === 'HIGH') {
        customErrReply = "আপনার লক্ষণগুলো উচ্চ ঝুঁকির হতে পারে। দয়া করে দ্রুত স্বাস্থ্যকর্মী বা নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন। আমি ডাক্তার নই, তাই নির্দিষ্ট রোগ নির্ণয় বা ওষুধের পরামর্শ দিতে পারি না।";
      }

      const errTurn = {
        role: 'assistant',
        content: customErrReply,
        timestamp: Date.now()
      };

      const finalChatList = [...updatedList, errTurn];
      setMessages(finalChatList);
      persistChat(finalChatList);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has started talking yet (to customize quick prompts behavior)
  const hasUserMessaged = messages.some(msg => msg.role === 'user');

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
    >
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>

      {/* Main Chat Drawer */}
      <div className="relative flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 md:max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-matri-teal to-teal-700 px-6 py-4 text-white">
          <div>
            <h3 id="assistant-title" className="font-bold text-lg leading-tight">MatriSense Care Assistant</h3>
            <p className="text-xs text-teal-100">ত্রিয়েজ পরবর্তী স্বাস্থ্য সহায়ক</p>
          </div>
          
          <div className="flex items-center gap-3">
            {riskLevel && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                riskLevel === 'HIGH' ? 'bg-red-500 text-white animate-pulse' :
                riskLevel === 'MEDIUM' ? 'bg-amber-500 text-white' :
                'bg-green-500 text-white'
              }`} aria-label={`রোগীর ঝুঁকির মাত্রা: ${riskLevel}`}>
                {riskLevel} Risk
              </span>
            )}
            
            <button 
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/35 transition focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="অ্যাসিস্ট্যান্ট বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sticky Alert for High Risk cases (Never disappears while chatting) */}
        {riskLevel === 'HIGH' && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-start gap-3" role="alert">
            <span className="text-xl" aria-hidden="true">🚨</span>
            <p className="text-xs font-bold text-red-800 leading-relaxed">
              আপনার লক্ষণগুলো উচ্চ ঝুঁকির তালিকাভুক্ত। সহকারী কোনো ডাক্তারের বিকল্প নয়। জরুরি প্রয়োজনে বিলম্ব না করে নিকটস্থ স্বাস্থ্যকেন্দ্রে যান।
            </p>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              onClick={() => msg.role === 'assistant' && setActiveBubbleIndex(index)}
            >
              <div className={`relative group max-w-[85%] rounded-2xl p-4 shadow-sm transition-all duration-200 cursor-pointer ${
                msg.role === 'user'
                  ? 'bg-matri-teal text-white rounded-br-none'
                  : 'bg-white text-slate-800 border rounded-bl-none pr-10 hover:border-teal-200'
              }`}>
                
                {/* Voice play/pause speaker trigger (assistant messages only) */}
                {msg.role === 'assistant' && ttsSupported && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakMessage(msg, index);
                    }}
                    className={`absolute right-2 top-2 p-1.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-matri-teal
                      ${speakingIndex === index ? 'text-rose-600 bg-rose-50 border border-rose-200 opacity-100' : 'text-slate-400 hover:text-matri-teal hover:bg-slate-100'}
                      ${(speakingIndex === index || activeBubbleIndex === index) ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100'}
                    `}
                    aria-label={speakingIndex === index ? 'পড়া বন্ধ করুন' : 'পড়ে শুনুন'}
                    title={speakingIndex === index ? 'পড়া বন্ধ করুন' : 'পড়ে শুনুন'}
                  >
                    {speakingIndex === index ? (
                      // Playing/Stop icon
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : ttsLoadingIndex === index ? (
                      // Loading spinner
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      // Speaker play icon
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                )}

                <p className="text-sm font-medium leading-relaxed whitespace-pre-line break-words text-slate-800">
                  {msg.content}
                </p>

                {msg.safetyDisclaimer && (
                  <p className="mt-3 border-t border-rose-100 pt-2 text-[11px] font-bold text-rose-600 leading-normal" role="note">
                    ⚠️ {msg.safetyDisclaimer}
                  </p>
                )}

                {/* Collapsible developer debug view - development environment only */}
                {isDev && msg.debug && (
                  <details className="mt-3 border-t border-slate-200 pt-2 text-[10px] text-slate-500 cursor-pointer">
                    <summary className="font-semibold select-none hover:text-slate-700">Developer Debug Info</summary>
                    <pre className="mt-2 bg-slate-100 p-2 rounded text-[9px] overflow-x-auto whitespace-pre">
                      {JSON.stringify(msg.debug, null, 2)}
                    </pre>
                  </details>
                )}

                <p className="mt-2 text-[9px] text-right opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start" aria-live="polite" aria-busy="true">
              <div className="max-w-[85%] rounded-2xl bg-white border p-4 shadow-sm rounded-bl-none flex items-center gap-2">
                <span className="h-2 w-2 animate-bounce rounded-full bg-matri-teal [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-matri-teal [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-matri-teal"></span>
                <span className="sr-only">উত্তর খোঁজা হচ্ছে...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed font-semibold" role="alert">
              ⚠️ {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Action Panel: Suggestions & Input */}
        <div className="border-t bg-white px-6 py-4 space-y-3">
          {/* Quick replies - visible prominently before first user message or as guidance prompts */}
          {(!hasUserMessaged || messages.length <= 2) && (
            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none whitespace-nowrap" role="group" aria-label="Suggested Prompts">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="rounded-full bg-teal-50 border border-teal-100 px-4 py-1.5 text-xs font-semibold text-matri-teal hover:bg-matri-teal hover:text-white transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-matri-teal"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* STT Error Banner */}
          {sttError && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed font-semibold flex items-center justify-between animate-fade-in" role="alert">
              <span>⚠️ {sttError}</span>
              <button 
                type="button" 
                onClick={() => setSttError(null)} 
                className="text-amber-800 hover:text-amber-950 font-bold ml-2 focus:outline-none"
                aria-label="ত্রুটি বার্তা বন্ধ করুন"
              >
                ✕
              </button>
            </div>
          )}

          {/* Chat entry bar with voice input */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }} 
            className="flex items-center gap-3"
          >
            {/* Microphone transcription trigger button */}
            <button
              type="button"
              onClick={handleToggleRecord}
              disabled={loading || isTranscribing}
              className={`rounded-full p-3 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-matri-teal flex items-center justify-center gap-1.5
                ${isRecording 
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-100' 
                  : isTranscribing 
                    ? 'bg-teal-50 text-matri-teal border border-teal-200 cursor-wait' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              aria-label={isRecording ? 'রেকর্ডিং বন্ধ করুন' : isTranscribing ? 'ভয়েস লেখা হচ্ছে' : 'ভয়েসে প্রশ্ন করুন'}
              title={isRecording ? 'রেকর্ডিং বন্ধ করুন' : isTranscribing ? 'ভয়েস লেখা হচ্ছে' : 'ভয়েসে প্রশ্ন করুন'}
            >
              {isTranscribing ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : isRecording ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="অ্যাসিস্ট্যান্টকে জিজ্ঞেস করুন..."
              disabled={loading}
              className="flex-1 rounded-full border border-slate-300 px-5 py-3 text-sm focus:border-matri-teal focus:ring-1 focus:ring-matri-teal focus:outline-none disabled:bg-slate-50 text-slate-800 font-medium"
              aria-label="বার্তা ইনপুট"
            />
            
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="rounded-full bg-matri-teal p-3 text-white shadow hover:bg-teal-700 transition disabled:opacity-50 disabled:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-matri-teal"
              aria-label="বার্তা পাঠান"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
