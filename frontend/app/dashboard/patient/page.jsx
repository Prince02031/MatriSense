'use client';

import { useAuth } from '../../context/AuthContext';

export default function PatientDashboard() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <>
            {/* Welcome */}
            <div className="welcome-card">
                <h1>Welcome, {user.name} 👋</h1>
                <p>
                    Your maternal health companion. Report symptoms, track your pregnancy,
                    and stay connected with health workers — all in Bangla.
                </p>
            </div>

            {/* Quick Actions */}
            <h2 className="section-title">⚡ Quick Actions</h2>
            <div className="quick-actions">
                <div className="action-card">
                    <div className="action-icon icon-indigo">📝</div>
                    <div className="action-text">
                        <h3>Report Symptoms</h3>
                        <p>Describe how you&apos;re feeling in Bangla</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-teal">📋</div>
                    <div className="action-text">
                        <h3>View History</h3>
                        <p>See past triage sessions and results</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-rose">👤</div>
                    <div className="action-text">
                        <h3>My Profile</h3>
                        <p>Update pregnancy info and contacts</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-emerald">📞</div>
                    <div className="action-text">
                        <h3>Emergency Help</h3>
                        <p>Contact a health worker immediately</p>
                    </div>
                </div>
            </div>

            {/* Status Cards */}
            <h2 className="section-title" style={{ marginTop: '32px' }}>📊 Your Summary</h2>
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-indigo">🩺</div>
                        <span className="badge badge-success">Active</span>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">Triage sessions</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">📅</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Next checkup date</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">Low</div>
                    <div className="dash-card-sub">Current risk level</div>
                </div>
            </div>
        </>
    );
}
