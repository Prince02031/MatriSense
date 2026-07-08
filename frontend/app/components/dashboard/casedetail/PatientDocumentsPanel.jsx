'use client';

import { useState, useEffect } from 'react';
import { getCaseDocuments, analyzeDocumentAsWorker, verifyPatientDocument } from '../../../api/workerApi';
import ExtractedValuesList from '../ExtractedValuesList';

// Document type display labels — same vocabulary as manual upload system
const DOC_TYPE_LABELS = {
    PREVIOUS_MEDICAL_REPORT: 'Previous Medical Report',
    PRESCRIPTION: 'Prescription',
    ULTRASOUND_REPORT: 'Ultrasound Report',
    LAB_REPORT: 'Lab Report',
    NATIONAL_ID: 'National ID',
    BIRTH_CERTIFICATE: 'Birth Certificate',
    OTHER_MEDICAL_DOCUMENT: 'Other Medical Document',
};

// AI-classification labels (from documentAnalysis.documentType) mapped to human labels
const AI_DOC_TYPE_LABELS = {
    prescription: 'Prescription',
    lab_report: 'Lab Report',
    ultrasound_report: 'Ultrasound Report',
    blood_pressure_card: 'Blood Pressure Card',
    other: 'Other Document',
};

// One-line descriptions per document type (used when no AI summary is available)
const DOC_TYPE_DESCRIPTIONS = {
    PREVIOUS_MEDICAL_REPORT: 'Previous medical history report uploaded by patient.',
    PRESCRIPTION: 'Medication prescription document.',
    ULTRASOUND_REPORT: 'Obstetric ultrasound scan report.',
    LAB_REPORT: 'Laboratory test results.',
    NATIONAL_ID: 'Patient national identification document.',
    BIRTH_CERTIFICATE: 'Patient birth certificate.',
    OTHER_MEDICAL_DOCUMENT: 'Medical document uploaded by patient.',
};

const VERIFICATION_CONFIG = {
    NOT_REQUIRED: { label: 'Not Required', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '—' },
    PENDING: { label: 'Pending Verification', color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: '⏳' },
    VERIFIED: { label: 'Verified', color: '#059669', bg: 'rgba(5,150,105,0.1)', icon: '✓' },
    REJECTED: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: '✗' },
};

const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getDocViewUrl = (docId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') || '' : '';
    return `${API_BASE}/api/documents/${docId}/download?token=${token}`;
};

// ─── Verification Badge ───────────────────────────────────────────────────────
function VerificationBadge({ status }) {
    const cfg = VERIFICATION_CONFIG[status] || VERIFICATION_CONFIG.PENDING;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.78rem', fontWeight: 600,
            color: cfg.color, background: cfg.bg,
            padding: '3px 10px', borderRadius: '999px',
            border: `1px solid ${cfg.color}40`,
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ─── Single Document Card ─────────────────────────────────────────────────────
function DocumentCard({ doc, sessionId, onRefresh }) {
    const [expanded, setExpanded] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [verifying, setVerifying] = useState(null); // 'VERIFIED' | 'REJECTED' | 'PENDING'
    const [error, setError] = useState(null);
    const [localDoc, setLocalDoc] = useState(doc);

    // Sync when parent refreshes
    useEffect(() => { setLocalDoc(doc); }, [doc]);

    const analysis = localDoc.documentAnalysis;
    const hasAnalysis = !!analysis;
    const typeLabel = DOC_TYPE_LABELS[localDoc.documentType] || localDoc.documentType;
    // One-line brief: prefer truncated AI summary, fall back to type-based description
    const briefLine = analysis?.summary
        ? (analysis.summary.length > 100 ? analysis.summary.slice(0, 97) + '…' : analysis.summary)
        : DOC_TYPE_DESCRIPTIONS[localDoc.documentType] || 'Medical document uploaded by patient.';

    const handleAnalyze = async (e) => {
        e.stopPropagation();
        setError(null);
        setAnalyzing(true);
        try {
            const res = await analyzeDocumentAsWorker(sessionId, localDoc._id);
            if (res.success) {
                // Merge analysis result into local state without a full refetch
                setLocalDoc(prev => ({
                    ...prev,
                    documentAnalysis: res.analysis,
                    analyzedAt: res.analyzedAt,
                    documentType: res.documentType || prev.documentType,
                }));
                setExpanded(true);
                onRefresh?.();
            } else {
                setError(res.error || 'Analysis failed. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'Failed to run analysis.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleVerify = async (status) => {
        setError(null);
        setVerifying(status);
        try {
            const res = await verifyPatientDocument(sessionId, localDoc._id, status);
            if (res.success) {
                setLocalDoc(prev => ({
                    ...prev,
                    verificationStatus: res.verificationStatus,
                }));
                onRefresh?.();
            } else {
                setError(res.error || 'Could not update verification status.');
            }
        } catch (err) {
            setError(err.message || 'Failed to update verification.');
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'var(--bg-card, #fff)',
            transition: 'box-shadow 0.2s',
            boxShadow: expanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        }}>
            {/* ── Card header row ── */}
            <div
                onClick={() => setExpanded(v => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none',
                    background: expanded ? 'rgba(99,102,241,0.03)' : 'transparent',
                }}
            >
                {/* File icon */}
                <div style={{
                    width: '42px', height: '42px', flexShrink: 0,
                    borderRadius: '10px',
                    background: hasAnalysis ? 'rgba(99,102,241,0.1)' : 'rgba(107,114,128,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem',
                }}>
                    {hasAnalysis ? '🧠' : '📄'}
                </div>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row: type badge + source tag + verification */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        <span style={{
                            fontSize: '0.78rem', fontWeight: 700,
                            background: hasAnalysis ? 'rgba(99,102,241,0.12)' : 'rgba(107,114,128,0.12)',
                            color: hasAnalysis ? '#4338ca' : '#374151',
                            padding: '3px 10px', borderRadius: '999px',
                        }}>
                            {typeLabel}
                        </span>

                        {/* Source: AI-analyzed or manually uploaded */}
                        {hasAnalysis ? (
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(5,150,105,0.25)',
                            }}>
                                🤖 AI Analyzed
                            </span>
                        ) : (
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                background: 'rgba(107,114,128,0.1)', color: '#6b7280',
                                padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(107,114,128,0.25)',
                            }}>
                                📁 Manually Uploaded
                            </span>
                        )}

                        <VerificationBadge status={localDoc.verificationStatus || 'NOT_REQUIRED'} />
                    </div>

                    {/* One-line brief description */}
                    <div style={{
                        fontSize: '0.85rem', color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '100%',
                    }}>
                        {briefLine}
                    </div>

                    {/* Meta: filename · size · date */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {localDoc.originalName || localDoc.title || 'Unnamed file'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatBytes(localDoc.sizeBytes)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Uploaded {formatDate(localDoc.uploadedAt)}
                        </span>
                        {localDoc.analyzedAt && (
                            <span style={{ fontSize: '0.75rem', color: '#4338ca' }}>
                                Analyzed {formatDate(localDoc.analyzedAt)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: actions + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Run Analysis button — only for unanalyzed docs */}
                    {!hasAnalysis && (
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            style={{
                                padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600,
                                background: analyzing ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.9)',
                                color: 'white', border: 'none', borderRadius: '7px',
                                cursor: analyzing ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap', transition: 'background 0.2s',
                            }}
                        >
                            {analyzing ? '🔎 Analyzing…' : '🤖 Run AI Analysis'}
                        </button>
                    )}

                    {/* View document */}
                    <a
                        href={getDocViewUrl(localDoc._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                            padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600,
                            background: 'rgba(20,184,166,0.12)', color: '#0d9488',
                            border: '1px solid rgba(20,184,166,0.3)', borderRadius: '7px',
                            textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                    >
                        👁 View
                    </a>

                    {/* Chevron */}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>
                        ▼
                    </span>
                </div>
            </div>

            {/* ── Expanded detail panel ── */}
            {expanded && (
                <div style={{ padding: '16px 20px', background: 'rgba(248,250,252,0.8)' }}>
                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'rgba(220,38,38,0.07)',
                            border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px',
                            color: '#dc2626', fontSize: '0.85rem', marginBottom: '14px',
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {!hasAnalysis ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔬</div>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>No AI Analysis Available</div>
                            <div style={{ fontSize: '0.85rem' }}>
                                This document was uploaded without AI analysis. Click <strong>Run AI Analysis</strong> to extract values.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* AI classification */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '0.8rem', fontWeight: 600,
                                    background: 'rgba(99,102,241,0.1)', color: '#4338ca',
                                    padding: '3px 10px', borderRadius: '999px',
                                }}>
                                    AI Type: {AI_DOC_TYPE_LABELS[analysis.documentType] || analysis.documentType}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {analysis.isReadable ? '✓ Readable' : '⚠️ Low image quality'}
                                </span>
                                {analysis.language && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Language: {analysis.language === 'bn' ? 'Bangla' : analysis.language === 'en' ? 'English' : 'Mixed'}
                                    </span>
                                )}
                                {/* Patient confirmation status */}
                                {localDoc.allValuesConfirmed ? (
                                    <span style={{
                                        fontSize: '0.78rem', fontWeight: 600,
                                        background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                        padding: '3px 10px', borderRadius: '999px',
                                    }}>
                                        ✓ Patient Confirmed
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: '0.78rem', fontWeight: 600,
                                        background: 'rgba(217,119,6,0.1)', color: '#92400e',
                                        padding: '3px 10px', borderRadius: '999px',
                                    }}>
                                        ⏳ Patient Not Confirmed
                                    </span>
                                )}
                            </div>

                            {/* Summary */}
                            {analysis.summary && (
                                <div style={{
                                    padding: '12px 14px',
                                    background: 'rgba(239,246,255,0.8)', borderRadius: '8px',
                                    border: '1px solid rgba(99,102,241,0.15)',
                                }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        AI Summary
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                        {analysis.summary}
                                    </p>
                                    {analysis.summaryBn && (
                                        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            {analysis.summaryBn}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Extracted values */}
                            {analysis.extractedValues && analysis.extractedValues.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                                        Extracted Values
                                    </div>
                                    <ExtractedValuesList values={analysis.extractedValues} />
                                </div>
                            )}

                            {/* Medications */}
                            {analysis.medications && analysis.medications.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                                        Medications
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {analysis.medications.map((med, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', gap: '10px', flexWrap: 'wrap',
                                                padding: '9px 12px', borderRadius: '8px',
                                                background: 'rgba(20,184,166,0.06)',
                                                border: '1px solid rgba(20,184,166,0.2)',
                                            }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{med.name}</span>
                                                {med.dosage && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{med.dosage}</span>}
                                                {med.frequency && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{med.frequency}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Risk factors */}
                            {analysis.riskFactorsDetected && analysis.riskFactorsDetected.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                        Risk Factors Detected
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {analysis.riskFactorsDetected.map((rf, idx) => (
                                            <span key={idx} style={{
                                                fontSize: '0.8rem', fontWeight: 600,
                                                background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                                                padding: '3px 10px', borderRadius: '999px',
                                                border: '1px solid rgba(220,38,38,0.25)',
                                            }}>
                                                🚨 {rf}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Verification actions ── */}
                    <div style={{
                        marginTop: '18px', paddingTop: '14px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>
                            Verification:
                        </span>

                        {(['VERIFIED', 'REJECTED', 'PENDING']).map(status => {
                            const cfg = VERIFICATION_CONFIG[status];
                            const isActive = localDoc.verificationStatus === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => handleVerify(status)}
                                    disabled={!!verifying || isActive}
                                    style={{
                                        padding: '5px 14px', fontSize: '0.78rem', fontWeight: 600,
                                        borderRadius: '7px', cursor: (!!verifying || isActive) ? 'not-allowed' : 'pointer',
                                        border: `1px solid ${cfg.color}50`,
                                        background: isActive ? cfg.bg : 'transparent',
                                        color: cfg.color,
                                        opacity: (verifying && verifying !== status) ? 0.5 : 1,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {verifying === status ? '…' : `${cfg.icon} ${cfg.label}`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function PatientDocumentsPanel({ sessionId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [consentDenied, setConsentDenied] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchDocuments = async () => {
        try {
            const res = await getCaseDocuments(sessionId);
            if (res.success) {
                setDocuments(res.documents || []);
                setConsentDenied(!!res.consentDenied);
            } else {
                setError(res.error || 'Failed to load documents');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred loading documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionId) return;
        fetchDocuments();
    }, [sessionId, refreshKey]);

    const handleRefresh = () => setRefreshKey(k => k + 1);

    // ── Stats bar
    const analyzedCount = documents.filter(d => !!d.documentAnalysis).length;
    const verifiedCount = documents.filter(d => d.verificationStatus === 'VERIFIED').length;

    if (loading) return (
        <div className="dash-card">
            <h3>📁 Patient Documents</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Loading documents…</p>
        </div>
    );

    if (error) return (
        <div className="dash-card">
            <h3>📁 Patient Documents</h3>
            <p style={{ color: 'var(--danger)', marginTop: '12px' }}>{error}</p>
        </div>
    );

    if (consentDenied) return (
        <div className="dash-card">
            <h3>📁 Patient Documents</h3>
            <div style={{
                padding: '14px 16px', marginTop: '14px',
                background: 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px',
            }}>
                <p style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.9rem', margin: '0 0 4px 0' }}>
                    ⚠️ Consent Not Granted
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    This patient has not enabled document sharing with health workers.
                    They can enable this in their profile settings.
                </p>
            </div>
        </div>
    );

    if (documents.length === 0) return (
        <div className="dash-card">
            <h3>📁 Patient Documents</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>No medical documents available for this patient.</p>
        </div>
    );

    return (
        <div className="dash-card">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h3 style={{ margin: 0 }}>📁 Patient Documents</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
                        Click a document card to view analysis details and manage verification.
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle)', borderRadius: '7px',
                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                >
                    ↺ Refresh
                </button>
            </div>

            {/* Stats bar */}
            <div style={{
                display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap',
            }}>
                {[
                    { label: 'Total Documents', value: documents.length, color: 'var(--accent-primary, #6366f1)' },
                    { label: 'AI Analyzed', value: analyzedCount, color: '#4338ca' },
                    { label: 'Verified', value: verifiedCount, color: '#059669' },
                    { label: 'Pending', value: documents.filter(d => d.verificationStatus === 'PENDING').length, color: '#d97706' },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: '1', minWidth: '80px', textAlign: 'center',
                        padding: '10px 12px', borderRadius: '10px',
                        background: 'var(--surface, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Document cards */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documents.map(doc => (
                    <DocumentCard
                        key={doc._id}
                        doc={doc}
                        sessionId={sessionId}
                        onRefresh={handleRefresh}
                    />
                ))}
            </div>
        </div>
    );
}
