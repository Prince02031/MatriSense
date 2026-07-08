'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getMyClinicalData } from '../../../api/patientApi';
import ClinicalParameterDetail from '../../../components/dashboard/ClinicalParameterDetail';

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

// One card per distinct parameter (e.g. "creatinine"), latest reading on top,
// full chronological history kept underneath for the detail modal + chart.
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

export default function ClinicalDataPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const ct = t.clinicalDataPage || {};
    const SEVERITY_LABEL = { NORMAL: ct.normal, WARNING: ct.warning, CRITICAL: ct.critical };
    const SOURCE_LABEL = { DOCUMENT_UPLOAD: ct.sourceDocument, CHAT_SCAN: ct.sourceChatScan };

    const [dataPoints, setDataPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const data = await getMyClinicalData();
                if (data.success) {
                    setDataPoints(data.dataPoints || []);
                } else {
                    setError(data.error || ct.errorLoading);
                }
            } catch (err) {
                console.error('[ClinicalDataPage] fetch error:', err);
                setError(ct.errorLoading);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (!user) return null;

    const groups = groupByParameter(dataPoints);

    return (
        <div className="dashboard-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <Link href="/dashboard/patient" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-block' }}>
                {ct.backToDashboard || '← Back to Dashboard'}
            </Link>

            <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>{ct.title || '🩺 My Clinical Data'}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>{ct.subtitle}</p>

            {loading ? (
                <p>{ct.loading || 'Loading clinical data...'}</p>
            ) : error ? (
                <div style={{ color: 'var(--red-600)', padding: '16px', backgroundColor: 'var(--red-50)', borderRadius: '8px' }}>
                    {error}
                </div>
            ) : groups.length === 0 ? (
                <div className="dash-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>{ct.noData || 'No clinical data collected yet.'}</p>
                    <Link href="/dashboard/patient/documents" style={{ color: 'var(--primary)', marginTop: '16px', display: 'inline-block' }}>
                        {ct.uploadCta || 'Upload a document →'}
                    </Link>
                </div>
            ) : (
                <div className="dash-grid">
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
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {language === 'bn' && group.displayNameBn ? group.displayNameBn : group.displayName}
                                </div>
                                {group.latest.severity && (
                                    <span className={`badge ${SEVERITY_BADGE[group.latest.severity]}`}>
                                        {SEVERITY_ICON[group.latest.severity]} {SEVERITY_LABEL[group.latest.severity] || group.latest.severity}
                                    </span>
                                )}
                            </div>

                            {group.latest.value != null && (
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '10px' }}>
                                    {group.latest.value}{' '}
                                    <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{group.latest.unit}</span>
                                </div>
                            )}

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                                {SOURCE_LABEL[group.latest.source] || group.latest.source} · {new Date(group.latest.recordedAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {group.history.length} {group.history.length > 1 ? (ct.records || 'records') : (ct.record || 'record')} · {ct.clickForHistory || 'click for history & trend'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedGroup && (
                <ClinicalParameterDetail group={selectedGroup} onClose={() => setSelectedGroup(null)} />
            )}
        </div>
    );
}
