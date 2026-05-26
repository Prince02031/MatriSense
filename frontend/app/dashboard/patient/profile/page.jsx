'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
    createPatient,
    getMyPatient,
    updatePatient,
    uploadPatientDocument,
    getMyPatientDocuments,
    deletePatientDocument
} from '../../../api/patientApi';

/**
 * Patient Profile & Document Management Page
 */
export default function PatientProfilePage() {
    const { user, authFetch, logout } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    const [patientId, setPatientId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Determine translation context early so handlers can use it
    const pt = t.profile || t.en?.profile || {
        createError: 'Error', createSuccess: 'Success', createFail: 'Fail',
        updateSuccess: 'Success', updateFail: 'Fail', errorSaving: 'Error',
        confirmDeleteDoc: 'Delete?', confirmDeactivate: 'Deactivate?',
        deactivateSuccess: 'Deactivated', deactivateFail: 'Fail'
    };

    // --- Profile Form State ---
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        phone: '',
        email: '',
        trimester: 'first',
        gestationalWeek: '',
        expectedDeliveryDate: '',
        lastCheckupDate: '',
        knownRiskFactors: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        division: '',
        district: '',
        upazilaOrThana: '',
        addressOrVillage: '',
        nationalIdNumber: '',
        birthCertificateNumber: '',
        consentToShareWithHealthWorker: false,
        consentToUseLocationForReferral: false,
        consentToStoreDocuments: false
    });

    // --- Documents State ---
    const [documents, setDocuments] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docForm, setDocForm] = useState({
        documentType: 'PREVIOUS_MEDICAL_REPORT',
        title: '',
        description: '',
        file: null
    });

    // --- Allowed Document Types ---
    const DOC_TYPES = [
        { value: 'NATIONAL_ID', label: 'National ID' },
        { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
        { value: 'PREVIOUS_MEDICAL_REPORT', label: 'Previous Medical Report' },
        { value: 'PRESCRIPTION', label: 'Prescription' },
        { value: 'ULTRASOUND_REPORT', label: 'Ultrasound Report' },
        { value: 'LAB_REPORT', label: 'Lab Report' },
        { value: 'OTHER_MEDICAL_DOCUMENT', label: 'Other Document' }
    ];

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First load profile
            const profileRes = await getMyPatient();
            if (profileRes.success && profileRes.patient) {
                const p = profileRes.patient;
                setPatientId(p._id);

                setFormData({
                    name: p.name || '',
                    age: p.age || '',
                    phone: p.phone || '',
                    email: p.email || '',
                    trimester: p.trimester || 'first',
                    gestationalWeek: p.gestationalWeek || '',
                    expectedDeliveryDate: p.expectedDeliveryDate ? p.expectedDeliveryDate.split('T')[0] : '',
                    lastCheckupDate: p.lastCheckupDate ? p.lastCheckupDate.split('T')[0] : '',
                    knownRiskFactors: typeof p.knownRiskFactors === 'string' ? p.knownRiskFactors : JSON.stringify(p.knownRiskFactors || ''),
                    emergencyContactName: p.emergencyContactName || '',
                    emergencyContactPhone: p.emergencyContactPhone || '',
                    division: p.division || '',
                    district: p.district || '',
                    upazilaOrThana: p.upazilaOrThana || '',
                    addressOrVillage: p.addressOrVillage || '',
                    nationalIdNumber: p.nationalIdNumber || '',
                    birthCertificateNumber: p.birthCertificateNumber || '',
                    consentToShareWithHealthWorker: !!p.consentToShareWithHealthWorker,
                    consentToUseLocationForReferral: !!p.consentToUseLocationForReferral,
                    consentToStoreDocuments: !!p.consentToStoreDocuments
                });

                // Then load documents
                const docsRes = await getMyPatientDocuments();
                if (docsRes.success) {
                    setDocuments(docsRes.documents || []);
                }
            } else {
                setMessage('Profile not found. Please complete the triage flow to create a profile.');
            }
        } catch (error) {
            console.error('Failed to load profile/docs:', error);
            setMessage('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- Profile Handlers ---
    const handleProfileChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setMessage('');
        setSaving(true);
        try {
            // Format data before saving
            const payload = { ...formData };
            if (!payload.expectedDeliveryDate) delete payload.expectedDeliveryDate;
            if (!payload.lastCheckupDate) delete payload.lastCheckupDate;

            let res;
            if (!patientId) {
                // Determine if we have minimum required fields
                if (!payload.name || !payload.age || !payload.trimester) {
                    setMessage(`❌ ${pt.createError}`);
                    setSaving(false);
                    return;
                }
                res = await createPatient(payload);
                if (res.success && res.patient) {
                    setPatientId(res.patient._id);
                    setMessage(`✅ ${pt.createSuccess}`);
                } else {
                    setMessage(`❌ ${pt.createFail}${res.error || 'Unknown error'}`);
                }
            } else {
                res = await updatePatient(patientId, payload);
                if (res.success) {
                    setMessage(`✅ ${pt.updateSuccess}`);
                } else {
                    setMessage(`❌ ${pt.updateFail}${res.error || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error(error);
            setMessage(`❌ ${pt.errorSaving}`);
        } finally {
            setSaving(false);
        }
    };

    // --- Document Handlers ---
    const handleDocChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'file') {
            setDocForm(prev => ({ ...prev, file: files[0] }));
        } else {
            setDocForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!docForm.file) {
            alert('Please select a file to upload.');
            return;
        }

        setUploadingDoc(true);
        try {
            const data = new FormData();
            data.append('file', docForm.file);
            data.append('documentType', docForm.documentType);
            if (docForm.title) data.append('title', docForm.title);
            if (docForm.description) data.append('description', docForm.description);

            const res = await uploadPatientDocument(data);

            if (res.success) {
                // Prepend new doc to list
                setDocuments(prev => [res.document, ...prev]);
                // Reset form
                setDocForm({
                    documentType: 'PREVIOUS_MEDICAL_REPORT',
                    title: '',
                    description: '',
                    file: null
                });

                // Reset file input element visually
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';

            } else {
                alert(`Upload failed: ${res.error}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('An error occurred during upload.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        if (!confirm(pt.confirmDeleteDoc)) return;

        try {
            const res = await deletePatientDocument(docId);
            if (res.success) {
                setDocuments(prev => prev.filter(d => d._id !== docId));
            } else {
                alert(`Delete failed: ${res.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while deleting.');
        }
    };

    const handleDeactivateAccount = async () => {
        const confirmed = confirm(pt.confirmDeactivate);
        if (!confirmed) return;

        try {
            const res = await authFetch(`${API_BASE}/api/auth/me`, { method: 'DELETE' });
            if (res.ok) {
                alert(pt.deactivateSuccess);
                logout();
                router.push('/');
            } else {
                const data = await res.json();
                alert(`${pt.deactivateFail}${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deactivating account:', error);
            alert(pt.errorSaving);
        }
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>{pt.title}</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
                {pt.subtitle}
            </p>

            {message && (
                <div style={{
                    padding: '12px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    backgroundColor: message.includes('❌') ? '#fee2e2' : '#dcfce7',
                    color: message.includes('❌') ? '#b91c1c' : '#15803d'
                }}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* 1. Basic Info */}
                <div className="card">
                    <h2>{pt.basicInfo}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div>
                            <label>{pt.name}</label>
                            <input name="name" value={formData.name} onChange={handleProfileChange} required className="input-field" />
                        </div>
                        <div>
                            <label>{pt.age}</label>
                            <input type="number" name="age" value={formData.age} onChange={handleProfileChange} required className="input-field" />
                        </div>
                        <div>
                            <label>{pt.phone}</label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleProfileChange} className="input-field" />
                        </div>
                        <div>
                            <label>{pt.email}</label>
                            <input type="email" name="email" value={formData.email} onChange={handleProfileChange} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* 2. Pregnancy Info */}
                <div className="card">
                    <h2>{pt.pregnancyDetails}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div>
                            <label>{pt.trimester}</label>
                            <select name="trimester" value={formData.trimester} onChange={handleProfileChange} className="input-field">
                                <option value="first">{pt.firstTrimester}</option>
                                <option value="second">{pt.secondTrimester}</option>
                                <option value="third">{pt.thirdTrimester}</option>
                                <option value="unknown">{pt.unknown}</option>
                            </select>
                        </div>
                        <div>
                            <label>{pt.gestationalWeek}</label>
                            <input type="number" name="gestationalWeek" value={formData.gestationalWeek} onChange={handleProfileChange} className="input-field" />
                        </div>
                        <div>
                            <label>{pt.expectedDeliveryDate}</label>
                            <input type="date" name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleProfileChange} className="input-field" />
                        </div>
                        <div>
                            <label>{pt.lastCheckupDate}</label>
                            <input type="date" name="lastCheckupDate" value={formData.lastCheckupDate} onChange={handleProfileChange} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* 3. Location */}
                <div className="card">
                    <h2>{pt.locationRegion}</h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>{pt.locationHelper}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div><label>{pt.division}</label><input name="division" value={formData.division} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>{pt.district}</label><input name="district" value={formData.district} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>{pt.upazila}</label><input name="upazilaOrThana" value={formData.upazilaOrThana} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>{pt.village}</label><input name="addressOrVillage" value={formData.addressOrVillage} onChange={handleProfileChange} className="input-field" /></div>
                    </div>
                </div>

                {/* 4. Emergency */}
                <div className="card">
                    <h2>{pt.emergencyContact}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div><label>{pt.contactName}</label><input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>{pt.contactPhone}</label><input type="tel" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleProfileChange} className="input-field" /></div>
                    </div>
                </div>

                {/* 5. Optional Identity */}
                <div className="card">
                    <h2>{pt.identification}</h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>{pt.idHelper}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div><label>{pt.nationalId}</label><input name="nationalIdNumber" value={formData.nationalIdNumber} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>{pt.birthCertificate}</label><input name="birthCertificateNumber" value={formData.birthCertificateNumber} onChange={handleProfileChange} className="input-field" /></div>
                    </div>
                </div>

                {/* 6. Consent */}
                <div className="card">
                    <h2>{pt.privacyConsent}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="consentToShareWithHealthWorker" checked={formData.consentToShareWithHealthWorker} onChange={handleProfileChange} style={{ width: '20px', height: '20px' }} />
                            <span>{pt.consentShare}</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="consentToUseLocationForReferral" checked={formData.consentToUseLocationForReferral} onChange={handleProfileChange} style={{ width: '20px', height: '20px' }} />
                            <span>{pt.consentLocation}</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" name="consentToStoreDocuments" checked={formData.consentToStoreDocuments} onChange={handleProfileChange} style={{ width: '20px', height: '20px' }} />
                            <span>{pt.consentStore}</span>
                        </label>
                    </div>
                </div>

                {/* Submit Profile */}
                <div>
                    <button type="submit" className="button" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} disabled={saving}>
                        {saving ? pt.savingButton : pt.saveButton}
                    </button>
                </div>
            </form>

            <hr style={{ margin: '48px 0', border: 'none', borderTop: '2px solid #e2e8f0' }} />

            {/* 7. Documents Section */}
            <div className="card" style={{ marginBottom: '40px' }}>
                <h2>{pt.documentsTitle}</h2>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                    <strong>Note:</strong> {pt.documentsHelper}
                </div>

                {/* Upload Form */}
                <form onSubmit={handleUploadDocument} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label>{pt.docType}</label>
                            <select name="documentType" value={docForm.documentType} onChange={handleDocChange} className="input-field" required>
                                {DOC_TYPES.map(tOption => <option key={tOption.value} value={tOption.value}>{pt.docTypes[tOption.value] || tOption.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>{pt.docTitle}</label>
                            <input name="title" value={docForm.title} onChange={handleDocChange} className="input-field" placeholder={pt.docTitlePlaceholder} />
                        </div>
                    </div>
                    <div>
                        <label>{pt.selectFile}</label>
                        <input id="file-upload" type="file" name="file" onChange={handleDocChange} className="input-field" required accept=".jpg,.jpeg,.png,.webp,.pdf" />
                    </div>
                    <button type="submit" className="button button-outline" disabled={uploadingDoc} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                        {uploadingDoc ? pt.uploadingButton : pt.uploadButton}
                    </button>
                </form>

                {/* List Documents */}
                <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{pt.uploadedDocsList} ({documents.length})</h3>
                    {documents.length === 0 ? (
                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>{pt.noDocs}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {documents.map(doc => (
                                <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{doc.title || doc.originalName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                            {pt.docTypes[doc.documentType] || doc.documentType} •
                                            {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB •
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a
                                            href={`${API_BASE}/api/documents/${doc._id}/download`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="badge badge-success"
                                            style={{ textDecoration: 'none', cursor: 'pointer' }}
                                        >
                                            {pt.viewDoc}
                                        </a>
                                        <button
                                            onClick={() => handleDeleteDocument(doc._id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            {pt.deleteDoc}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <hr style={{ margin: '48px 0', border: 'none', borderTop: '2px solid #e2e8f0' }} />

            {/* 8. Danger Zone */}
            <div className="card" style={{ marginBottom: '40px', border: '1px solid #fecaca' }}>
                <h2 style={{ color: '#dc2626' }}>{pt.dangerZone}</h2>
                <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '16px' }}>
                    {pt.dangerHelper}
                </p>
                <button
                    onClick={handleDeactivateAccount}
                    className="button"
                    style={{ backgroundColor: '#dc2626', padding: '12px 24px' }}>
                    {pt.deactivateButton}
                </button>
            </div>

            <style jsx>{`
                .card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                .card h2 {
                    font-size: 1.25rem;
                    color: #0f172a;
                    margin: 0;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 12px;
                }
                .input-field {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    font-size: 1rem;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .input-field:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #475569;
                    margin-bottom: 4px;
                }
                .button {
                    background-color: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background-color 0.2s;
                }
                .button:hover { background-color: #4338ca; }
                .button:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .button-outline {
                    background-color: transparent;
                    border: 2px solid #4f46e5;
                    color: #4f46e5;
                    padding: 10px 20px;
                }
                .button-outline:hover {
                    background-color: #eef2ff;
                }
            `}</style>
        </div>
    );
}
