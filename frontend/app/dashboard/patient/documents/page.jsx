'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { getMyPatientDocuments, deletePatientDocument } from '../../../api/patientApi';
import ExtractedValuesList from '../../../components/dashboard/ExtractedValuesList';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getDocumentViewUrl = (documentId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : '';
    return `${API_BASE}/api/documents/${documentId}/download?token=${token || ''}`;
};

export default function PatientDocumentsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const dt = t.documentsPage || {};
    const docTypeLabels = t.profile?.docTypes || {};

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [manageMode, setManageMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteAlsoClinicalData, setDeleteAlsoClinicalData] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchDocuments = async () => {
        try {
            const data = await getMyPatientDocuments();
            if (data.success) {
                setDocuments(data.documents || []);
            } else {
                setError(data.error || dt.errorLoading);
            }
        } catch (err) {
            console.error('[PatientDocumentsPage] fetch error:', err);
            setError(dt.errorLoading);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchDocuments();
    }, [user]);

    if (!user) return null;

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await deletePatientDocument(deleteTarget, { deleteClinicalData: deleteAlsoClinicalData });
            if (res.success) {
                setDocuments((prev) => prev.filter((d) => d._id !== deleteTarget));
            } else {
                setError(res.error || dt.errorLoading);
            }
        } catch (err) {
            console.error('[PatientDocumentsPage] delete error:', err);
            setError(dt.errorLoading);
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
            setDeleteAlsoClinicalData(false);
        }
    };

    return (
        <div className="dashboard-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
            <Link href="/dashboard/patient" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-block' }}>
                {t.clinicalDataPage?.backToDashboard || '← Back to Dashboard'}
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
                <div>
                    <h1 style={{ marginBottom: '10px' }}>{dt.title || '📄 Uploaded Documents'}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{dt.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link href="/dashboard/patient/documents/upload" className="btn btn-teal btn-sm">
                        {dt.uploadButton || '+ Upload Document'}
                    </Link>
                    {documents.length > 0 && (
                        <button
                            type="button"
                            className={manageMode ? 'btn btn-outline btn-sm' : 'btn btn-danger btn-sm'}
                            onClick={() => setManageMode((v) => !v)}
                        >
                            {manageMode ? (dt.doneManaging || '✓ Done Managing') : (dt.manageButton || '🗑️ Manage Documents')}
                        </button>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '30px' }} />

            {loading ? (
                <p>{dt.loading || 'Loading documents...'}</p>
            ) : error ? (
                <div style={{ color: 'var(--red-600)', padding: '16px', backgroundColor: 'var(--red-50)', borderRadius: '8px' }}>
                    {error}
                </div>
            ) : documents.length === 0 ? (
                <div className="dash-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>{dt.noDocuments || 'No documents uploaded yet.'}</p>
                    <Link href="/dashboard/patient/documents/upload" style={{ color: 'var(--primary)', marginTop: '16px', display: 'inline-block' }}>
                        {dt.uploadCta || 'Upload your first document →'}
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {documents.map((doc) => (
                        <div key={doc._id} className="dash-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    {/* Document type badge + source label */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span className="badge badge-info">
                                            {docTypeLabels[doc.documentType] || doc.documentType}
                                        </span>

                                        {/* Source: AI-analyzed or manually uploaded */}
                                        {doc.documentAnalysis ? (
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 600,
                                                background: 'rgba(5,150,105,0.1)', color: '#065f46',
                                                padding: '2px 8px', borderRadius: '999px',
                                                border: '1px solid rgba(5,150,105,0.25)',
                                            }}>
                                                🤖 AI Analyzed
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 600,
                                                background: 'rgba(107,114,128,0.1)', color: '#6b7280',
                                                padding: '2px 8px', borderRadius: '999px',
                                                border: '1px solid rgba(107,114,128,0.2)',
                                            }}>
                                                📁 Manually Uploaded
                                            </span>
                                        )}

                                        {/* For AI docs: show the specific type the AI detected */}
                                        {doc.documentAnalysis?.documentType && (() => {
                                            const aiTypeLabels = {
                                                prescription: 'Prescription',
                                                lab_report: 'Lab Report',
                                                ultrasound_report: 'Ultrasound Report',
                                                blood_pressure_card: 'Blood Pressure Card',
                                                other: 'Other Document',
                                            };
                                            const aiLabel = aiTypeLabels[doc.documentAnalysis.documentType];
                                            // Only show if it adds information beyond the existing type badge
                                            return aiLabel ? (
                                                <span style={{
                                                    fontSize: '0.72rem', color: 'var(--text-muted)',
                                                    fontStyle: 'italic',
                                                }}>
                                                    AI identified: {aiLabel}
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                        {doc.originalName ? ` · ${doc.originalName}` : ''}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {doc.documentAnalysis && (
                                        <span className={`badge ${doc.allValuesConfirmed ? 'badge-success' : 'badge-warning'}`}>
                                            {doc.allValuesConfirmed ? (dt.confirmed || '✓ Confirmed') : (dt.pendingConfirmation || '⏳ Pending confirmation')}
                                        </span>
                                    )}
                                    <a
                                        href={getDocumentViewUrl(doc._id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-teal btn-sm"
                                    >
                                        {dt.viewButton || '🩺 View Document'}
                                    </a>
                                    {manageMode && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setDeleteTarget(doc._id)}
                                        >
                                            {dt.deleteButton || '🗑️ Delete'}
                                        </button>
                                    )}
                                </div>
                            </div>


                            {doc.documentAnalysis ? (
                                <div style={{ marginTop: '16px' }}>
                                    {doc.documentAnalysis.summary && (
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                            {doc.documentAnalysis.summary}
                                        </p>
                                    )}
                                    <ExtractedValuesList values={doc.documentAnalysis.extractedValues} />
                                </div>
                            ) : (
                                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {dt.notAnalyzed || 'This document has not been analyzed by AI.'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {deleteTarget && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="dash-card" style={{ width: '100%', maxWidth: '420px' }}>
                        <h3 style={{ margin: 0 }}>{dt.deleteConfirmTitle || 'Delete this document?'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
                            {dt.deleteConfirmBody || 'This action cannot be undone.'}
                        </p>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                                type="checkbox"
                                checked={deleteAlsoClinicalData}
                                onChange={(e) => setDeleteAlsoClinicalData(e.target.checked)}
                            />
                            {dt.alsoDeleteClinicalData || 'Also delete the clinical data extracted from this document'}
                        </label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => { setDeleteTarget(null); setDeleteAlsoClinicalData(false); }}
                                disabled={deleting}
                            >
                                {dt.cancel || 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                            >
                                {dt.confirmDelete || 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
