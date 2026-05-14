'use client';

import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <>
            {/* Welcome */}
            <div className="welcome-card">
                <h1>Welcome, {user.name} 👋</h1>
                <p>
                    System administration panel. Monitor platform health,
                    manage users, and review analytics.
                </p>
            </div>

            {/* System Stats */}
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-indigo">👥</div>
                        <span className="badge badge-info">Users</span>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Total registered users</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">🩺</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Total triage sessions</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-rose">🚨</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">High-risk cases (this week)</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">🟢</div>
                    </div>
                    <div className="dash-card-value">Online</div>
                    <div className="dash-card-sub">System status</div>
                </div>
            </div>

            {/* User Overview */}
            <h2 className="section-title">👤 User Overview</h2>
            <div className="dash-grid">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">🤰</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Patients registered</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-indigo">👩‍⚕️</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Health workers</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-amber">🛡️</div>
                    </div>
                    <div className="dash-card-value">—</div>
                    <div className="dash-card-sub">Admins</div>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="section-title">⚡ Quick Actions</h2>
            <div className="quick-actions">
                <div className="action-card">
                    <div className="action-icon icon-indigo">👥</div>
                    <div className="action-text">
                        <h3>Manage Users</h3>
                        <p>View, edit, and manage all accounts</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-teal">📊</div>
                    <div className="action-text">
                        <h3>Analytics</h3>
                        <p>View platform usage statistics</p>
                    </div>
                </div>
                <div className="action-card">
                    <div className="action-icon icon-amber">⚙️</div>
                    <div className="action-text">
                        <h3>Settings</h3>
                        <p>Configure system preferences</p>
                    </div>
                </div>
            </div>
        </>
    );
}
