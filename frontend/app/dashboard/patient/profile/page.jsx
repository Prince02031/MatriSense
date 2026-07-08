'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
    createPatient,
    getMyPatient,
    updatePatient,
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
        latitude: null,
        longitude: null,
        nationalIdNumber: '',
        birthCertificateNumber: '',
        consentToShareWithHealthWorker: false,
        consentToUseLocationForReferral: false,
        consentToStoreDocuments: false
    });

    // --- GPS State ---
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [gpsError, setGpsError] = useState(null);

    // Load GPS/Location cache on mount (valid for 6 hours)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('matrisense_gps_cache');
                if (cached) {
                    const data = JSON.parse(cached);
                    const age = Date.now() - data.timestamp;
                    const sixHours = 6 * 60 * 60 * 1000;
                    if (age < sixHours) {
                        setFormData(prev => ({
                            ...prev,
                            division: data.division || prev.division,
                            district: data.district || prev.district,
                            upazilaOrThana: data.upazila || prev.upazilaOrThana,
                            addressOrVillage: data.address || prev.addressOrVillage,
                            latitude: data.gpsData?.latitude || prev.latitude,
                            longitude: data.gpsData?.longitude || prev.longitude
                        }));
                        if (data.gpsEnabled !== undefined) {
                            setGpsEnabled(data.gpsEnabled);
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to load GPS cache in profile:', err);
            }
        }
    }, []);

    // Save GPS/Location to cache whenever location fields change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const cacheObj = {
                    gpsData: formData.latitude && formData.longitude ? {
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        addressOrVillage: formData.addressOrVillage
                    } : null,
                    gpsEnabled,
                    division: formData.division,
                    district: formData.district,
                    upazila: formData.upazilaOrThana,
                    address: formData.addressOrVillage,
                    timestamp: Date.now()
                };
                localStorage.setItem('matrisense_gps_cache', JSON.stringify(cacheObj));
            } catch (err) {
                console.warn('Failed to save GPS cache from profile:', err);
            }
        }
    }, [formData.latitude, formData.longitude, formData.division, formData.district, formData.upazilaOrThana, formData.addressOrVillage, gpsEnabled]);

    useEffect(() => {
        if (!user) return;
        // Request GPS on component mount for persistent tracking
        requestGPS();
        fetchData();
    }, [user]);

    // GPS Functions
    const requestGPS = () => {
        if (!navigator.geolocation) {
            setGpsError('GPS not supported on your device');
            return;
        }

        setGpsError(null);
        navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const updates = {
                    latitude: parseFloat(latitude.toFixed(6)),
                    longitude: parseFloat(longitude.toFixed(6))
                };

                // Reverse-geocode to auto-fill location fields
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`;
                    const resp = await fetch(url, {
                        headers: { 'User-Agent': 'MatriSense/1.0' }
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        const addr = data.address || {};
                        const gDiv = (addr.state || '').replace(/\s*Division$/i, '').trim();
                        const gDist = (addr.state_district || addr.county || '').replace(/\s*District$/i, '').trim();
                        const gUpazila = addr.suburb || addr.town || addr.city_district || addr.city || '';
                        const parts = [addr.village, addr.hamlet, addr.neighbourhood, addr.road].filter(Boolean);
                        const gAddr = parts.length > 0 ? parts.join(', ') : '';

                        if (gDiv) updates.division = gDiv;
                        if (gDist) updates.district = gDist;
                        if (gUpazila) updates.upazilaOrThana = gUpazila;
                        if (gAddr) updates.addressOrVillage = gAddr;
                    }
                } catch (geoErr) {
                    console.warn('Reverse geocoding failed:', geoErr.message);
                }

                setFormData(prev => ({ ...prev, ...updates }));
                setGpsEnabled(true);
                setGpsError(null);
            },
            (error) => {
                setGpsError(`GPS Error: ${error.message}`);
                setGpsEnabled(false);
            },
            { 
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 30000 // Cache location for 30 seconds
            }
        );
    };

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
                    latitude: p.latitude || null,
                    longitude: p.longitude || null,
                    nationalIdNumber: p.nationalIdNumber || '',
                    birthCertificateNumber: p.birthCertificateNumber || '',
                    consentToShareWithHealthWorker: !!p.consentToShareWithHealthWorker,
                    consentToUseLocationForReferral: !!p.consentToUseLocationForReferral,
                    consentToStoreDocuments: !!p.consentToStoreDocuments
                });
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2>{pt.locationRegion}</h2>
                        {gpsEnabled && (
                            <span style={{ fontSize: '0.85rem', background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '4px', fontWeight: '500' }}>
                                ✓ GPS Active
                            </span>
                        )}
                    </div>
                    {gpsError && (
                        <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                            ⚠️ {gpsError}
                        </div>
                    )}
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>{pt.locationHelper}</p>
                    {formData.latitude && formData.longitude && (
                        <div style={{ padding: '10px', background: '#eff6ff', color: '#0c4a6e', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                            📌 Current GPS: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </div>
                    )}
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

            {/* Danger Zone */}
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
