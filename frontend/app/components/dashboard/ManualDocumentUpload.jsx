'use client';

import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { uploadPatientDocument } from '../../api/patientApi';

const DOC_TYPES = [
    'PREVIOUS_MEDICAL_REPORT',
    'PRESCRIPTION',
    'ULTRASOUND_REPORT',
    'LAB_REPORT',
    'NATIONAL_ID',
    'BIRTH_CERTIFICATE',
    'OTHER_MEDICAL_DOCUMENT',
];

/**
 * Plain (non-AI) document upload — for IDs, certificates, or old reports
 * that don't need Gemini Vision analysis. Extracted from the profile page
 * so it can live alongside the AI-assisted uploader on one "Upload a
 * Document" page.
 */
export default function ManualDocumentUpload({ onUploaded }) {
    const { t } = useLanguage();
    const pt = t.profile || {};

    const [docForm, setDocForm] = useState({
        documentType: 'PREVIOUS_MEDICAL_REPORT',
        title: '',
        file: null,
    });
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'file') {
            setDocForm((prev) => ({ ...prev, file: files[0] }));
        } else {
            setDocForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!docForm.file) {
            setError('Please select a file to upload.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', docForm.file);
            formData.append('documentType', docForm.documentType);
            if (docForm.title) formData.append('title', docForm.title);

            const res = await uploadPatientDocument(formData);

            if (res.success) {
                setDocForm({ documentType: 'PREVIOUS_MEDICAL_REPORT', title: '', file: null });
                const fileInput = document.getElementById('manual-file-upload');
                if (fileInput) fileInput.value = '';
                onUploaded?.(res.document);
            } else {
                setError(res.error || 'Upload failed.');
            }
        } catch (err) {
            console.error('[ManualDocumentUpload] error:', err);
            setError('An error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="dash-card">
            <h3 style={{ margin: 0 }}>📁 {pt.uploadedDocsList || 'Upload Document'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
                {pt.documentsHelper}
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            {pt.docType || 'Document Type'}
                        </label>
                        <select
                            name="documentType"
                            value={docForm.documentType}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        >
                            {DOC_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {pt.docTypes?.[type] || type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            {pt.docTitle || 'Custom Title (Optional)'}
                        </label>
                        <input
                            name="title"
                            value={docForm.title}
                            onChange={handleChange}
                            placeholder={pt.docTitlePlaceholder}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {pt.selectFile || 'Select File (Max 5MB)'}
                    </label>
                    <input
                        id="manual-file-upload"
                        type="file"
                        name="file"
                        onChange={handleChange}
                        required
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        style={{ width: '100%' }}
                    />
                </div>

                {error && <p style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

                <button
                    type="submit"
                    className="btn btn-teal btn-sm"
                    disabled={uploading}
                    style={{ alignSelf: 'flex-start' }}
                >
                    {uploading ? pt.uploadingButton || 'Uploading...' : pt.uploadButton || '📤 Upload Document'}
                </button>
            </form>
        </div>
    );
}
