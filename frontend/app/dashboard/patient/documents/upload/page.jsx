'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { useLanguage } from '../../../../context/LanguageContext';
import MedicalDocumentUpload from '../../../../components/dashboard/MedicalDocumentUpload';
import ManualDocumentUpload from '../../../../components/dashboard/ManualDocumentUpload';

export default function UploadDocumentPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const dt = t.documentsUploadPage || {};
    const [mode, setMode] = useState('ai'); // 'ai' | 'manual'

    if (!user) return null;

    const goToDocuments = () => router.push('/dashboard/patient/documents');

    return (
        <div className="dashboard-container" style={{ maxWidth: '760px', margin: '0 auto', padding: '20px' }}>
            <Link href="/dashboard/patient/documents" style={{ color: 'var(--primary)', marginBottom: '20px', display: 'inline-block' }}>
                {dt.backToDocuments || '← Back to Documents'}
            </Link>

            <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>{dt.title || '📤 Upload a Document'}</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{dt.subtitle}</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={mode === 'ai' ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'}
                >
                    {dt.aiTabLabel || '🤖 AI-Assisted Upload'}
                </button>
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className={mode === 'manual' ? 'btn btn-teal btn-sm' : 'btn btn-outline btn-sm'}
                >
                    {dt.manualTabLabel || '📁 Manual Upload'}
                </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                {mode === 'ai' ? dt.aiTabDesc : dt.manualTabDesc}
            </p>

            {mode === 'ai' ? (
                <MedicalDocumentUpload onSaved={goToDocuments} />
            ) : (
                <ManualDocumentUpload onUploaded={goToDocuments} />
            )}
        </div>
    );
}
