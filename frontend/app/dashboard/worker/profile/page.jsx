'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
    getMyWorkerProfile,
    updateMyWorkerProfile,
    uploadWorkerCertification,
    getMyWorkerCertification
} from '../../../api/workerApi';

export default function WorkerProfilePage() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [profile, setProfile] = useState(null);

    // --- Profile Form State ---
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        professionalTitle: '',
        organizationName: '',
        workplaceName: '',
        registrationNumber: '',
        certificationType: '',
        yearsOfExperience: '',
        coverageDistricts: '',
        coverageUpazilas: ''
    });

    // --- Certification State ---
    const [certifications, setCertifications] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docForm, setDocForm] = useState({
        documentType: 'BMDC_OR_PROFESSIONAL_REGISTRATION',
        title: '',
        description: '',
        file: null
    });

    const DOC_TYPES = [
        { value: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate' },
        { value: 'NURSING_CERTIFICATE', label: 'Nursing Certificate' },
        { value: 'COMMUNITY_HEALTH_WORKER_CERTIFICATE', label: 'CHW Certificate' },
        { value: 'BMDC_OR_PROFESSIONAL_REGISTRATION', label: 'BMDC / Registration' },
        { value: 'ORGANIZATION_ID', label: 'Organization ID' },
        { value: 'TRAINING_CERTIFICATE', label: 'Training Certificate' },
        { value: 'OTHER_CERTIFICATION', label: 'Other' }
    ];

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Load Profile
            const profileRes = await getMyWorkerProfile();
            if (profileRes.success && profileRes.profile) {
                const p = profileRes.profile;
                setProfile(p);
                setFormData({
                    name: p.name || '',
                    phone: p.phone || '',
                    email: p.email || '',
                    professionalTitle: p.professionalTitle || '',
                    organizationName: p.organizationName || '',
                    workplaceName: p.workplaceName || '',
                    registrationNumber: p.registrationNumber || '',
                    certificationType: p.certificationType || '',
                    yearsOfExperience: p.yearsOfExperience || '',
                    coverageDistricts: (p.coverageDistricts || []).join(', '),
                    coverageUpazilas: (p.coverageUpazilas || []).join(', ')
                });
            }

            // Load Certifications
            const certsRes = await getMyWorkerCertification();
            if (certsRes.success) {
                setCertifications(certsRes.documents || []);
            }
        } catch (error) {
            console.error('Failed to loading worker profile info:', error);
            setMessage('❌ Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setMessage('');
        setSaving(true);
        try {
            const payload = {
                ...formData,
                // Convert comma-separated strings back to arrays
                coverageDistricts: formData.coverageDistricts.split(',').map(s => s.trim()).filter(Boolean),
                coverageUpazilas: formData.coverageUpazilas.split(',').map(s => s.trim()).filter(Boolean)
            };
            // Clean empty numbers
            if (!payload.yearsOfExperience) delete payload.yearsOfExperience;

            const res = await updateMyWorkerProfile(payload);
            if (res.success) {
                setMessage('✅ Profile updated successfully.');
                setProfile(res.profile);
            } else {
                setMessage(`❌ Update failed: ${res.error}`);
            }
        } catch (error) {
            console.error(error);
            setMessage('❌ An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const handleDocChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'file') {
            setDocForm(prev => ({ ...prev, file: files[0] }));
        } else {
            setDocForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleUploadUpload = async (e) => {
        e.preventDefault();
        if (!docForm.file) {
            alert('Please select a file.');
            return;
        }

        setUploadingDoc(true);
        try {
            const data = new FormData();
            data.append('file', docForm.file);
            data.append('documentType', docForm.documentType);
            if (docForm.title) data.append('title', docForm.title);
            if (docForm.description) data.append('description', docForm.description);

            const res = await uploadWorkerCertification(data);
            if (res.success) {
                setCertifications(prev => [res.document, ...prev]);
                setProfile(prev => ({ ...prev, certificationStatus: 'PENDING' }));

                setDocForm({
                    documentType: 'BMDC_OR_PROFESSIONAL_REGISTRATION',
                    title: '',
                    description: '',
                    file: null
                });

                const fileInput = document.getElementById('cert-upload');
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

    const renderVerificationBadge = (status) => {
        switch (status) {
            case 'VERIFIED': return <span className="badge badge-success">✅ VERIFIED</span>;
            case 'PENDING': return <span className="badge badge-warning">⏳ PENDING REVIEW</span>;
            case 'REJECTED': return <span className="badge badge-danger">❌ REJECTED</span>;
            case 'MISSING':
            default: return <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>⚠️ MISSING</span>;
        }
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (loading) return <div className="loading-spinner">Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 className="section-title" style={{ margin: 0 }}>⚕️ Professional Profile</h1>
                <div>{renderVerificationBadge(profile?.certificationStatus)}</div>
            </div>

            <p style={{ color: '#666', marginBottom: '24px' }}>
                Certification is required to complete your health worker profile. In this MVP, uploaded documents remain <strong>verification pending</strong> until an administrator reviews them. Access to triage cases is temporarily granted without verification for demo purposes.
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
                    <h2>Basic Information</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div><label>Name</label><input name="name" value={formData.name} onChange={handleProfileChange} required className="input-field" /></div>
                        <div><label>Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleProfileChange} required className="input-field" /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleProfileChange} className="input-field" /></div>
                    </div>
                </div>

                {/* 2. Professional Info */}
                <div className="card">
                    <h2>Professional Information</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div><label>Professional Title</label><input name="professionalTitle" value={formData.professionalTitle} onChange={handleProfileChange} className="input-field" placeholder="e.g. Registered Nurse" /></div>
                        <div><label>Organization Name</label><input name="organizationName" value={formData.organizationName} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>Workplace / Clinic Name</label><input name="workplaceName" value={formData.workplaceName} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>Registration Number</label><input name="registrationNumber" value={formData.registrationNumber} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>Certification Type</label><input name="certificationType" value={formData.certificationType} onChange={handleProfileChange} className="input-field" /></div>
                        <div><label>Years of Experience</label><input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleProfileChange} className="input-field" /></div>
                    </div>
                </div>

                {/* 3. Coverage Area */}
                <div className="card">
                    <h2>Coverage Area (Comma separated)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <div><label>Districts</label><input name="coverageDistricts" value={formData.coverageDistricts} onChange={handleProfileChange} className="input-field" placeholder="Dhaka, Gazipur" /></div>
                        <div><label>Upazilas</label><input name="coverageUpazilas" value={formData.coverageUpazilas} onChange={handleProfileChange} className="input-field" placeholder="Tejgaon, Savar" /></div>
                    </div>
                </div>

                <div>
                    <button type="submit" className="button" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile Details'}
                    </button>
                </div>
            </form>

            <hr style={{ margin: '48px 0', border: 'none', borderTop: '2px solid #e2e8f0' }} />

            {/* 4. Certification Upload */}
            <div className="card" style={{ marginBottom: '40px' }}>
                <h2>Upload Certification</h2>
                {profile?.certificationStatus === 'MISSING' && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', marginTop: '16px', color: '#b91c1c' }}>
                        <strong>⚠️ Certification missing.</strong> Please upload your professional credentials.
                    </div>
                )}
                {profile?.certificationStatus === 'PENDING' && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', marginTop: '16px', color: '#b45309' }}>
                        <strong>⏳ Verification Pending.</strong> Your documents have been received and are awaiting admin approval.
                    </div>
                )}

                <form onSubmit={handleUploadUpload} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label>Document Type</label>
                            <select name="documentType" value={docForm.documentType} onChange={handleDocChange} className="input-field" required>
                                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>Title (Optional)</label>
                            <input name="title" value={docForm.title} onChange={handleDocChange} className="input-field" />
                        </div>
                    </div>
                    <div>
                        <label>Select File (Max 5MB)</label>
                        <input id="cert-upload" type="file" name="file" onChange={handleDocChange} className="input-field" required accept=".jpg,.jpeg,.png,.webp,.pdf" />
                    </div>
                    <button type="submit" className="button button-outline" disabled={uploadingDoc} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                        {uploadingDoc ? 'Uploading...' : '📤 Upload Certification'}
                    </button>
                </form>

                {/* Uploaded List */}
                <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Uploaded Documents ({certifications.length})</h3>
                    {certifications.length === 0 ? (
                        <p style={{ color: '#64748b', fontStyle: 'italic' }}>No documents uploaded yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {certifications.map(doc => (
                                <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{doc.title || doc.originalName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                            {DOC_TYPES.find(d => d.value === doc.documentType)?.label || doc.documentType} •
                                            {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB •
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a href={`${API_BASE}/api/documents/${doc._id}/download`} target="_blank" rel="noopener noreferrer" className="badge badge-success" style={{ textDecoration: 'none', cursor: 'pointer' }}>View</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                .button-outline:hover { background-color: #eef2ff; }
            `}</style>
        </div>
    );
}
