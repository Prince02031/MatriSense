'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getFollowUpQuestions, submitFollowUpAnswers } from '../../api/triageApi';
import ReadAloudButton from '../../../src/components/voice/ReadAloudButton';

/**
 * FollowUpPage - Phase 3
 * User answers follow-up questions to refine the triage
 */
function FollowUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const sessionId = searchParams.get('sessionId');

  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch follow-up questions
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }

    fetchFollowUpQuestions();
  }, [sessionId]);

  const fetchFollowUpQuestions = async () => {
    try {
      setLoading(true);
      const data = await getFollowUpQuestions(sessionId);

      setFollowUpQuestions(data.questions || []);
      const initialAnswers = {};
      data.questions?.forEach((q) => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < followUpQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const answersArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value
      }));

      await submitFollowUpAnswers(sessionId, answersArray);

      // Redirect to triage run (which will calculate decision)
      router.push(`/triage/result?sessionId=${sessionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="p-6 text-center">Please log in first</div>;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-matri-soft">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-soft">
            <p className="text-slate-600">লোড হচ্ছে...</p>
          </div>
        </div>
      </main>
    );
  }

  if (followUpQuestions.length === 0) {
    return (
      <main className="min-h-screen bg-matri-soft">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 text-center shadow-soft">
            <p className="text-slate-600">কোনো অনুসরণ প্রশ্ন নেই</p>
            <button
              onClick={() => router.push(`/triage/result?sessionId=${sessionId}`)}
              className="mt-4 rounded-lg bg-matri-teal px-6 py-2 font-semibold text-white"
            >
              ফলাফলে যান
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentQuestion = followUpQuestions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / followUpQuestions.length) * 100);

  return (
    <main className="min-h-screen bg-matri-soft">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">অনুসরণ প্রশ্ন</h1>
            <p className="mt-2 text-slate-600">
              আপনার অবস্থা আরও ভালভাবে বুঝতে কয়েকটি প্রশ্ন জিজ্ঞাসা করছি।
            </p>
          </div>
          <ReadAloudButton
            text="আপনার অবস্থা আরও ভালভাবে বুঝতে কয়েকটি প্রশ্ন জিজ্ঞাসা করছি। প্রতিটি প্রশ্নের উত্তর দিন এবং তারপর পরবর্তী প্রশ্নে যান।"
            label="শুনুন"
            language="bn-BD"
            disabled={submitting}
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-600">
              প্রশ্ন {currentQuestionIndex + 1} এর {followUpQuestions.length}
            </p>
            <p className="text-sm font-semibold text-slate-600">{progress}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-matri-teal transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">ত্রুটি</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Question Card */}
        <div className="rounded-2xl bg-white p-8 shadow-soft">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-xl font-semibold text-slate-900 flex-1">
              {currentQuestion?.questionBn || currentQuestion?.textBn || currentQuestion?.text}
            </h2>
            <ReadAloudButton
              text={currentQuestion?.questionBn || currentQuestion?.textBn || currentQuestion?.text}
              label="শুনুন"
              language="bn-BD"
              disabled={submitting}
            />
          </div>

          {/* Answer Options */}
          <div className="mt-6 space-y-3">
            {currentQuestion?.options
              ?.filter((opt) => opt.value !== 'unknown')
              .map((option) => {
                const rawAnswer = answers[currentQuestion.id];
                const isSelected = String(rawAnswer) === String(option.value);
                const isNegative = option.value === false || option.labelBn === 'না' || option.label === 'No';

                let activeClasses = 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm';
                let textClasses = 'text-slate-600';

                if (isSelected) {
                  if (isNegative) {
                    activeClasses = 'bg-rose-400 border-rose-500 shadow-lg scale-[1.05] ring-4 ring-rose-100';
                    textClasses = 'text-white';
                  } else {
                    activeClasses = 'bg-matri-teal border-teal-600 shadow-lg scale-[1.05] ring-4 ring-teal-100';
                    textClasses = 'text-white';
                  }
                }

                return (
                  <label
                    key={option.value}
                    className={`relative flex items-center justify-center p-8 rounded-2xl border-2 transition-all cursor-pointer text-center group ${activeClasses}`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={String(option.value)}
                      checked={isSelected}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />

                    <span className={`text-2xl font-bold transition-colors ${textClasses}`}>
                      {option.labelBn || option.label}
                    </span>

                    {/* Corner Indicator */}
                    {isSelected && (
                      <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center shadow-inner bg-white/20`}>
                        {isNegative ? (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            পিছিয়ে যান
          </button>
          {currentQuestionIndex < followUpQuestions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
              className="flex-1 rounded-lg bg-matri-teal px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
            >
              পরবর্তী
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !answers[currentQuestion.id]}
              className="flex-1 rounded-lg bg-matri-green px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
            >
              {submitting ? 'সম্পূর্ণ হচ্ছে...' : 'সম্পূর্ণ করুন'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function FollowUpPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-matri-teal border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm font-medium text-slate-600">অনুসন্ধানমূলক প্রশ্নাবলী লোড হচ্ছে...</p>
        </div>
      </div>
    }>
      <FollowUpPageContent />
    </Suspense>
  );
}
