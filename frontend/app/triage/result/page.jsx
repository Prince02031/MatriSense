'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { runTriage, explainTriage, getTriageResult } from '../../api/triageApi';
import ReadAloudButton from '../../../src/components/voice/ReadAloudButton';
import CareAssistantPanel from '../../components/triage/CareAssistantPanel';

/**
 * ResultPage - Phase 9 (Enhanced)
 * Display final triage result with risk level, care guidance, and safety disclaimers
 */
function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const sessionId = searchParams.get('sessionId');
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }
    
    runTriageAndFetchResult();
  }, [sessionId]);

  const runTriageAndFetchResult = async () => {
    try {
      setLoading(true);
      
      // Step 1: Run the triage pipeline
      await runTriage(sessionId);
      
      // Step 2: Generate the explanation
      try {
        await explainTriage(sessionId);
      } catch (explainErr) {
        console.warn('Failed to generate AI explanation:', explainErr);
        // Soft catch: Don't block loading the decision & care guidance if LLM is slow or offline!
      }
      
      // Step 3: Fetch the result
      const data = await getTriageResult(sessionId);
      
      setResult(data.result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return 'from-red-100 to-red-50 border-red-200';
      case 'MEDIUM':
        return 'from-yellow-100 to-yellow-50 border-yellow-200';
      case 'LOW':
        return 'from-green-100 to-green-50 border-green-200';
      default:
        return 'from-slate-100 to-slate-50 border-slate-200';
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return 'bg-red-100 text-red-700';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700';
      case 'LOW':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getRiskTitle = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return '🔴 উচ্চ ঝুঁকি - দ্রুত যোগাযোগ করুন';
      case 'MEDIUM':
        return '🟡 মধ্যম ঝুঁকি - শীঘ্রই যোগাযোগ করুন';
      case 'LOW':
        return '🟢 কম ঝুঁকি - নিরীক্ষণ করুন';
      default:
        return '⚪ অজানা - স্বাস্থ্যকর্মীর পরামর্শ নিন';
    }
  };

  const getRiskDescription = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH':
        return 'আমরা আপনার লক্ষণগুলি গুরুত্বপূর্ণ মনে করি। দয়া করে একজন যোগ্য স্বাস্থ্যকর্মীর সাথে অবিলম্বে যোগাযোগ করুন।';
      case 'MEDIUM':
        return 'আপনার লক্ষণগুলি মনোযোগের দাবি রাখে। শীঘ্রই একজন স্বাস্থ্যকর্মীর সাথে যোগাযোগ করুন।';
      case 'LOW':
        return 'আপনার লক্ষণগুলি বর্তমানে গুরুত্বপূর্ণ বলে মনে হচ্ছে না, তবে নিরীক্ষণ অব্যাহত রাখুন।';
      default:
        return 'আমরা আপনার পরিস্থিতি সম্পূর্ণভাবে মূল্যায়ন করতে পারিনি। একজন স্বাস্থ্যকর্মীর পরামর্শ নিন।';
    }
  };

  if (!isAuthenticated) {
    return <div className="p-6 text-center">অনুগ্রহ করে প্রথমে লগইন করুন</div>;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-matri-soft">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl bg-white p-12 text-center shadow-soft">
            <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-matri-teal mb-4"></div>
            <p className="text-slate-600 font-semibold text-lg">আপনার মূল্যায়ন প্রক্রিয়া করা হচ্ছে...</p>
            <p className="mt-2 text-sm text-slate-500">এটি কয়েক মুহূর্ত সময় নিতে পারে।</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-matri-soft">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-soft">
            <p className="text-sm font-semibold text-red-700">❌ ত্রুটি ঘটেছে</p>
            <p className="mt-2 text-red-600">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700"
            >
              পিছিয়ে যান
            </button>
          </div>
        </div>
      </main>
    );
  }

  const riskLevel = result?.decision?.riskLevel || 'UNKNOWN';

  // Extract safeOutput / AI guidance
  const safeOutput = result?.explanation;
  const hasAiExplanation = safeOutput && typeof safeOutput === 'object' && safeOutput.motherExplanationBn;

  // Empathic Bangla description (motherExplanationBn)
  const motherExplanation = hasAiExplanation ? safeOutput.motherExplanationBn : null;

  // Care steps, monitoring items, urgent warning flags
  const stepsNow = hasAiExplanation ? safeOutput.stepsNowBn : result?.careGuidance?.stepsNowBn;
  const monitor = hasAiExplanation ? safeOutput.monitorBn : result?.careGuidance?.monitorBn;
  const urgentWarning = hasAiExplanation ? safeOutput.urgentWarningBn : result?.careGuidance?.urgentWarningBn;

  // Safety Disclaimer
  const safetyDisclaimer = (hasAiExplanation && safeOutput.safetyDisclaimerBn)
    ? safeOutput.safetyDisclaimerBn
    : 'এটি একটি স্বয়ংক্রিয় পরামর্শ মাত্র। এটি চিকিৎসা পরামর্শ নয়। কোনো ঔষধ খাওয়ার আগে বা জরুরি প্রয়োজনে অবশ্যই একজন রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন। জরুরি পরিস্থিতিতে (গুরুতর রক্তপাত, চেতনা হারিয়ে যাওয়া, গুরুতর শ্বাসকষ্ট) অবিলম্বে জরুরি সেবা ডায়াল করুন বা নিকটস্থ হাসপাতালে যান।';

  // Evidence Sources (from care guidance or decision context)
  const evidenceSources = result?.careGuidance?.sources || result?.decision?.matchedRules?.map(r => r.sourceRef).filter(Boolean) || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-matri-soft via-blue-50 to-matri-soft">
      {/* Progress indicator - Complete */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200">
        <div className="h-1 bg-gradient-to-r from-matri-teal to-matri-green w-full"></div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-4 inline-block rounded-lg bg-matri-green/10 px-4 py-2">
              <p className="text-sm font-semibold text-matri-green">✓ মূল্যায়ন সম্পূর্ণ</p>
            </div>
            <h1 className="text-4xl font-bold text-slate-900">আপনার ত্রিয়েজ ফলাফল</h1>
            <p className="mt-2 text-slate-600">আপনার স্বাস্থ্য অবস্থা সম্পর্কে আমাদের পরামর্শ নিচে দেওয়া হয়েছে।</p>
          </div>
          <ReadAloudButton 
            text={`আপনার ত্রিয়েজ মূল্যায়ন সম্পূর্ণ হয়েছে। ঝুঁকির স্তর ${riskLevel}। আপনার স্বাস্থ্য অবস্থা সম্পর্কে আমাদের পরামর্শ নিচে দেওয়া হয়েছে। এই মূল্যায়ন শুধুমাত্র একটি প্রাথমিক মূল্যায়ন এবং চিকিৎসকের পরামর্শের বিকল্প নয়।`}
            label="শুনুন"
            language="bn-BD"
            disabled={loading}
          />
        </div>

        {/* Risk Card */}
        <div className={`rounded-3xl border bg-gradient-to-br p-8 shadow-soft mb-8 ${getRiskColor(riskLevel)}`}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-slate-900">{getRiskTitle(riskLevel)}</h2>
              <p className="mt-3 text-slate-700">{getRiskDescription(riskLevel)}</p>
            </div>
            <div className={`rounded-full px-6 py-3 font-bold text-lg ${getRiskBadgeColor(riskLevel)} whitespace-nowrap`}>
              {riskLevel}
            </div>
          </div>

          {/* Decision Reasons */}
          {result?.decision?.reasonsBn?.length > 0 && (
            <div className="mt-6 space-y-2 border-t border-current border-opacity-20 pt-6">
              <p className="text-sm font-semibold text-slate-700">এই সিদ্ধান্তের কারণ:</p>
              {result.decision.reasonsBn.map((reason, idx) => (
                <p key={idx} className="text-sm text-slate-700">
                  • {reason}
                </p>
              ))}
            </div>
          )}

          {/* Recommended Action */}
          {result?.decision?.recommendedAction && (
            <div className="mt-6 rounded-lg bg-white/80 p-4">
              <p className="text-xs font-semibold text-slate-600 uppercase">সুপারিশকৃত পদক্ষেপ:</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {result.decision.recommendedAction === 'URGENT_CLINIC_VISIT' && '🚨 জরুরি ক্লিনিক ভিজিট'}
                {result.decision.recommendedAction === 'CONTACT_HEALTH_WORKER_SOON' && '📞 শীঘ্রই স্বাস্থ্যকর্মীর সাথে যোগাযোগ করুন'}
                {result.decision.recommendedAction === 'CONTACT_HEALTH_WORKER' && '📞 স্বাস্থ্যকর্মীর সাথে যোগাযোগ করুন'}
                {result.decision.recommendedAction === 'SELF_CARE_AND_MONITOR' && '🏥 বাড়িতে থাকুন এবং পর্যবেক্ষণ করুন'}
                {!['URGENT_CLINIC_VISIT', 'CONTACT_HEALTH_WORKER_SOON', 'CONTACT_HEALTH_WORKER', 'SELF_CARE_AND_MONITOR'].includes(result.decision.recommendedAction) && result.decision.recommendedAction}
              </p>
            </div>
          )}
        </div>

        {/* Care Guidance Card */}
        {(result?.careGuidance || hasAiExplanation) && (
          <div className="rounded-2xl bg-white p-8 shadow-soft mb-8 border-l-4 border-matri-teal">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>💚</span> যত্নের নির্দেশনা
            </h2>

            {!hasAiExplanation && result?.careGuidance && (
              <div className="mt-4 mb-6 rounded-lg bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠️ এআই বিস্তারিত পরামর্শ এই মুহূর্তে উপলব্ধ নয়। নিচে চিকিৎসা নির্দেশিকা থেকে সাধারণ পরামর্শ দেওয়া হলো:
                </p>
              </div>
            )}

            {motherExplanation && (
              <div className="mt-6 mb-6 rounded-xl bg-teal-50/40 border border-teal-100/60 p-6">
                <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-line text-lg">
                  {motherExplanation}
                </p>
              </div>
            )}
            
            {stepsNow && (
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900">এখনই করণীয়:</h3>
                  <ul className="mt-3 space-y-2 text-slate-700">
                    {Array.isArray(stepsNow) ? (
                      stepsNow.map((step, idx) => (
                        <li key={idx} className="flex gap-3">
                          <span className="font-semibold text-matri-teal">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))
                    ) : (
                      <li>{stepsNow}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {monitor && monitor.length > 0 && (
              <div className="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-700">পর্যবেক্ষণ করুন:</h3>
                <ul className="mt-2 space-y-1 text-blue-700 text-sm">
                  {monitor.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {urgentWarning && urgentWarning.length > 0 && (
              <div className="mt-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
                <h3 className="font-semibold text-red-700">⚠️ জরুরি সতর্কতা:</h3>
                <ul className="mt-2 space-y-1 text-red-700 text-sm">
                  {urgentWarning.map((trigger, idx) => (
                    <li key={idx}>• {trigger}</li>
                  ))}
                </ul>
              </div>
            )}

            {evidenceSources && evidenceSources.length > 0 && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">চিকিৎসা তথ্যের উৎস (Evidence Sources):</p>
                <div className="flex flex-wrap gap-2">
                  {evidenceSources.map((src, i) => (
                    <span key={i} className="text-[11px] bg-slate-50 text-slate-600 px-3 py-1 rounded-full font-semibold border border-slate-200 shadow-sm">
                      📖 {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Care Assistant Trigger Block */}
        <div 
          onClick={() => setAssistantOpen(true)}
          className="rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 hover:bg-teal-50 p-6 shadow-sm mb-8 flex items-center justify-between cursor-pointer group transition duration-300"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl group-hover:scale-110 transition-transform">💬</span>
            <div className="text-left">
              <h3 className="font-bold text-slate-800 text-lg">এই ফলাফল নিয়ে MatriSense-কে জিজ্ঞেস করুন...</h3>
              <p className="text-xs text-slate-500">আপনার অবস্থা, লক্ষণ বা পরবর্তী যত্ন নিয়ে প্রশ্ন করুন।</p>
            </div>
          </div>
          <span className="rounded-full bg-matri-teal text-white px-3 py-1.5 shadow group-hover:translate-x-1 transition-transform">
            ➔
          </span>
        </div>

        {/* Care Assistant Overlay */}
        <CareAssistantPanel 
          sessionId={sessionId}
          riskLevel={riskLevel}
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
        />

        {/* Safety Disclaimer */}
        <div className="rounded-2xl border-l-4 border-rose-500 bg-rose-50 p-8 shadow-soft mb-8">
          <h3 className="font-bold text-rose-700 text-lg">⚠️ অত্যন্ত গুরুত্বপূর্ণ সতর্কতা</h3>
          <p className="mt-3 text-sm text-rose-700 leading-relaxed whitespace-pre-line">
            {safetyDisclaimer}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => router.push('/dashboard/patient')}
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            📊 ড্যাশবোর্ড
          </button>
          <button
            onClick={() => router.push('/triage/start')}
            className="rounded-lg bg-matri-teal px-6 py-3 font-semibold text-white hover:bg-teal-700 transition"
          >
            ➕ নতুন মূল্যায়ন
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition"
          >
            🖨️ প্রিন্ট করুন
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-500">
          <p>সেশন আইডি: {sessionId}</p>
          <p className="mt-1">এই ফলাফলগুলি সংরক্ষণ করা হয়েছে এবং আপনার চিকিৎসা রেকর্ডের অংশ।</p>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-matri-teal border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">ত্রিয়েজ ফলাফল লোড হচ্ছে...</p>
        </div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
