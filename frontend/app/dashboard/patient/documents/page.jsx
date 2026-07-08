'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { getMyPatientDocuments } from '../../../api/patientApi';
import ExtractedValuesList from '../../../components/dashboard/ExtractedValuesList';
import MedicalDocumentUpload from '../../../components/dashboard/MedicalDocumentUpload';

const DOC_TYPE_LABELS = {
    PRESCRIPTION: 'Prescription',
    LAB_REPORT: 'Lab Report',
    ULTRASOUND_REPORT: 'Ultrasound Report',
    OTHER_MEDICAL_DOCUMENT: 'Medical Document',
    NATIONAL_ID: 'National ID',
    BIRTH_CERTIFICATE: 'Birth Certificate',
    PREVIOUS_MEDICAL_REPORT: 'Previous Medical Report',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const getDocumentViewUrl = (documentId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') : '';
    return `${API_BASE}/api/documents/${documentId}/download?token=${token || ''}`;
};

export default function PatientDocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDocuments = async () => {
        try {
            const data = await getMyPatientDocuments();
            if (data.success) {
                setDocuments(data.documents || []);
            } else {
                setError(data.error || 'Failed to load documents.');
            }
        } catch (err) {
            console.error('[PatientDocumentsPage] fetch error:', err);
            setError('Failed to load documents.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchDocuments();
    }, [user]);

    if (!user) return null;

    return (
        <div className="dashboard-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
            <Link href="/dashboard/patient" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-block' }}>
                ← Back to Dashboard
            </Link>

            <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>📄 Uploaded Documents</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                Every document you've uploaded, along with what our AI extracted from it.
            </p>

            <div style={{ marginBottom: '32px' }}>
                <MedicalDocumentUpload onSaved={fetchDocuments} />
            </div>

            {loading ? (
                <p>Loading documents...</p>
            ) : error ? (
                <div style={{ color: 'var(--red-600)', padding: '16px', backgroundColor: 'var(--red-50)', borderRadius: '8px' }}>
                    {error}
                </div>
            ) : documents.length === 0 ? (
                <div className="dash-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>No documents uploaded yet. Use the form above to upload your first one.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {documents.map((doc) => (
                        <div key={doc._id} className="dash-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <span className="badge badge-info">
                                        {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                                    </span>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                        {doc.originalName ? ` · ${doc.originalName}` : ''}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {doc.documentAnalysis && (
                                        <span className={`badge ${doc.allValuesConfirmed ? 'badge-success' : 'badge-warning'}`}>
                                            {doc.allValuesConfirmed ? '✓ Confirmed' : '⏳ Pending confirmation'}
                                        </span>
                                    )}
                                    <a
                                        href={getDocumentViewUrl(doc._id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-teal btn-sm"
                                    >
                                        🩺 View Document
                                    </a>
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
                                    This document has not been analyzed by AI.
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
