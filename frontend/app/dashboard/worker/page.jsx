'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getWorkerCases } from '../../api/workerApi';
import CasePriorityBadge from '../../components/dashboard/CasePriorityBadge';
import RiskBadge from '../../components/dashboard/RiskBadge';
import CaseStatusBadge from '../../components/dashboard/CaseStatusBadge';

const CASES_PER_PAGE = 20;

export default function WorkerDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filter and sort states
    const [filterMode, setFilterMode] = useState('all'); // 'all' or 'latest-patient'
    const [sortBy, setSortBy] = useState('risk'); // 'risk' or 'date'
    const [districtFilter, setDistrictFilter] = useState('');

    useEffect(() => {
        fetchCases(1);
    }, [filterMode, sortBy, districtFilter]);

    const fetchCases = async (page) => {
        try {
            setLoading(true);
            const skip = (page - 1) * CASES_PER_PAGE;
            const data = await getWorkerCases(CASES_PER_PAGE, skip, filterMode, sortBy, districtFilter);
            
            if (data.success) {
                setCases(data.cases);
                setTotalPages(Math.ceil(data.pagination.total / CASES_PER_PAGE));
                setCurrentPage(page);
            }
        } catch (err) {
            console.error('Failed to fetch cases:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoToDashboard = () => {
        router.push('/dashboard/worker');
    };

    const urgentCases = cases.filter(c => c.decision?.riskLevel === 'HIGH');
    const resolvedCases = cases.filter(c => c.status === 'RESOLVED');

    const handlePageClick = (page) => {
        fetchCases(page);
        window.scrollTo(0, 0);
    };

    return (
        <>
            {/* Welcome Card */}
            <div className="welcome-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>Welcome, {user.name || 'Health Worker'} 👋</h1>
                        <p style={{ maxWidth: '600px' }}>
                            Review patient cases, respond to alerts, and manage follow-ups.
                            Your expertise helps keep mothers safe.
                        </p>
                    </div>
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
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-amber">📂</div>
                    </div>
                    <div className="dash-card-value">{cases.length}</div>
                    <div className="dash-card-sub">Cases on this page</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-teal">👥</div>
                    </div>
                    <div className="dash-card-value">{new Set(cases.map(c => c.patientId?._id).filter(Boolean)).size}</div>
                    <div className="dash-card-sub">Unique patients</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-header">
                        <div className="dash-card-icon icon-emerald">✅</div>
                    </div>
                    <div className="dash-card-value">{resolvedCases.length}</div>
                    <div className="dash-card-sub">Resolved on page</div>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="dash-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>🔍 Filter & Sort Options</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            District Filter
                        </label>
                        <input
                            type="text"
                            value={districtFilter}
                            onChange={(e) => {
                                setDistrictFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="e.g. Dhaka"
                            className="form-input"
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            View Mode
                        </label>
                        <select
                            value={filterMode}
                            onChange={(e) => {
                                setFilterMode(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="form-input"
                        >
                            <option value="all">All Cases (with duplicates per patient)</option>
                            <option value="latest-patient">Latest per Patient</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="form-input"
                        >
                            <option value="risk">Risk Level (HIGH → MEDIUM → LOW)</option>
                            <option value="date">Date (Newest First)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cases Table */}
            <h2 className="section-title">📋 Triaged Patient Cases</h2>
            <div className="dash-card" style={{ overflow: 'auto', marginBottom: '24px' }}>
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
                        {loading && <tr><td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>Loading cases...</td></tr>}
                        {!loading && cases.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No cases found. Cases will appear here when patients report symptoms.
                                </td>
                            </tr>
                        )}
                        {!loading && cases.map(c => (
                            <tr key={c._id} className={c.decision?.riskLevel === 'HIGH' ? 'urgent-row' : ''}>
                                <td>
                                    <strong>{c.patientId?.name || c.caseState?.profile?.name || c.profileSnapshot?.name || 'Anonymous Patient'}</strong> <br />
                                    <small>{c.patientId?.age ? `${c.patientId.age} yrs` : c.caseState?.profile?.age ? `${c.caseState.profile.age} yrs` : c.profileSnapshot?.age ? `${c.profileSnapshot.age} yrs` : 'Age N/A'}</small>
                                    <br />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        📍 {c.profileSnapshot?.district || c.patientId?.district || c.caseState?.profile?.district || 'Unassigned Region'}
                                        {c.profileSnapshot?.upazilaOrThana || c.patientId?.upazilaOrThana || c.caseState?.profile?.upazilaOrThana ? `, ${c.profileSnapshot?.upazilaOrThana || c.patientId?.upazilaOrThana || c.caseState?.profile?.upazilaOrThana}` : ''}
                                    </span>
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
                                    {c.assignedHospitalSnapshot?.name && (
                                        <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                                            🏥 Assigned: {c.assignedHospitalSnapshot.name}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <CaseStatusBadge status={c.status} />
                                </td>
                                <td>
                                    <small>{new Date(c.createdAt).toLocaleString()}</small>
                                </td>
                                <td>
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

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '24px',
                    flexWrap: 'wrap'
                }}>
                    {/* Previous Button */}
                    <button
                        onClick={() => handlePageClick(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: currentPage === 1 ? 'var(--surface-disabled)' : 'var(--surface)',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                        }}
                    >
                        ← Previous
                    </button>

                    {/* Page Numbers */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => handlePageClick(page)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: page === currentPage ? 'none' : '1px solid var(--border)',
                                    background: page === currentPage ? 'var(--accent-primary)' : 'var(--surface)',
                                    color: page === currentPage ? 'white' : 'var(--text)',
                                    cursor: 'pointer',
                                    fontWeight: page === currentPage ? '600' : 'normal'
                                }}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    {/* Next Button */}
                    <button
                        onClick={() => handlePageClick(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: currentPage === totalPages ? 'var(--surface-disabled)' : 'var(--surface)',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                    >
                        Next →
                    </button>

                    {/* Page Info */}
                    <div style={{ marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
            )}
        </>
    );
}