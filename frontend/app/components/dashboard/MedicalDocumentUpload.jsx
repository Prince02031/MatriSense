'use client';

import { useState, useRef } from 'react';
import { analyzeMedicalDocument } from '../../api/patientApi';
import ExtractedValuesList from './ExtractedValuesList';
import DocumentReviewChat from './DocumentReviewChat';

const DOC_TYPE_LABELS = {
    prescription: 'Prescription',
    lab_report: 'Lab Report',
    ultrasound_report: 'Ultrasound Report',
    blood_pressure_card: 'Blood Pressure Card',
    other: 'Other Document',
};

export default function MedicalDocumentUpload({ onSaved }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [stage, setStage] = useState('idle'); // idle | preview | analyzing | result | confirmed
    const [result, setResult] = useState(null);
    const [documentId, setDocumentId] = useState(null);
    const [riskFactorsApplied, setRiskFactorsApplied] = useState(null);
    const [error, setError] = useState(null);
    const [showReviewChat, setShowReviewChat] = useState(false);

    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleFileSelected = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setResult(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStage('preview');
    };

    const handleAnalyze = async () => {
        setStage('analyzing');
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const data = await analyzeMedicalDocument(formData);

            if (!data.success) {
                throw new Error(data.error || 'Failed to analyze document.');
            }

            setResult(data.analysis);
            setDocumentId(data.documentId || null);
            setRiskFactorsApplied(data.riskFactorsApplied || {});
            setStage('result');
        } catch (err) {
            setError(err.message || 'Failed to analyze document. Please try again.');
            setStage('preview');
        }
    };

    const handleConfirm = () => {
        // Risk factors are already merged into Patient.knownRiskFactors by
        // the backend during /analyze — this just acknowledges the result.
        setStage('confirmed');
        onSaved?.();
    };

    const handleReset = () => {
        setPreviewUrl(null);
        setSelectedFile(null);
        setResult(null);
        setDocumentId(null);
        setRiskFactorsApplied(null);
        setError(null);
        setShowReviewChat(false);
        setStage('idle');
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    return (
        <div className="dash-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>📄 Upload Medical Document</h3>
                <span className="badge badge-info">Experimental</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
                Photograph a prescription, lab report, or blood pressure card. AI will extract the
                values and flag anything outside the safe range for pregnancy.
            </p>

            {/* --- Idle: capture buttons --- */}
            {stage === 'idle' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelected}
                        style={{ display: 'none' }}
                    />
                    <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelected}
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        className="badge badge-info"
                        style={{ padding: '10px 18px', cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}
                        onClick={() => cameraInputRef.current?.click()}
                    >
                        📷 Take Photo
                    </button>
                    <button
                        type="button"
                        className="badge badge-success"
                        style={{ padding: '10px 18px', cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}
                        onClick={() => galleryInputRef.current?.click()}
                    >
                        🖼️ Choose from Gallery
                    </button>
                </div>
            )}

            {/* --- Preview + Analyze --- */}
            {(stage === 'preview' || stage === 'analyzing') && previewUrl && (
                <div style={{ marginTop: '16px' }}>
                    <img
                        src={previewUrl}
                        alt="Document preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '280px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            display: 'block',
                        }}
                    />
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button
                            type="button"
                            className="badge badge-info"
                            disabled={stage === 'analyzing'}
                            style={{ padding: '10px 18px', cursor: stage === 'analyzing' ? 'not-allowed' : 'pointer', border: 'none', fontSize: '0.9rem' }}
                            onClick={handleAnalyze}
                        >
                            {stage === 'analyzing' ? '🔎 Analyzing...' : '🔎 Analyze Document'}
                        </button>
                        <button
                            type="button"
                            style={{ padding: '10px 18px', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'transparent', borderRadius: '999px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                            onClick={handleReset}
                            disabled={stage === 'analyzing'}
                        >
                            ✕ Cancel
                        </button>
                    </div>
                    {stage === 'analyzing' && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                            Reading document with AI... this can take a few seconds.
                        </p>
                    )}
                </div>
            )}

            {error && (
                <p style={{ color: 'var(--accent-rose)', marginTop: '12px', fontSize: '0.9rem' }}>{error}</p>
            )}

            {/* --- Result --- */}
            {(stage === 'result' || stage === 'confirmed') && result && (
                <div style={{ marginTop: '20px' }}>
                    <div
                        style={{
                            padding: '10px 6px',
                            background: 'rgba(251, 191, 36, 0.08)',
                            border: '1px dashed var(--accent-amber)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                        }}
                    >
                        🤖 AI-extracted from your photo. Always double check with your health worker.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span className="badge badge-info">
                            {DOC_TYPE_LABELS[result.documentType] || result.documentType}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {result.isReadable ? 'Readable ✓' : 'Low quality image ⚠️'}
                        </span>
                    </div>

                    <ExtractedValuesList values={result.extractedValues} />

                    <div
                        style={{
                            marginTop: '16px',
                            padding: '12px 14px',
                            background: 'rgba(239, 68, 68, 0.06)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                        }}
                    >
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{result.summary}</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {result.summaryBn}
                        </p>
                    </div>

                    {stage === 'result' && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="badge badge-info"
                                style={{ padding: '10px 18px', cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}
                                onClick={() => setShowReviewChat(true)}
                                disabled={!documentId}
                            >
                                💬 Discuss &amp; Confirm with Assistant
                            </button>
                            <button
                                type="button"
                                className="badge badge-success"
                                style={{ padding: '10px 18px', cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}
                                onClick={handleConfirm}
                            >
                                ✓ Save without discussing
                            </button>
                            <button
                                type="button"
                                style={{ padding: '10px 18px', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'transparent', borderRadius: '999px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                                onClick={handleReset}
                            >
                                Upload Another
                            </button>
                        </div>
                    )}

                    {stage === 'confirmed' && (
                        <div style={{ marginTop: '16px' }}>
                            <p style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '0.9rem' }}>
                                {riskFactorsApplied && Object.keys(riskFactorsApplied).length > 0
                                    ? `✓ Saved to your profile as known risk factors: ${Object.keys(riskFactorsApplied).join(', ')}`
                                    : '✓ Document saved to your profile.'}
                            </p>
                            <button
                                type="button"
                                style={{ padding: '10px 18px', cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'transparent', borderRadius: '999px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}
                                onClick={handleReset}
                            >
                                Upload Another Document
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showReviewChat && documentId && (
                <DocumentReviewChat
                    documentId={documentId}
                    onClose={() => setShowReviewChat(false)}
                    onDone={() => {
                        setShowReviewChat(false);
                        handleConfirm();
                    }}
                />
            )}
        </div>
    );
}
