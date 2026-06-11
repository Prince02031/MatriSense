'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getWorkerCases } from '../../../api/workerApi';
import RiskBadge from '../../../components/dashboard/RiskBadge';
import CaseStatusBadge from '../../../components/dashboard/CaseStatusBadge';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';

export default function WorkerPatientListPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [patients, setPatients] = useState([]); // Grouped by patient
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedPatient, setExpandedPatient] = useState(null); // which patient's sessions are open

    const isFetchingRef = useRef(false);
    const hasInitialLoaded = useRef(false);

    const getCacheKey = useCallback(() => {
        return user?._id ? `ms_patient_list_${user._id}` : null;
    }, [user?._id]);

    const fetchAllCases = useCallback(async (isSilent = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            if (!isSilent) setLoading(true);
            console.info('--- Fetching Patient List from SERVER ---');

            // Fetch a large batch (up to 200) to ensure we get all cases for grouping
            const data = await getWorkerCases(200, 0, 'all', 'date');

            if (data.success) {
                const grouped = groupByPatient(data.cases);
                setPatients(grouped);

                // Update cache
                const cacheKey = getCacheKey();
                if (cacheKey) {
                    localStorage.setItem(cacheKey, JSON.stringify(grouped));
                }

                // Auto-expand first patient if none expanded yet
                setExpandedPatient(prev => {
                    if (prev === null && grouped.length > 0) return grouped[0].patientKey;
                    return prev;
                });
            }
        } catch (err) {
            console.error('Failed to fetch cases:', err);
            // Only show error if we have no data at all and it's not a background fetch
            // In this specific UI, we don't have a separate error state variable, 
            // but we avoid replacing valid data with nothing on background fail.
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
            hasInitialLoaded.current = true;
        }
    }, [getCacheKey]);

    // Initial load: Cache first, then background fetch
    useEffect(() => {
        if (!user) return;

        const cacheKey = getCacheKey();
        if (cacheKey) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setPatients(parsed);
                    setLoading(false);
                    console.info('--- Fetching Patient List from LOCAL STORAGE ---');

                    // Ping backend to show it in backend terminal as requested
                    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                    fetch(`${apiBase}/api/worker/log-fetch-source?source=local_storage`).catch(() => { });

                    // If we had cache, we still want to refresh it silently
                    fetchAllCases(true);
                } catch (e) {
                    console.error('Failed to parse cache:', e);
                    fetchAllCases(false);
                }
            } else {
                fetchAllCases(false);
            }
        } else {
            fetchAllCases(false);
        }
    }, [user, getCacheKey, fetchAllCases]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (hasInitialLoaded.current) {
                fetchAllCases(true);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchAllCases]);

    /**
     * Group triage sessions by patient.
     * Returns an array of patient objects, each with all their sessions sorted newest first.
     */
    const groupByPatient = (cases) => {
        const map = new Map();

        cases.forEach(c => {
            const pid = c.patientId?._id || 'unknown';
            const name = c.patientId?.name || c.caseState?.profile?.name || 'Anonymous Patient';
            const age = c.patientId?.age || c.caseState?.profile?.age;
            const phone = c.patientId?.phone || '';

            if (!map.has(pid)) {
                map.set(pid, {
                    patientKey: pid,
                    name,
                    age,
                    phone,
                    sessions: [],
                    latestRisk: null,
                    latestDate: null,
                    nextCheckupDate: null,
                });
            }

            const entry = map.get(pid);
            entry.sessions.push(c);

            // Track latest session metadata
            if (!entry.latestDate || new Date(c.createdAt) > new Date(entry.latestDate)) {
                entry.latestDate = c.createdAt;
                entry.latestRisk = c.decision?.riskLevel || 'UNKNOWN';
                entry.latestStatus = c.status;
            }

            // Track worker-set checkup date (pick the soonest future date)
            if (c.nextCheckupDate) {
                const d = new Date(c.nextCheckupDate);
                if (!entry.nextCheckupDate || d > new Date(entry.nextCheckupDate)) {
                    entry.nextCheckupDate = c.nextCheckupDate;
                }
            }
        });

        // Sort sessions within each patient: newest first
        for (const p of map.values()) {
            p.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Sort patients: highest risk first, then most recent
        const riskOrder = { HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
        return Array.from(map.values()).sort((a, b) => {
            const ra = riskOrder[a.latestRisk] || 4;
            const rb = riskOrder[b.latestRisk] || 4;
            if (ra !== rb) return ra - rb;
            return new Date(b.latestDate) - new Date(a.latestDate);
        });
    };

    // Filter by search
    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.phone && p.phone.includes(search))
    );

    const getRiskColor = (risk) => {
        if (risk === 'HIGH') return '#dc2626';
        if (risk === 'MEDIUM') return '#d97706';
        return '#16a34a';
    };

    return (
        <ProtectedRoute allowedRoles={['worker']}>
            <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 className="section-title" style={{ margin: 0 }}>👥 Patient List</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                            All patients with their complete triage history
                        </p>
                    </div>
                    <Link href="/dashboard/worker" className="btn btn-secondary">
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Search */}
                <div style={{ marginBottom: '20px' }}>
                    <input
                        type="text"
                        placeholder="🔍  Search by name or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '400px', fontSize: '0.95rem' }}
                    />
                </div>

                {/* Summary bar */}
                {!loading && (
                    <div style={{
                        display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap'
                    }}>
                        {[
                            { label: 'Total Patients', value: filtered.length, color: 'var(--accent-primary)' },
                            { label: 'High Risk', value: filtered.filter(p => p.latestRisk === 'HIGH').length, color: '#dc2626' },
                            { label: 'Total Sessions', value: filtered.reduce((acc, p) => acc + p.sessions.length, 0), color: '#7c3aed' },
                        ].map(stat => (
                            <div key={stat.label} className="dash-card" style={{ flex: '1', minWidth: '140px', padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Patient cards */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                        Loading patients...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="dash-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        No patients found.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {filtered.map(patient => (
                            <div key={patient.patientKey} className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>

                                {/* Patient header row — click to expand/collapse */}
                                <div
                                    onClick={() => setExpandedPatient(
                                        expandedPatient === patient.patientKey ? null : patient.patientKey
                                    )}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '16px 20px',
                                        cursor: 'pointer',
                                        borderBottom: expandedPatient === patient.patientKey
                                            ? '1px solid var(--border-subtle)'
                                            : 'none',
                                        background: patient.latestRisk === 'HIGH'
                                            ? 'linear-gradient(90deg, #fef2f2 0%, transparent 100%)'
                                            : 'transparent',
                                    }}
                                >
                                    {/* Left: identity */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '42px', height: '42px', borderRadius: '50%',
                                            background: getRiskColor(patient.latestRisk),
                                            color: 'white', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem',
                                            flexShrink: 0
                                        }}>
                                            {patient.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>
                                                {patient.name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {patient.age ? `${patient.age} yrs` : ''}
                                                {patient.age && patient.phone ? ' • ' : ''}
                                                {patient.phone || ''}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: stats */}
                                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                                {patient.sessions.length}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sessions</div>
                                        </div>

                                        <RiskBadge riskLevel={patient.latestRisk} />

                                        {patient.nextCheckupDate && (
                                            <div style={{ fontSize: '0.8rem', background: '#ecfdf5', color: '#065f46', padding: '4px 10px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                                                📅 Checkup: {new Date(patient.nextCheckupDate).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: chevron */}
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', userSelect: 'none' }}>
                                        {expandedPatient === patient.patientKey ? '▲' : '▼'}
                                    </div>
                                </div>

                                {/* Expanded session list */}
                                {expandedPatient === patient.patientKey && (
                                    <div style={{ padding: '0' }}>
                                        {/* Column headers */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr 1fr 160px',
                                            gap: '8px',
                                            padding: '8px 20px',
                                            background: 'var(--surface)',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            <span>Date</span>
                                            <span>Symptoms</span>
                                            <span>Risk</span>
                                            <span>Status</span>
                                            <span style={{ textAlign: 'right' }}>Action</span>
                                        </div>

                                        {patient.sessions.map((session, idx) => (
                                            <div
                                                key={session._id}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr 1fr 1fr 160px',
                                                    gap: '8px',
                                                    padding: '12px 20px',
                                                    alignItems: 'center',
                                                    borderTop: '1px solid var(--border-subtle)',
                                                    background: idx === 0
                                                        ? 'rgba(99, 102, 241, 0.04)'   // Highlight most recent
                                                        : 'transparent',
                                                }}
                                            >
                                                {/* Date + label */}
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                                                        {new Date(session.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {idx === 0 && (
                                                        <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 6px', borderRadius: '6px', fontWeight: '700' }}>
                                                            LATEST
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Symptoms */}
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-secondary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {session.caseState?.symptoms?.slice(0, 3).join(', ') || '—'}
                                                    {session.caseState?.symptoms?.length > 3 ? ` +${session.caseState.symptoms.length - 3}` : ''}
                                                </div>

                                                {/* Risk */}
                                                <div>
                                                    <RiskBadge riskLevel={session.decision?.riskLevel} />
                                                </div>

                                                {/* Status */}
                                                <div>
                                                    <CaseStatusBadge status={session.status} />
                                                </div>

                                                {/* Review button */}
                                                <div style={{ textAlign: 'right' }}>
                                                    <Link href={`/dashboard/worker/${session._id}`}>
                                                        <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.85rem' }}>
                                                            Review →
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
