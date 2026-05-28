'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getMyPatient } from '../../api/patientApi';
import VoiceRecorderButton from '../../../src/components/voice/VoiceRecorderButton';
import ReadAloudButton from '../../../src/components/voice/ReadAloudButton';

/**
 * TriageStartPage - Entry point for triage flow
 * Collects patient profile and symptom input
 */
export default function TriageStartPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [trimester, setTrimester] = useState('unknown');
  const [gestationalWeek, setGestationalWeek] = useState('');
  const [inputTextBn, setInputTextBn] = useState('');
  const [dangerSigns, setDangerSigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [voiceError, setVoiceError] = useState(null);

  // GPS Location states
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [address, setAddress] = useState('');

  // Auto-populate gestational week and trimester from saved patient profile
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadPatientDefaults = async () => {
      try {
        const res = await getMyPatient();
        if (res.success && res.patient) {
          const p = res.patient;
          // Set trimester if known
          if (p.trimester && p.trimester !== 'unknown') {
            setTrimester(p.trimester);
          }
          // Set gestational week directly if stored
          if (p.gestationalWeek) {
            setGestationalWeek(String(p.gestationalWeek));
          } else if (p.expectedDeliveryDate) {
            // Calculate gestational week from EDD: full term is 40 weeks
            const edd = new Date(p.expectedDeliveryDate);
            const today = new Date();
            const weeksRemaining = (edd - today) / (7 * 24 * 60 * 60 * 1000);
            const calculated = Math.round(40 - weeksRemaining);
            if (calculated >= 1 && calculated <= 42) {
              setGestationalWeek(String(calculated));
            }
          }
        }
      } catch (err) {
        // Silent fail — user can still enter manually
        console.warn('Could not load patient profile defaults:', err.message);
      }
    };
    loadPatientDefaults();
  }, [isAuthenticated]);

  // GPS Location functions
  const requestGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('আপনার ডিভাইসে GPS সমর্থিত নয়');
      return;
    }

    setGpsEnabled(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsData({
          latitude,
          longitude,
          addressOrVillage: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        });
        setAddress(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        setGpsEnabled(false);
        setGpsError(`GPS ত্রুটি: ${error.message}`);
      },
      { timeout: 10000 }
    );
  };

  const disableGPS = () => {
    setGpsEnabled(false);
    setGpsData(null);
    setGpsError(null);
    if (!address || address.startsWith('GPS:')) {
      setAddress('');
    }
  };

  const commonDangerSigns = [
    { id: 'vaginal_bleeding', labelBn: 'যোনি থেকে রক্তপাত' },
    { id: 'severe_headache', labelBn: 'তীব্র মাথাব্যথা' },
    { id: 'blurred_vision', labelBn: 'ঝাপসা দৃষ্টি' },
    { id: 'difficulty_breathing', labelBn: 'শ্বাস নিতে কষ্ট' },
    { id: 'convulsion', labelBn: 'খিঁচুনি' },
    { id: 'severe_abdominal_pain', labelBn: 'তীব্র পেটব্যথা' },
    { id: 'vomiting_repeated', labelBn: 'ক্রমাগত বমি' },
    { id: 'severe_weakness', labelBn: 'তীব্র দুর্বলতা' }
  ];

  const toggleDangerSign = (id) => {
    setDangerSigns((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleVoiceTranscript = (data) => {
    setVoiceError(null);
    if (data.transcript) {
      // Append transcript to existing text with space
      setInputTextBn((prev) =>
        prev.trim() ? `${prev} ${data.transcript}` : data.transcript
      );
    }
  };

  const handleVoiceError = (errorMsg) => {
    setVoiceError(errorMsg);
  };

  const handleStartTriage = async () => {
    if (!inputTextBn.trim()) {
      setError('অনুগ্রহ করে লক্ষণগুলি বর্ণনা করুন');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Create session with location data
      const sessionResponse = await fetch('/api/triage/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id || user?.id,
          patientId: user?.patientId,
          trimester: trimester === 'unknown' ? undefined : trimester,
          gestationalWeek: gestationalWeek ? parseInt(gestationalWeek) : undefined,
          // Location data from patient input or GPS
          division: division || undefined,
          district: district || undefined,
          upazilaOrThana: upazila || undefined,
          addressOrVillage: address || undefined,
          latitude: gpsData?.latitude,
          longitude: gpsData?.longitude,
          locationSource: gpsEnabled && gpsData ? 'gps' : 'manual'
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('সেশন তৈরি ব্যর্থ');
      }

      const session = await sessionResponse.json();
      const sessionId = session.sessionId;

      // Step 2: Run extraction
      const extractResponse = await fetch(`/api/triage/${sessionId}/extract`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputTextBn,
          checkedDangerSigns: dangerSigns
        })
      });

      if (!extractResponse.ok) {
        throw new Error('লক্ষণ নিষ্কাশন ব্যর্থ');
      }

      // Step 3: Navigate to confirmation page
      router.push(`/triage/confirm?sessionId=${sessionId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="p-6 text-center">অনুগ্রহ করে প্রথমে লগইন করুন</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-matri-soft via-blue-50 to-matri-soft">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200">
        <div className="h-1 bg-gradient-to-r from-matri-teal to-matri-green w-full"></div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 inline-block rounded-lg bg-matri-teal/10 px-4 py-2">
            <p className="text-sm font-semibold text-matri-teal">ধাপ ১ - প্রোফাইল এবং লক্ষণ</p>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">স্বাস্থ্য মূল্যায়ন</h1>
          <p className="mt-3 text-lg text-slate-600">
            আপনার বর্তমান স্বাস্থ্য অবস্থা সম্পর্কে আমাদের বলুন। আমরা আপনাকে সাহায্য করতে এখানে আছি।
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">ত্রুটি</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Patient Profile Card */}
        <div className="rounded-2xl bg-white p-8 shadow-soft mb-8">
          <h2 className="text-xl font-bold text-slate-900">গর্ভাবস্থার তথ্য</h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Trimester */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">ত্রৈমাসিক</label>
              <select
                value={trimester}
                onChange={(e) => setTrimester(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-matri-teal focus:outline-none"
              >
                <option value="unknown">নিশ্চিত নই</option>
                <option value="first">প্রথম (০-৩ মাস)</option>
                <option value="second">দ্বিতীয় (৩-৬ মাস)</option>
                <option value="third">তৃতীয় (৬-৯ মাস)</option>
              </select>
            </div>

            {/* Gestational Week */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">গর্ভকালীন সপ্তাহ (যদি জানেন)</label>
              <input
                type="number"
                min="1"
                max="40"
                value={gestationalWeek}
                onChange={(e) => setGestationalWeek(e.target.value)}
                placeholder="সপ্তাহ সংখ্যা"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Location Information Card */}
        <div className="rounded-2xl bg-white p-8 shadow-soft mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">📍 আপনার অবস্থান</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!gpsEnabled ? (
                <button
                  onClick={requestGPS}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    background: '#0ea5a8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  📡 GPS চালু করুন
                </button>
              ) : (
                <button
                  onClick={disableGPS}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ✕ GPS বন্ধ করুন
                </button>
              )}
            </div>
          </div>

          {gpsError && (
            <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', marginTop: '12px' }}>
              ⚠️ {gpsError}
            </div>
          )}

          {gpsEnabled && gpsData && (
            <div style={{ padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem', marginTop: '12px' }}>
              ✓ GPS সক্রিয়: {gpsData.latitude?.toFixed(4)}, {gpsData.longitude?.toFixed(4)}
            </div>
          )}

          <p className="mt-2 text-sm text-slate-600">
            আপনার অবস্থান তথ্য আমাদের কাছাকাছি স্বাস্থ্যসেবা খুঁজে পেতে সাহায্য করে।
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {/* Division */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">বিভাগ</label>
              <input
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="যেমন: ঢাকা, চট্টগ্রাম"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">জেলা</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="যেমন: ঢাকা, গাজীপুর"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
              />
            </div>

            {/* Upazila */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">উপজেলা/থানা</label>
              <input
                type="text"
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                placeholder="যেমন: সদর, ধানমন্ডি"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">ঠিকানা/গ্রাম</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="আপনার গ্রাম বা ঠিকানা"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Danger Signs Card */}
        <div className="rounded-2xl bg-white p-8 shadow-soft mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">জরুরি সতর্কতা চিহ্ন</h2>
            <ReadAloudButton
              text="যদি আপনি এই সতর্কতা চিহ্নগুলির মধ্যে কোনটি অনুভব করছেন তাহলে চেক করুন। এগুলি স্বয়ংক্রিয়ভাবে সনাক্ত হবে। জরুরি সেবার প্রয়োজনে অবিলম্বে একজন যোগ্য চিকিৎসককে যোগাযোগ করুন।"
              label="শুনুন"
              language="bn-BD"
              disabled={loading}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            যদি কোনোটি অনুভব করছেন তাহলে চেক করুন (এটি স্বয়ংক্রিয় সনাক্ত হবে):
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {commonDangerSigns.map((sign) => (
              <label
                key={sign.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={dangerSigns.includes(sign.id)}
                  onChange={() => toggleDangerSign(sign.id)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-slate-900">{sign.labelBn}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Symptom Input Card */}
        <div className="rounded-2xl bg-white p-8 shadow-soft mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-slate-900">আপনার লক্ষণগুলি বর্ণনা করুন</h2>
            <ReadAloudButton
              text="বাংলায় আপনি যেসব লক্ষণ অনুভব করছেন বর্ণনা করুন। যত বেশি বিস্তারিত, তত ভালো পরামর্শ পাবেন। আপনি বলতে পারেন বা লিখতে পারেন।"
              label="শুনুন"
              language="bn-BD"
              disabled={loading}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            আপনি যেসব লক্ষণ অনুভব করছেন বাংলায় বর্ণনা করুন। যত বেশি বিস্তারিত, তত ভালো পরামর্শ পাবেন।
          </p>

          <div className="mt-6 flex gap-4">
            {/* Textarea on the left */}
            <textarea
              value={inputTextBn}
              onChange={(e) => setInputTextBn(e.target.value)}
              placeholder="যেমন: আমার জ্বর আছে এবং মাথাব্যথা... দুই দিন ধরে এটি চলছে..."
              rows="6"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-matri-teal focus:outline-none"
            />

            {/* Voice input on the right */}
            <div className="flex flex-col items-center justify-start pt-2">
              <VoiceRecorderButton
                onTranscript={handleVoiceTranscript}
                onError={handleVoiceError}
                disabled={loading}
                language="bn"
              />
              {voiceError && (
                <div className="mt-3 text-xs text-red-600 text-center bg-red-50 p-2 rounded">
                  {voiceError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Character Count */}
        <div className="mb-8 text-right text-sm text-slate-600">
          {inputTextBn.length} অক্ষর ({Math.ceil(inputTextBn.split(' ').filter(w => w).length)} শব্দ)
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            বাতিল করুন
          </button>
          <button
            onClick={handleStartTriage}
            disabled={loading || !inputTextBn.trim()}
            className="flex-1 rounded-lg bg-matri-teal px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
          >
            {loading ? 'পরিচালনা করা হচ্ছে...' : 'শুরু করুন'}
          </button>
        </div>

        {/* Safety Note */}
        <div className="mt-12 rounded-lg border-l-4 border-rose-500 bg-rose-50 p-6">
          <p className="text-sm font-semibold text-rose-700">⚠️ গুরুত্বপূর্ণ:</p>
          <p className="mt-2 text-sm text-rose-600">
            এটি একটি স্বয়ংক্রিয় মূল্যায়ন সরঞ্জাম। জরুরি সেবার প্রয়োজনে অবিলম্বে একজন যোগ্য চিকিৎসককে যোগাযোগ করুন বা জরুরি সেবা ডায়াল করুন।
          </p>
        </div>
      </div>
    </main>
  );
}
