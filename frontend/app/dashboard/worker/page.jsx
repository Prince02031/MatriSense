'use client';

import { useAuth } from '../../context/AuthContext';

export default function WorkerDashboard() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <>
            {/* Welcome */}
            <div className="welcome-card">
                <h1>Welcome, {user.name} 👋</h1>
                <p>
                    Review patient cases, respond to alerts, and manage follow-ups.
                    Your expertise helps keep mothers safe.
                </p>
            </div>

            {/* Stats */}
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-rose">🚨</div>
                        <span className="badge badge-danger">Urgent</span>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">High-risk cases pending</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-amber">📂</div>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">Cases in queue</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">👥</div>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">Patients assigned</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">0</div>
                    <div className="dash-card-sub">Resolved this week</div>
                </div>
            </div>

            {/* Recent Cases */}
            <h2 className="section-title">📋 Recent Cases</h2>
            <div className="dash-card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Risk Level</th>
                            <th>Symptoms</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                No cases yet. Cases will appear here when patients report symptoms.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Quick Actions */}
            <h2 className="section-title" style={{ marginTop: '32px' }}>⚡ Quick Actions</h2>
            <div className="quick-actions">
                <div className="action-card">
                    <div className="action-icon icon-rose">🚨</div>
                    <div className="action-text">
                        <h3>View Alerts</h3>
                        <p>Check urgent patient notifications</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-indigo">📂</div>
                    <div className="action-text">
                        <h3>Case Queue</h3>
                        <p>Review pending triage cases</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-teal">👥</div>
                    <div className="action-text">
                        <h3>Patient List</h3>
                        <p>View all assigned patients</p>
                    </div>
                </div>
            </div>
        </>
    );
}
