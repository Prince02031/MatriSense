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

  return (
    <div className="dashboard-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <Link href="/dashboard/patient" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Dashboard
      </Link>

      <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>📋 Triage History</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        View all your past triage results and assessments
      </p>

      {loading ? (
        <p>Loading history...</p>
      ) : error ? (
        <div style={{ color: 'var(--red-600)', padding: '16px', backgroundColor: 'var(--red-50)', borderRadius: '8px' }}>
          {error}
        </div>
      ) : history.length === 0 ? (
        <div style={{ 
          padding: '32px', 
          backgroundColor: 'var(--surface)', 
          borderRadius: '8px', 
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <p>No triage sessions yet.</p>
          <Link href="/triage/start" style={{ color: 'var(--primary)', marginTop: '16px', display: 'inline-block' }}>
            Start a new triage →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map((session) => (
            <div
              key={session.sessionId}
              style={{
                padding: '16px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                backgroundColor: 'var(--surface)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {session.triageDate}
                  </div>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    marginTop: '4px',
                    color: session.riskLevel === 'HIGH' ? 'var(--red-600)' : 
                           session.riskLevel === 'MEDIUM' ? 'var(--yellow-600)' : 
                           'var(--green-600)'
                  }}>
                    Risk Level: {session.riskLevel}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    backgroundColor: session.status === 'completed' ? 'var(--green-100)' : 'var(--yellow-100)',
                    color: session.status === 'completed' ? 'var(--green-700)' : 'var(--yellow-700)',
                    borderRadius: '4px'
                  }}>
                    {session.status}
                  </span>
                </div>
              </div>

              {session.symptoms.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Reported Symptoms:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {session.symptoms.map((symptom, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--indigo-100)',
                          color: 'var(--indigo-700)',
                          borderRadius: '4px'
                        }}
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {session.recommendedAction}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
