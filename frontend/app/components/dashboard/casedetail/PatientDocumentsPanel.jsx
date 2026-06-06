import { useState, useEffect } from 'react';
import { getCaseDocuments } from '../../../api/workerApi';

export default function PatientDocumentsPanel({ sessionId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [consentDenied, setConsentDenied] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        const fetchDocuments = async () => {
            try {
                const res = await getCaseDocuments(sessionId);
                if (res.success) {
                    setDocuments(res.documents || []);
                    if (res.consentDenied) {
                        setConsentDenied(true);
                    }
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

        fetchDocuments();
    }, [sessionId]);

    const formatBytes = (bytes) => {
        if (!bytes) return '0 MB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    // Convert document ENUM to readable text
    const formatType = (type) => {
        return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (loading) {
        return (
            <div className="dash-card">
                <h3>📁 Patient Documents</h3>
                <p style={{ color: 'var(--text-muted)' }}>Loading documents...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dash-card">
                <h3>📁 Patient Documents</h3>
                <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
        );
    }

    if (consentDenied) {
        return (
            <div className="dash-card">
                <h3>📁 Patient Documents</h3>
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
                        This patient has not enabled document sharing with health workers. They can enable this in their profile settings.
                    </p>
                </div>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="dash-card">
                <h3>📁 Patient Documents</h3>
                <p style={{ color: 'var(--text-muted)' }}>No medical documents available for this patient.</p>
            </div>
        );
    }

    return (
        <div className="dash-card">
            <h3>📁 Patient Documents</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {documents.map(doc => (
                    <div key={doc._id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc'
                    }}>
                        <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                                {doc.title || doc.originalName}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {formatType(doc.documentType)} • {formatBytes(doc.sizeBytes)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            {/* Uses the protected download endpoint built previously */}
                            <a
                                href={`${API_BASE}/api/documents/${doc._id}/download?token=${typeof window !== 'undefined' ? localStorage.getItem('matrisense_token') || '' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="badge badge-indigo"
                                style={{ textDecoration: 'none', cursor: 'pointer', padding: '6px 12px' }}
                            >
                                👁️ View
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
