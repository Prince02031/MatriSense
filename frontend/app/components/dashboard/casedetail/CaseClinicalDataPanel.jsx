'use client';

import { useEffect, useState } from 'react';
import { getCaseClinicalData } from '../../../api/workerApi';
import ClinicalParameterDetail from '../ClinicalParameterDetail';

const SEVERITY_BADGE = {
    NORMAL: 'badge-success',
    WARNING: 'badge-warning',
    CRITICAL: 'badge-danger',
};

const SEVERITY_ICON = {
    NORMAL: '✅',
    WARNING: '⚠️',
    CRITICAL: '🚨',
};

const SOURCE_LABEL = {
    DOCUMENT_UPLOAD: '📄 Document',
    CHAT_SCAN: '💬 Chat Scan',
};

// One card per distinct parameter, latest reading on top — mirrors the
// patient-facing /dashboard/patient/clinical-data grouping so a worker sees
// the same at-a-glance history, gated on the same document-sharing consent.
const groupByParameter = (dataPoints) => {
    const map = new Map();

    dataPoints.forEach((dp) => {
        if (!map.has(dp.parameter)) {
            map.set(dp.parameter, {
                parameter: dp.parameter,
                displayName: dp.displayName || dp.parameter,
                displayNameBn: dp.displayNameBn,
                history: [],
            });
        }
        map.get(dp.parameter).history.push(dp);
    });

    return Array.from(map.values())
        .map((group) => {
            const sorted = [...group.history].sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
            return { ...group, history: sorted, latest: sorted[0] };
        })
        .sort((a, b) => new Date(b.latest.recordedAt) - new Date(a.latest.recordedAt));
};

export default function CaseClinicalDataPanel({ sessionId }) {
    const [dataPoints, setDataPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [consentDenied, setConsentDenied] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        if (!sessionId) return;

        const fetchData = async () => {
            try {
                const res = await getCaseClinicalData(sessionId);
                if (res.success) {
                    setDataPoints(res.dataPoints || []);
                    if (res.consentDenied) setConsentDenied(true);
                } else {
                    setError(res.error || 'Failed to load clinical data');
                }
            } catch (err) {
                console.error(err);
                setError('An error occurred loading clinical data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="dash-card">
                <h3>🩺 Clinical Data History</h3>
                <p style={{ color: 'var(--text-muted)' }}>Loading clinical data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-card">
                <h3>🩺 Clinical Data History</h3>
                <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
        );
    }

    if (consentDenied) {
        return (
            <div className="dash-card">
                <h3>🩺 Clinical Data History</h3>
                <div style={{
                    padding: '12px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    marginTop: '12px'
                }}>
                    <p style={{ color: 'var(--accent-amber)', fontWeight: '600', fontSize: '0.9rem', margin: '0 0 4px 0' }}>
                        ⚠️ Consent Not Granted
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                        This patient has not enabled document/clinical data sharing with health workers.
                    </p>
                </div>
            </div>
        );
    }

    const groups = groupByParameter(dataPoints);

    if (groups.length === 0) {
        return (
            <div className="dash-card">
                <h3>🩺 Clinical Data History</h3>
                <p style={{ color: 'var(--text-muted)' }}>No clinical data collected for this patient yet.</p>
            </div>
        );
    }

    return (
        <div className="dash-card">
            <h3>🩺 Clinical Data History</h3>
            <div className="dash-grid" style={{ marginTop: '16px', marginBottom: 0 }}>
                {groups.map((group) => (
                    <div
                        key={group.parameter}
                        className="dash-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedGroup(group)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedGroup(group);
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.displayName}</div>
                            {group.latest.severity && (
                                <span className={`badge ${SEVERITY_BADGE[group.latest.severity]}`}>
                                    {SEVERITY_ICON[group.latest.severity]} {group.latest.severity}
                                </span>
                            )}
                        </div>

                        {group.latest.value != null && (
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '10px' }}>
                                {group.latest.value}{' '}
                                <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{group.latest.unit}</span>
                            </div>
                        )}

                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                            {SOURCE_LABEL[group.latest.source] || group.latest.source} · {new Date(group.latest.recordedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {group.history.length} record{group.history.length > 1 ? 's' : ''} · click for history &amp; trend
                        </div>
                    </div>
                ))}
            </div>

            {selectedGroup && (
                <ClinicalParameterDetail group={selectedGroup} onClose={() => setSelectedGroup(null)} />
            )}
        </div>
    );
}
