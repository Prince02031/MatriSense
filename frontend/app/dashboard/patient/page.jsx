'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useState, useEffect } from 'react';

export default function PatientDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [summary, setSummary] = useState({
        totalSessions: 0,
        latestRisk: 'LOW',
        latestDate: null,
        nextCheckupDate: null
    });
    const [loading, setLoading] = useState(true);

    // GPS request-response state
    const [gpsRequestedSession, setGpsRequestedSession] = useState(null);
    const [sharingGps, setSharingGps] = useState(false);
    const [gpsShared, setGpsShared] = useState(false);
    const [gpsShareError, setGpsShareError] = useState(null);

    useEffect(() => {
        // Skip on server-side rendering
        if (typeof window === 'undefined') return;

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
                url.searchParams.set('limit', '1');
                if (token) url.searchParams.set('token', token);

                const response = await fetch(url.toString());
                if (response.ok) {
                    const data = await response.json();
                    setSummary({
                        totalSessions: data.total || 0,
                        latestRisk: data.latest?.riskLevel || 'LOW',
                        latestDate: data.latest?.createdAt ? new Date(data.latest.createdAt).toLocaleDateString() : null,
                        nextCheckupDate: data.latest?.nextCheckupDate
                            ? new Date(data.latest.nextCheckupDate).toLocaleDateString()
                            : null
                    });

                    // Check if latest session has a GPS request from health worker
                    if (data.latest?.sessionId) {
                        try {
                            const statusResp = await fetch(`/api/triage/${data.latest.sessionId}/status`);
                            if (statusResp.ok) {
                                const statusData = await statusResp.json();
                                if (statusData.gpsRequested) {
                                    setGpsRequestedSession(data.latest.sessionId);
                                }
                            }
                        } catch (err) {
                            console.warn('Failed to check GPS request status:', err.message);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user?._id, user?.id]);

    const handleShareGPS = async () => {
        if (!navigator.geolocation) {
            setGpsShareError('আপনার ডিভাইসে GPS সমর্থিত নয়');
            return;
        }

        setSharingGps(true);
        setGpsShareError(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const resp = await fetch(`/api/triage/${gpsRequestedSession}/respond-gps`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude })
                    });
                    const data = await resp.json();
                    if (data.success) {
                        setGpsShared(true);
                        setGpsRequestedSession(null);
                    } else {
                        setGpsShareError(data.error || 'Failed to share location');
                    }
                } catch (err) {
                    setGpsShareError('নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।');
                } finally {
                    setSharingGps(false);
                }
            },
            (error) => {
                setSharingGps(false);
                setGpsShareError(`GPS ত্রুটি: ${error.message}`);
            },
            { timeout: 15000 }
        );
    };

    if (!user) return null;

    return (
        <>
            {/* Welcome */}
            <div className="welcome-card">
                <h1>{t.patientWelcome}, {user.name} 👋</h1>
                <p>
                    {t.patientLead}
                </p>
            </div>

            {/* GPS Request Banner */}
            {gpsRequestedSession && !gpsShared && (
                <div style={{
                    margin: '0 0 24px 0',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(14, 165, 168, 0.1), rgba(59, 130, 246, 0.1))',
                    border: '2px solid rgba(14, 165, 168, 0.4)',
                    borderRadius: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📍</span>
                        <div>
                            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                                স্বাস্থ্যকর্মী আপনার অবস্থান জানতে চান
                            </strong>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                আপনার স্বাস্থ্যকর্মী আপনার বর্তমান অবস্থান অনুরোধ করেছেন। এটি আপনার কাছাকাছি হাসপাতাল খুঁজে পেতে সাহায্য করবে।
                            </p>
                        </div>
                    </div>
                    {gpsShareError && (
                        <div style={{ padding: '8px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '8px', fontSize: '0.85rem' }}>
                            ⚠️ {gpsShareError}
                        </div>
                    )}
                    <button
                        onClick={handleShareGPS}
                        disabled={sharingGps}
                        style={{
                            padding: '10px 20px',
                            background: sharingGps ? '#94a3b8' : '#0ea5a8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: sharingGps ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            width: '100%'
                        }}
                    >
                        {sharingGps ? '📡 অবস্থান শেয়ার করা হচ্ছে...' : '📡 আমার অবস্থান শেয়ার করুন'}
                    </button>
                </div>
            )}

            {gpsShared && (
                <div style={{
                    margin: '0 0 24px 0',
                    padding: '12px 16px',
                    background: '#d1fae5',
                    color: '#065f46',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                }}>
                    ✓ আপনার অবস্থান সফলভাবে শেয়ার করা হয়েছে। আপনার স্বাস্থ্যকর্মী এখন এটি দেখতে পারবেন।
                </div>
            )}

            {/* Quick Actions */}
            <h2 className="section-title">⚡ {t.quickActions}</h2>
            <div className="quick-actions">
                <Link href="/triage/start" className="action-card">
                    <div className="action-icon icon-indigo">📝</div>
                    <div className="action-text">
                        <h3>{t.reportSymptoms}</h3>
                        <p>{t.reportSymptomsHelp}</p>
                    </div>
                </Link>
                <Link href="/dashboard/patient/referrals" className="action-card">
                    <div className="action-icon icon-green">🏥</div>
                    <div className="action-text">
                        <h3>{t.healthWorkerReferrals}</h3>
                        <p>{t.healthWorkerReferralsHelp}</p>
                    </div>
                </Link>
                <Link href="/dashboard/patient/history" className="action-card">
                    <div className="action-icon icon-teal">📋</div>
                    <div className="action-text">
                        <h3>{t.viewHistory}</h3>
                        <p>{t.viewHistoryHelp}</p>
                    </div>
                </Link>
                <Link href="/dashboard/patient/profile" className="action-card">
                    <div className="action-icon icon-rose">👤</div>
                    <div className="action-text">
                        <h3>{t.myProfile}</h3>
                        <p>{t.myProfileHelp}</p>
                    </div>
                </Link>
                <a href="tel:999" className="action-card" target="_blank" rel="noopener noreferrer">
                    <div className="action-icon icon-emerald">📞</div>
                    <div className="action-text">
                        <h3>{t.emergencyHelp}</h3>
                        <p>{t.emergencyHelpText}</p>
                    </div>
                </a>
            </div>

            {/* Status Cards */}
            <h2 className="section-title" style={{ marginTop: '32px' }}>📊 {t.yourSummary}</h2>
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-indigo">🩺</div>
                        <span className="badge badge-success">{t.active}</span>
                    </div>
                    <div className="dash-card-value">{loading ? '...' : summary.totalSessions}</div>
                    <div className="dash-card-sub">{t.triageSessions}</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">📅</div>
                    </div>
                    <div className="dash-card-value">{loading ? '...' : (summary.nextCheckupDate || summary.latestDate || '—')}</div>
                    <div className="dash-card-sub">{t.nextCheckup}</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">{loading ? '...' : summary.latestRisk}</div>
                    <div className="dash-card-sub">{t.currentRisk}</div>
                </div>
            </div>
        </>
    );
}
