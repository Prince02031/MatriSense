'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import Link from 'next/link';

export default function PatientHistoryPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    if (!user?._id && !user?.id) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        // Get token from localStorage for API call
        const token = localStorage.getItem('matrisense_token');
        const userId = user?._id || user?.id;
        const url = new URL('/api/patient/history', window.location.origin);
        url.searchParams.set('patientId', userId);
        url.searchParams.set('limit', '50');
        if (token) url.searchParams.set('token', token);

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        } else {
          setError('Failed to load history');
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError('Error loading history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?._id, user?.id]);

  if (!user) return null;

  const riskBadgeClass = (risk) =>
    risk === 'HIGH' ? 'badge-danger' : risk === 'MEDIUM' ? 'badge-warning' : 'badge-success';

  const riskIcon = (risk) => (risk === 'HIGH' ? '🚨' : risk === 'MEDIUM' ? '⚠️' : '✅');

  return (
    <div className="dashboard-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <Link href="/dashboard/patient" style={{ color: 'var(--accent-primary)', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>📋 Triage History</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Every past triage result and assessment, most recent first.
      </p>

      {loading ? (
        <p>Loading history...</p>
      ) : error ? (
        <div style={{ color: 'var(--accent-rose)', padding: '16px', background: 'rgba(251, 113, 133, 0.1)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No triage sessions yet.</p>
          <Link href="/triage/start" style={{ color: 'var(--accent-primary)', marginTop: '16px', display: 'inline-block' }}>
            Start a new triage →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map((session) => (
            <div key={session.sessionId} className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {session.triageDate}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge ${riskBadgeClass(session.riskLevel)}`}>
                      {riskIcon(session.riskLevel)} {session.riskLevel} risk
                    </span>
                  </div>
                </div>
                <span className="badge badge-info">{session.status}</span>
              </div>

              {session.symptoms.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Reported Symptoms
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {session.symptoms.map((symptom, i) => (
                      <span key={i} className="badge badge-info">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {session.recommendedAction && (
                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {session.recommendedAction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
