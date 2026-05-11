'use client';

import { useState } from 'react';
import { runTriageLab } from '../../../src/api/triageLabApi';

// Import our custom Triage Lab components
import PipelineStatusBar from '../../../src/components/triageLab/PipelineStatusBar';
import TriageStepCard from '../../../src/components/triageLab/TriageStepCard';
import ProfileMockForm from '../../../src/components/triageLab/ProfileMockForm';
import BanglaSymptomInput from '../../../src/components/triageLab/BanglaSymptomInput';
import DangerSignCheckboxes from '../../../src/components/triageLab/DangerSignCheckboxes';
import SymptomConfirmation from '../../../src/components/triageLab/SymptomConfirmation';
import FollowUpQuestionCard from '../../../src/components/triageLab/FollowUpQuestionCard';
import TriageResultCard from '../../../src/components/triageLab/TriageResultCard';
import DebugJsonPanel from '../../../src/components/triageLab/DebugJsonPanel';
import ChatBubble from '../../../src/components/triageLab/ChatBubble';
import VoiceDiagnosticsPanel from '../../../src/components/voice/VoiceDiagnosticsPanel';

export default function AITriageLabPage() {
  // --- PAGE STATE ---
  const [currentStep, setCurrentStep] = useState('profile_setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [patientProfile, setPatientProfile] = useState({
    trimester: 'unknown',
    gestationalWeek: null,
    riskFactors: { hypertension: false, diabetes: false, anemia: false },
    lastCheckupDaysAgo: 0
  });

  const [inputTextBn, setInputTextBn] = useState('');
  const [checkedDangerSigns, setCheckedDangerSigns] = useState([]);
  
  const [extraction, setExtraction] = useState(null);
  const [confirmedSymptoms, setConfirmedSymptoms] = useState([]);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({}); // { questionId: value }
  
  // Pipeline Data
  const [normalizedAnswers, setNormalizedAnswers] = useState(null);
  const [caseState, setCaseState] = useState(null);
  const [decision, setDecision] = useState(null);
  const [careGuidanceContext, setCareGuidanceContext] = useState(null);
  const [preGenerationSafety, setPreGenerationSafety] = useState(null);
  const [llmOutput, setLlmOutput] = useState(null);
  const [postGenerationSafety, setPostGenerationSafety] = useState(null);
  const [safeOutput, setSafeOutput] = useState(null);

  // Diagnostics
  const [voiceStats, setVoiceStats] = useState({
    lastMime: null,
    lastSize: null,
    lastModel: null,
    lastLang: null,
    lastTranscript: null,
    lastTtsError: null
  });

  // --- ACTIONS ---

  const handleStartSymptomInput = () => {
    setCurrentStep('symptom_input');
  };

  const handleStartTriageTest = async () => {
    // Frontend Validation
    if (!inputTextBn.trim()) {
      setError('Please describe your symptoms in Bangla before starting.');
      return;
    }
    if (patientProfile.trimester === 'unknown' && !patientProfile.gestationalWeek) {
      setError('Please provide at least a trimester or gestational week for accurate triage.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await runTriageLab({
        patientProfile,
        inputTextBn,
        checkedDangerSigns: checkedDangerSigns || [],
        runLlm: false // First run only does extraction and probing
      });

      setExtraction(result.extraction);
      setConfirmedSymptoms(result.extraction?.detectedSymptoms || []);
      setFollowUpQuestions(result.followUpQuestions || []);
      setCaseState(result.caseState);
      
      setCurrentStep('confirm_symptoms');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSymptoms = () => {
    if (confirmedSymptoms.length === 0) {
      setError('Please confirm or add at least one symptom to proceed.');
      return;
    }
    setError(null);

    if (followUpQuestions.length > 0) {
      setCurrentStep('followup_questions');
    } else {
      handleFinalRun();
    }
  };

  const handleAnswerQuestion = (id, val) => {
    setFollowUpAnswers(prev => ({ ...prev, [id]: val }));
  };

  const handleFinalRun = async () => {
    // Frontend Validation for follow-up answers
    const unansweredCount = followUpQuestions.filter(q => followUpAnswers[q.id] === undefined).length;
    if (unansweredCount > 0) {
      setError(`Please answer all ${unansweredCount} follow-up questions to finish the triage.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const answersArray = Object.entries(followUpAnswers).map(([id, val]) => ({
        questionId: id,
        value: val
      }));

      const result = await runTriageLab({
        patientProfile,
        inputTextBn,
        checkedDangerSigns,
        confirmedSymptoms,
        followUpAnswers: answersArray,
        runLlm: true
      });

      // Update full pipeline state
      setNormalizedAnswers(result.normalizedAnswers);
      setCaseState(result.caseState);
      setDecision(result.decision);
      setCareGuidanceContext(result.careGuidanceContext);
      setPreGenerationSafety(result.preGenerationSafety);
      setLlmOutput(result.llmOutput);
      setPostGenerationSafety(result.postGenerationSafety);
      setSafeOutput(result.safeOutput);

      setCurrentStep('final_result');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('profile_setup');
    setExtraction(null);
    setConfirmedSymptoms([]);
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setError(null);
    setNormalizedAnswers(null);
    setCaseState(null);
    setDecision(null);
    setCareGuidanceContext(null);
    setPreGenerationSafety(null);
    setLlmOutput(null);
    setPostGenerationSafety(null);
    setSafeOutput(null);
  };

  // --- PRESETS ---
  const PRESETS = [
    {
      id: 'low',
      label: 'LOW Case',
      color: 'teal',
      profile: { trimester: 'second', gestationalWeek: 20, riskFactors: { hypertension: false, diabetes: false, anemia: false }, lastCheckupDaysAgo: 10 },
      input: 'আমার বমি বমি লাগছে আর মাথা একটু ব্যথা করছে'
    },
    {
      id: 'medium',
      label: 'MEDIUM Case',
      color: 'amber',
      profile: { trimester: 'second', gestationalWeek: 24, riskFactors: { anemia: true }, lastCheckupDaysAgo: 15 },
      input: 'জ্বর আর দুর্বল লাগছে'
    },
    {
      id: 'high',
      label: 'HIGH Case',
      color: 'rose',
      profile: { trimester: 'third', gestationalWeek: 32, riskFactors: { hypertension: true }, lastCheckupDaysAgo: 70 },
      input: 'আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি'
    }
  ];

  const applyPreset = (preset) => {
    handleReset();
    setPatientProfile(preset.profile);
    setInputTextBn(preset.input);
    setCurrentStep('symptom_input');
  };

  // --- RENDER HELPERS ---

  const renderActiveStep = () => {
    switch (currentStep) {
      case 'profile_setup':
        return (
          <TriageStepCard 
            title="Step 1: Patient Profile" 
            subtitle="Setup mock patient context."
          >
            <ProfileMockForm 
              profile={patientProfile} 
              onChange={setPatientProfile} 
              onSubmit={handleStartSymptomInput}
            />
          </TriageStepCard>
        );

      case 'symptom_input':
        return (
          <div className="space-y-6">
            <ChatBubble role="assistant">
              আসসালামু আলাইকুম। আমি আপনার ডিজিটাল স্বাস্থ্য সহকারী। আপনার কি সমস্যা হচ্ছে তা দয়া করে বিস্তারিত বলুন।
            </ChatBubble>
            
            <TriageStepCard title="Step 2: Tell your story" subtitle="Enter Bangla symptoms.">
              <div className="space-y-8">
                <BanglaSymptomInput 
                  value={inputTextBn} 
                  onChange={setInputTextBn} 
                  onAnalyze={handleStartTriageTest}
                  onVoiceDiagnostics={setVoiceStats}
                  isLoading={loading}
                />
                <div className="pt-4 border-t border-gray-100">
                  <DangerSignCheckboxes 
                    selected={checkedDangerSigns} 
                    onChange={setCheckedDangerSigns} 
                  />
                </div>
              </div>
            </TriageStepCard>
          </div>
        );

      case 'confirm_symptoms':
        return (
          <div className="space-y-6">
             <ChatBubble role="assistant">
              আমি আপনার কথা থেকে নিচের লক্ষণগুলো বুঝতে পেরেছি। এগুলো কি সঠিক?
            </ChatBubble>

            <TriageStepCard title="Step 3: Confirm Symptoms" subtitle="Review AI extraction.">
              <SymptomConfirmation 
                symptoms={confirmedSymptoms}
                source={extraction?.source}
                onConfirm={handleConfirmSymptoms}
                onRemoveSymptom={(s) => setConfirmedSymptoms(prev => prev.filter(item => item !== s))}
              />
            </TriageStepCard>
          </div>
        );

      case 'followup_questions':
        return (
          <div className="space-y-6">
            <ChatBubble role="assistant">
              আপনাকে আরও ভালোভাবে সাহায্য করার জন্য আমার আরও কিছু তথ্যের প্রয়োজন।
            </ChatBubble>

            <div className="space-y-4">
              {followUpQuestions.map((q) => (
                <FollowUpQuestionCard 
                  key={q.id}
                  question={q}
                  value={followUpAnswers[q.id]}
                  onChange={handleAnswerQuestion}
                />
              ))}
              
              <div className="pt-4 flex justify-center">
                <button
                  onClick={handleFinalRun}
                  disabled={loading}
                  className="px-12 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Submit and Get Result'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'final_result':
        return (
          <div className="space-y-8">
            <ChatBubble role="assistant">
              আপনার লক্ষণগুলো বিশ্লেষণ করে আমি নিচের পরামর্শগুলো দিচ্ছি।
            </ChatBubble>

            <TriageResultCard 
              riskLevel={decision?.riskLevel}
              action={decision?.recommendedAction}
              summaryBn={safeOutput?.motherExplanationBn}
              steps={safeOutput?.stepsNowBn}
              monitor={safeOutput?.monitorBn}
              warnings={safeOutput?.urgentWarningBn}
              disclaimerBn={safeOutput?.safetyDisclaimerBn}
              sources={careGuidanceContext?.sources}
              isFallback={postGenerationSafety?.valid === false}
              safeOutput={safeOutput}
              decision={decision}
            />

            <div className="flex justify-center pb-12">
              <button 
                onClick={handleReset}
                className="px-8 py-3 border-2 border-teal-600 text-teal-600 font-bold rounded-xl hover:bg-teal-50"
              >
                Start New Session
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black">M</div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">MatriSense AI Triage Lab</h1>
              <p className="text-[10px] uppercase font-bold text-teal-600 tracking-widest">Internal Pipeline Testing Tool</p>
            </div>
          </div>
          <div className="hidden md:block bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
            <p className="text-xs text-amber-800 font-medium italic">
              Note: This is a developer lab page. Not the final patient-facing UI.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Quick Presets */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quick Test Presets:</span>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all hover:shadow-sm
                  ${p.id === 'low' ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' : 
                    p.id === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 
                    'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <PipelineStatusBar currentStatus={currentStep} />

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-6 bg-rose-50 border-2 border-rose-200 rounded-3xl shadow-sm animate-in shake duration-500">
            <div className="flex items-start gap-4">
              <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-rose-900 font-black uppercase tracking-widest text-[10px] mb-1">Pipeline Error</h3>
                <p className="text-rose-800 font-medium leading-relaxed mb-4">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="px-6 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-rose-700 transition-all uppercase tracking-widest shadow-md"
                >
                  Clear & Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT: Guided Chat Flow */}
          <div className="lg:col-span-7 space-y-12">
            {renderActiveStep()}
          </div>

          {/* RIGHT: Debug Panel */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Pipeline Inspector
                </h3>
              </div>
              
              <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">
                <VoiceDiagnosticsPanel stats={voiceStats} />
                <DebugJsonPanel title="1. Extraction Result" data={extraction} />
                <DebugJsonPanel title="2. Confirmed Symptoms" data={confirmedSymptoms} />
                <DebugJsonPanel title="3. Follow-up Questions" data={followUpQuestions} />
                <DebugJsonPanel title="4. Normalized Answers" data={normalizedAnswers} />
                <DebugJsonPanel title="5. Case State" data={caseState} />
                <DebugJsonPanel title="6. Rule Events" data={decision?.reasons} />
                <DebugJsonPanel title="7. Decision" data={decision} initialExpanded={true} />
                <DebugJsonPanel title="8. Retrieved RAG Cards" data={careGuidanceContext?.retrievedCards} />
                <DebugJsonPanel title="9. Care Guidance Context" data={careGuidanceContext} />
                <DebugJsonPanel title="10. Pre-generation Safety" data={preGenerationSafety} />
                <DebugJsonPanel title="11. LLM Output" data={llmOutput} />
                <DebugJsonPanel title="12. Post-generation Safety" data={postGenerationSafety} />
                <DebugJsonPanel title="13. Final Safe Output" data={safeOutput} initialExpanded={true} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
