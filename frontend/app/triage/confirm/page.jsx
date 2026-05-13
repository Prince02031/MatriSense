'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

/**
 * ConfirmSymptomsPage - Phase 2
 * User reviews and confirms/edits extracted symptoms
 * Before proceeding to follow-up questions
 */
export default function ConfirmSymptomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const sessionId = searchParams.get('sessionId');
  
  const [session, setSession] = useState(null);
  const [editedSymptoms, setEditedSymptoms] = useState([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // Fetch extraction result
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }
    
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/triage/${sessionId}/status`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      
      setSession(data);
      setEditedSymptoms(data.caseState?.symptoms || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymptom = () => {
    if (newSymptom.trim() && !editedSymptoms.includes(newSymptom.trim())) {
      setEditedSymptoms([...editedSymptoms, newSymptom.trim()]);
      setNewSymptom('');
    }
  };

  const handleRemoveSymptom = (symptom) => {
    setEditedSymptoms(editedSymptoms.filter(s => s !== symptom));
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      setError(null);
      
      const response = await fetch(`/api/triage/${sessionId}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedSymptoms: editedSymptoms,
          editedByUser: JSON.stringify(editedSymptoms) !== JSON.stringify(session.caseState?.symptoms || [])
        })
      });
      
      if (!response.ok) throw new Error('Failed to confirm symptoms');
      
      // Redirect to follow-up questions
      router.push(`/triage/followup?sessionId=${sessionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
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
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-matri-teal"></div>
            <p className="mt-4 text-slate-600 font-semibold">আপনার তথ্য লোড করা হচ্ছে...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-matri-soft via-blue-50 to-matri-soft">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200">
        <div className="h-1 bg-gradient-to-r from-matri-teal to-matri-green w-1/3"></div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-block rounded-lg bg-matri-teal/10 px-4 py-2">
            <p className="text-sm font-semibold text-matri-teal">ধাপ ২ - লক্ষণ নিশ্চিতকরণ</p>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">নিষ্কাশিত লক্ষণ পর্যালোচনা করুন</h1>
          <p className="mt-2 text-slate-600">
            আমরা আপনার ইনপুট থেকে এই লক্ষণগুলি চিহ্নিত করেছি। আপনি সঠিক কিনা তা যাচাই করুন অথবা প্রয়োজন অনুসারে সম্পাদনা করুন।
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">ত্রুটি</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Symptoms Card */}
        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">বর্তমান লক্ষণ</h2>
          <p className="mt-1 text-sm text-slate-600">
            {editedSymptoms.length} টি লক্ষণ
          </p>

          {/* Symptom List */}
          <div className="mt-6 space-y-2">
            {editedSymptoms.length > 0 ? (
              editedSymptoms.map((symptom) => (
                <div
                  key={symptom}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-slate-900">{symptom}</span>
                  <button
                    onClick={() => handleRemoveSymptom(symptom)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    মুছুন
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">কোনো লক্ষণ যোগ করুন</p>
            )}
          </div>

          {/* Add Symptom */}
          <div className="mt-6 flex gap-2">
            <input
              type="text"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSymptom()}
              placeholder="নতুন লক্ষণ যোগ করুন..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
            />
            <button
              onClick={handleAddSymptom}
              className="rounded-lg bg-matri-teal px-4 py-2 font-semibold text-white hover:bg-teal-700"
            >
              যোগ করুন
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            পিছিয়ে যান
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || editedSymptoms.length === 0}
            className="flex-1 rounded-lg bg-matri-teal px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {confirming ? 'সংরক্ষণ করা হচ্ছে...' : 'সংশোধন সম্পূর্ণ করুন'}
          </button>
        </div>
      </div>
    </main>
  );
}
