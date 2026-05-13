'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

/**
 * FollowUpPage - Phase 3
 * User answers follow-up questions to refine the triage
 */
export default function FollowUpPage() {
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
      const response = await fetch(`/api/triage/${sessionId}/follow-up`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch follow-up questions');
      const data = await response.json();
      
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
      
      const response = await fetch(`/api/triage/${sessionId}/answers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArray })
      });
      
      if (!response.ok) throw new Error('Failed to submit answers');
      
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">অনুসরণ প্রশ্ন</h1>
          <p className="mt-2 text-slate-600">
            আপনার অবস্থা আরও ভালভাবে বুঝতে কয়েকটি প্রশ্ন জিজ্ঞাসা করছি।
          </p>
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
          <h2 className="text-xl font-semibold text-slate-900">
            {currentQuestion?.textBn || currentQuestion?.text}
          </h2>

          {/* Answer Options */}
          <div className="mt-6 space-y-3">
            {currentQuestion?.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-4 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option.value}
                  checked={answers[currentQuestion.id] === option.value}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-slate-900">
                  {option.labelBn || option.label}
                </span>
              </label>
            ))}
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
