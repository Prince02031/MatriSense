'use client';

import { useState, useEffect } from 'react';
import { getCaseDocuments, analyzeDocumentAsWorker, verifyPatientDocument } from '../../../api/workerApi';
import ExtractedValuesList from '../ExtractedValuesList';

// Document type display labels — matches manual upload vocabulary
const DOC_TYPE_LABELS = {
    PREVIOUS_MEDICAL_REPORT: 'Previous Medical Report',
    PRESCRIPTION: 'Prescription',
    ULTRASOUND_REPORT: 'Ultrasound Report',
    LAB_REPORT: 'Lab Report',
    NATIONAL_ID: 'National ID',
    BIRTH_CERTIFICATE: 'Birth Certificate',
    OTHER_MEDICAL_DOCUMENT: 'Other Medical Document',
};

// AI-classification labels (from documentAnalysis.documentType)
const AI_DOC_TYPE_LABELS = {
    prescription: 'Prescription',
    lab_report: 'Lab Report',
    ultrasound_report: 'Ultrasound Report',
    blood_pressure_card: 'Blood Pressure Card',
    other: 'Other Document',
};

// Icons per document type
const DOC_TYPE_ICONS = {
    PREVIOUS_MEDICAL_REPORT: '📋',
    PRESCRIPTION: '💊',
    ULTRASOUND_REPORT: '🩻',
    LAB_REPORT: '🔬',
    NATIONAL_ID: '🪪',
    BIRTH_CERTIFICATE: '📜',
    OTHER_MEDICAL_DOCUMENT: '📄',
};

const AI_DOC_TYPE_ICONS = {
    prescription: '💊',
    lab_report: '🔬',
    ultrasound_report: '🩻',
    blood_pressure_card: '❤️‍🩹',
    other: '📄',
};

// One-line description per document type (fallback when no AI summary)
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
    PENDING:      { label: 'Pending Verification', color: '#d97706', bg: 'rgba(217,119,6,0.1)',     icon: '⏳' },
    VERIFIED:     { label: 'Verified',             color: '#059669', bg: 'rgba(5,150,105,0.1)',     icon: '✓' },
    REJECTED:     { label: 'Rejected',             color: '#dc2626', bg: 'rgba(220,38,38,0.1)',     icon: '✗' },
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

// ─── Document List View ───────────────────────────────────────────────────────
function DocumentListView({ documents, onSelectDoc }) {
    const analyzedCount = documents.filter(d => !!d.documentAnalysis).length;
    const verifiedCount = documents.filter(d => d.verificationStatus === 'VERIFIED').length;
    const pendingCount  = documents.filter(d => d.verificationStatus === 'PENDING').length;

    return (
        <div>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total',        value: documents.length,  color: 'var(--accent-primary, #6366f1)' },
                    { label: 'AI Analyzed',  value: analyzedCount,     color: '#4338ca' },
                    { label: 'Verified',     value: verifiedCount,     color: '#059669' },
                    { label: 'Pending',      value: pendingCount,      color: '#d97706' },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: '1', minWidth: '72px', textAlign: 'center',
                        padding: '10px 12px', borderRadius: '10px',
                        background: 'var(--surface, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map(doc => {
                    const analysis = doc.documentAnalysis;
                    const hasAnalysis = !!analysis;
                    const typeLabel = DOC_TYPE_LABELS[doc.documentType] || doc.documentType;
                    const icon = DOC_TYPE_ICONS[doc.documentType] || '📄';
                    const briefLine = analysis?.summary
                        ? (analysis.summary.length > 90 ? analysis.summary.slice(0, 87) + '…' : analysis.summary)
                        : DOC_TYPE_DESCRIPTIONS[doc.documentType] || 'Medical document.';

                    return (
                        <div
                            key={doc._id}
                            onClick={() => onSelectDoc(doc)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '14px 16px', cursor: 'pointer',
                                border: '1px solid var(--border-subtle)', borderRadius: '10px',
                                background: 'var(--bg-card, #fff)',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.12)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: '44px', height: '44px', flexShrink: 0,
                                borderRadius: '10px', fontSize: '1.3rem',
                                background: hasAnalysis ? 'rgba(99,102,241,0.1)' : 'rgba(107,114,128,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {icon}
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    <span style={{
                                        fontSize: '0.82rem', fontWeight: 700,
                                        color: hasAnalysis ? '#4338ca' : '#374151',
                                    }}>
                                        {typeLabel}
                                    </span>

                                    {/* Source label */}
                                    {hasAnalysis ? (
                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: 600,
                                            background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                            padding: '1px 7px', borderRadius: '999px', border: '1px solid rgba(5,150,105,0.25)',
                                        }}>🤖 AI Analyzed</span>
                                    ) : (
                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: 600,
                                            background: 'rgba(107,114,128,0.1)', color: '#6b7280',
                                            padding: '1px 7px', borderRadius: '999px', border: '1px solid rgba(107,114,128,0.2)',
                                        }}>📁 Manual Upload</span>
                                    )}

                                    <VerificationBadge status={doc.verificationStatus || 'NOT_REQUIRED'} />
                                </div>
                                <div style={{
                                    fontSize: '0.83rem', color: 'var(--text-secondary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {briefLine}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {doc.originalName || doc.title || 'Unnamed'}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {formatBytes(doc.sizeBytes)}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        {formatDate(doc.uploadedAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Chevron */}
                            <span style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>›</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Document Detail View ─────────────────────────────────────────────────────
function DocumentDetailView({ doc: initialDoc, sessionId, onBack }) {
    const [doc, setDoc] = useState(initialDoc);
    const [analyzing, setAnalyzing] = useState(false);
    const [verifying, setVerifying] = useState(null);
    const [error, setError] = useState(null);
    const [analyzeSuccess, setAnalyzeSuccess] = useState(false);

    const analysis = doc.documentAnalysis;
    const hasAnalysis = !!analysis;
    const typeLabel = DOC_TYPE_LABELS[doc.documentType] || doc.documentType;
    const icon = DOC_TYPE_ICONS[doc.documentType] || '📄';

    const handleAnalyze = async () => {
        setError(null);
        setAnalyzeSuccess(false);
        setAnalyzing(true);
        try {
            const res = await analyzeDocumentAsWorker(sessionId, doc._id);
            if (res.success) {
                setDoc(prev => ({
                    ...prev,
                    documentAnalysis: res.analysis,
                    analyzedAt: res.analyzedAt,
                    documentType: res.documentType || prev.documentType,
                }));
                setAnalyzeSuccess(true);
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
            const res = await verifyPatientDocument(sessionId, doc._id, status);
            if (res.success) {
                setDoc(prev => ({ ...prev, verificationStatus: res.verificationStatus }));
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
        <div>
            {/* Back breadcrumb + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle)', borderRadius: '8px',
                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface, #f8fafc)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    ← All Documents
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>·</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {typeLabel}
                </span>
            </div>

            {/* Error banner */}
            {error && (
                <div style={{
                    padding: '10px 14px', marginBottom: '16px',
                    background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)',
                    borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem',
                }}>
                    ⚠️ {error}
                </div>
            )}
            {analyzeSuccess && (
                <div style={{
                    padding: '10px 14px', marginBottom: '16px',
                    background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.25)',
                    borderRadius: '8px', color: '#065f46', fontSize: '0.85rem', fontWeight: 600,
                }}>
                    ✓ Analysis complete! Scroll down to see extracted values.
                </div>
            )}

            {/* Document header card */}
            <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                padding: '18px 20px', marginBottom: '20px',
                background: 'var(--surface, #f8fafc)',
                border: '1px solid var(--border-subtle)', borderRadius: '12px',
            }}>
                <div style={{
                    width: '52px', height: '52px', flexShrink: 0,
                    borderRadius: '12px', fontSize: '1.5rem',
                    background: hasAnalysis ? 'rgba(99,102,241,0.1)' : 'rgba(107,114,128,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {icon}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {typeLabel}
                        </span>
                        {/* Source tag */}
                        {hasAnalysis ? (
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 600,
                                background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(5,150,105,0.25)',
                            }}>🤖 AI Analyzed</span>
                        ) : (
                            <span style={{
                                fontSize: '0.75rem', fontWeight: 600,
                                background: 'rgba(107,114,128,0.1)', color: '#6b7280',
                                padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(107,114,128,0.2)',
                            }}>📁 Manually Uploaded</span>
                        )}
                        <VerificationBadge status={doc.verificationStatus || 'NOT_REQUIRED'} />
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>{doc.originalName || doc.title || 'Unnamed file'}</span>
                        <span>{formatBytes(doc.sizeBytes)}</span>
                        <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                        {doc.analyzedAt && (
                            <span style={{ color: '#4338ca' }}>Analyzed {formatDate(doc.analyzedAt)}</span>
                        )}
                    </div>
                </div>

                {/* View button */}
                <a
                    href={getDocViewUrl(doc._id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        flexShrink: 0, padding: '8px 16px',
                        fontSize: '0.85rem', fontWeight: 600,
                        background: 'rgba(20,184,166,0.1)', color: '#0d9488',
                        border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px',
                        textDecoration: 'none',
                    }}
                >
                    👁 View File
                </a>
            </div>

            {/* ── Analysis section ── */}
            {!hasAnalysis ? (
                <div style={{
                    padding: '32px 24px', textAlign: 'center',
                    border: '2px dashed var(--border-subtle)', borderRadius: '12px',
                    background: 'var(--surface, #f8fafc)', marginBottom: '20px',
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔬</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>
                        No AI Analysis Available
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
                        This document was uploaded without AI analysis (manually uploaded).<br />
                        Run the analysis to extract clinical values from the document.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        style={{
                            padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700,
                            background: analyzing ? 'rgba(99,102,241,0.5)' : '#6366f1',
                            color: 'white', border: 'none', borderRadius: '9px',
                            cursor: analyzing ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                        }}
                    >
                        {analyzing ? '🔎 Analyzing with AI…' : '🤖 Run AI Analysis'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

                    {/* AI classification row */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                        padding: '12px 16px',
                        background: 'rgba(99,102,241,0.05)', borderRadius: '10px',
                        border: '1px solid rgba(99,102,241,0.15)',
                    }}>
                        <span style={{ fontSize: '1.3rem' }}>
                            {AI_DOC_TYPE_ICONS[analysis.documentType] || '📄'}
                        </span>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                AI Identified Type
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {AI_DOC_TYPE_LABELS[analysis.documentType] || analysis.documentType}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '0.78rem', fontWeight: 600,
                                color: analysis.isReadable ? '#059669' : '#d97706',
                                background: analysis.isReadable ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                                padding: '3px 10px', borderRadius: '999px',
                            }}>
                                {analysis.isReadable ? '✓ Readable' : '⚠️ Low quality image'}
                            </span>
                            {analysis.language && (
                                <span style={{
                                    fontSize: '0.78rem', fontWeight: 600,
                                    color: '#6b7280', background: 'rgba(107,114,128,0.1)',
                                    padding: '3px 10px', borderRadius: '999px',
                                }}>
                                    {analysis.language === 'bn' ? '🇧🇩 Bangla' : analysis.language === 'en' ? '🇺🇸 English' : '🌐 Mixed'}
                                </span>
                            )}
                            {/* Patient confirmation */}
                            {doc.allValuesConfirmed ? (
                                <span style={{
                                    fontSize: '0.78rem', fontWeight: 600,
                                    background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                    padding: '3px 10px', borderRadius: '999px',
                                }}>✓ Patient Confirmed</span>
                            ) : (
                                <span style={{
                                    fontSize: '0.78rem', fontWeight: 600,
                                    background: 'rgba(217,119,6,0.1)', color: '#92400e',
                                    padding: '3px 10px', borderRadius: '999px',
                                }}>⏳ Patient Not Confirmed</span>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    {analysis.summary && (
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                AI Summary
                            </div>
                            <div style={{
                                padding: '14px 16px', borderRadius: '10px',
                                background: 'rgba(239,246,255,0.8)',
                                border: '1px solid rgba(99,102,241,0.15)',
                            }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                    {analysis.summary}
                                </p>
                                {analysis.summaryBn && (
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        {analysis.summaryBn}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Extracted values */}
                    {analysis.extractedValues && analysis.extractedValues.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                Extracted Clinical Values
                            </div>
                            <ExtractedValuesList values={analysis.extractedValues} />
                        </div>
                    )}

                    {/* Medications */}
                    {analysis.medications && analysis.medications.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                Medications
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {analysis.medications.map((med, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center',
                                        padding: '10px 14px', borderRadius: '8px',
                                        background: 'rgba(20,184,166,0.06)',
                                        border: '1px solid rgba(20,184,166,0.2)',
                                    }}>
                                        <span style={{ fontSize: '0.9rem' }}>💊</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{med.name}</span>
                                        {med.dosage && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{med.dosage}</span>}
                                        {med.frequency && <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{med.frequency}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Risk factors */}
                    {analysis.riskFactorsDetected && analysis.riskFactorsDetected.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                                Risk Factors Detected
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {analysis.riskFactorsDetected.map((rf, idx) => (
                                    <span key={idx} style={{
                                        fontSize: '0.82rem', fontWeight: 600,
                                        background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                                        padding: '4px 12px', borderRadius: '999px',
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

            {/* ── Verification panel ── */}
            <div style={{
                padding: '16px 18px', borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface, #f8fafc)',
            }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                    Health Worker Verification
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
                        Current: <strong><VerificationBadge status={doc.verificationStatus || 'NOT_REQUIRED'} /></strong>
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {['VERIFIED', 'REJECTED', 'PENDING'].map(status => {
                            const cfg = VERIFICATION_CONFIG[status];
                            const isActive = doc.verificationStatus === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => handleVerify(status)}
                                    disabled={!!verifying || isActive}
                                    style={{
                                        padding: '7px 16px', fontSize: '0.82rem', fontWeight: 600,
                                        borderRadius: '8px',
                                        cursor: (!!verifying || isActive) ? 'not-allowed' : 'pointer',
                                        border: `1.5px solid ${cfg.color}60`,
                                        background: isActive ? cfg.bg : 'transparent',
                                        color: cfg.color,
                                        opacity: (verifying && verifying !== status) ? 0.45 : 1,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {verifying === status ? '…' : `${cfg.icon} ${cfg.label}`}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function PatientDocumentsPanel({ sessionId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [consentDenied, setConsentDenied] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null); // null = list view
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchDocuments = async () => {
        setLoading(true);
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

    const handleSelectDoc = (doc) => setSelectedDoc(doc);
    const handleBack = () => setSelectedDoc(null);
    const handleRefresh = () => { setRefreshKey(k => k + 1); setSelectedDoc(null); };

    // ── Loading / error / consent states ──
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
                <p style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.9rem', margin: '0 0 4px 0' }}>⚠️ Consent Not Granted</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    This patient has not enabled document sharing with health workers. They can enable this in their profile settings.
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
            {/* Panel header — always visible */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ margin: 0 }}>📁 Patient Documents</h3>
                    {!selectedDoc && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '4px 0 0 0' }}>
                            Select a document to view analysis, extracted values, and manage verification.
                        </p>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    title="Refresh document list"
                    style={{
                        padding: '5px 12px', fontSize: '0.8rem', fontWeight: 600,
                        border: '1px solid var(--border-subtle)', borderRadius: '7px',
                        background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                >
                    ↺ Refresh
                </button>
            </div>

            {/* ── Master / Detail swap ── */}
            {selectedDoc ? (
                <DocumentDetailView
                    doc={selectedDoc}
                    sessionId={sessionId}
                    onBack={handleBack}
                />
            ) : (
                <DocumentListView
                    documents={documents}
                    onSelectDoc={handleSelectDoc}
                />
            )}
        </div>
    );
}
