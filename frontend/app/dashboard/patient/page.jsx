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
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user?._id, user?.id]);

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
