'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Added for programmatic navigation
import { useAuth } from '../../context/AuthContext';
import { getWorkerCases } from '../../api/workerApi';
import CasePriorityBadge from '../../components/dashboard/CasePriorityBadge';
import RiskBadge from '../../components/dashboard/RiskBadge';
import CaseStatusBadge from '../../components/dashboard/CaseStatusBadge';

export default function WorkerDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCases() {
            try {
                const data = await getWorkerCases();
                if (data.success) {
                    setCases(data.cases);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchCases();
    }, []);

    if (!user) return null;

    // Helper to handle the "Go to dashboard" button specifically for Workers
    const handleGoToDashboard = () => {
        router.push('/dashboard/worker');
    };

    const urgentCases = cases.filter(c => c.decision?.riskLevel === 'HIGH');
    const resolvedCases = cases.filter(c => c.status === 'RESOLVED');

    const riskOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    const sortedCases = [...cases].sort((a, b) => {
        const riskA = riskOrder[a.decision?.riskLevel] || 4;
        const riskB = riskOrder[b.decision?.riskLevel] || 4;

        if (riskA !== riskB) {
            return riskA - riskB;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return (
        <>
            {/* Welcome Card Updated with Dashboard Button */}
            <div className="welcome-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>Welcome, {user.name || 'Health Worker'} 👋</h1>
                        <p style={{ maxWidth: '600px' }}>
                            Review patient cases, respond to alerts, and manage follow-ups.
                            Your expertise helps keep mothers safe.
                        </p>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleGoToDashboard}
                                className="btn btn-primary"
                            >
                                Go to dashboard
                            </button>
                        </div>
                    </div>
                    {/* Optional: Role Badge to verify it's the worker portal */}
                    <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                        {user.role?.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="dash-grid" style={{ marginBottom: '32px' }}>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-rose">🚨</div>
                        <span className="badge badge-danger">Urgent</span>
                    </div>
                    <div className="dash-card-value">{urgentCases.length}</div>
                    <div className="dash-card-sub">High-risk cases pending</div>
                </div>
                {/* ... other stat cards remain same ... */}
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-amber">📂</div>
                    </div>
                    <div className="dash-card-value">{cases.length}</div>
                    <div className="dash-card-sub">Cases in queue</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">👥</div>
                    </div>
                    <div className="dash-card-value">{new Set(cases.map(c => c.patientId?._id).filter(Boolean)).size}</div>
                    <div className="dash-card-sub">Patients assigned</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">{resolvedCases.length}</div>
                    <div className="dash-card-sub">Resolved this week</div>
                </div>
            </div>

            {/* Recent Cases */}
            <h2 className="section-title">📋 Triaged Patient Cases</h2>
            <div className="dash-card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Patient Info</th>
                            <th>Trimester</th>
                            <th>Main Symptoms</th>
                            <th>Risk & Priority</th>
                            <th>Recommended Action</th>
                            <th>Status</th>
                            <th>Time</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan="8" style={{ textAlign: 'center' }}>Loading cases...</td></tr>}
                        {!loading && sortedCases.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No cases yet. Cases will appear here when patients report symptoms.
                                </td>
                            </tr>
                        )}
                        {!loading && sortedCases.map(c => (
                            <tr key={c._id} className={c.decision?.riskLevel === 'HIGH' ? 'urgent-row' : ''}>
                                <td>
                                    <strong>{c.patientId?.name || c.caseState?.profile?.name || 'Anonymous Patient'}</strong> <br />
                                    <small>{c.patientId?.age ? `${c.patientId.age} yrs` : c.caseState?.profile?.age ? `${c.caseState.profile.age} yrs` : 'Age N/A'}</small>
                                </td>
                                <td>{c.caseState?.trimester || c.patientId?.trimester || c.caseState?.profile?.trimester || 'Unknown'}</td>
                                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.caseState?.symptoms?.join(', ') || 'N/A'}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                        <RiskBadge riskLevel={c.decision?.riskLevel} />
                                        <CasePriorityBadge priority={c.decision?.priority} />
                                    </div>
                                </td>
                                <td style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                                    <small>{c.decision?.recommendedAction?.replace(/_/g, ' ') || 'Pending Action'}</small>
                                </td>
                                <td>
                                    <CaseStatusBadge status={c.status} />
                                </td>
                                <td>
                                    <small>{new Date(c.createdAt).toLocaleString()}</small>
                                </td>
                                <td>
                                    {/* Updated Link to ensure it goes to the deep-linked case detail within worker dashboard */}
                                    <Link href={`/dashboard/worker/${c._id}`}>
                                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                                            View
                                        </button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}