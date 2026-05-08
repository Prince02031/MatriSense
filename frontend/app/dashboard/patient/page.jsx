'use client';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function PatientDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();

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
                <div className="action-card">
                    <div className="action-icon icon-indigo">📝</div>
                    <div className="action-text">
                        <h3>{t.reportSymptoms}</h3>
                        <p>{t.reportSymptomsHelp}</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-teal">📋</div>
                    <div className="action-text">
                        <h3>{t.viewHistory}</h3>
                        <p>{t.viewHistoryHelp}</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-rose">👤</div>
                    <div className="action-text">
                        <h3>{t.myProfile}</h3>
                        <p>{t.myProfileHelp}</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-emerald">📞</div>
                    <div className="action-text">
                        <h3>{t.emergencyHelp}</h3>
                        <p>{t.emergencyHelpText}</p>
                    </div>
                </div>
            </div>

            {/* Status Cards */}
            <h2 className="section-title" style={{ marginTop: '32px' }}>📊 {t.yourSummary}</h2>
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-indigo">🩺</div>
                        <span className="badge badge-success">{t.active}</span>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">{t.triageSessions}</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">📅</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">{t.nextCheckup}</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">{t.low}</div>
                    <div className="dash-card-sub">{t.currentRisk}</div>
                </div>
            </div>
        </>
    );
}
