'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getMyProfile, createPatient, updatePatient } from '../../../api/patientApi';

const BANGLADESH_DIVISIONS = [
  'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna',
  'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'
];

export default function PatientProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [existingPatient, setExistingPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [form, setForm] = useState({
    name: '',
    age: '',
    phone: '',
    trimester: 'unknown',
    gestationalWeek: '',
    expectedDeliveryDate: '',
    lastCheckupDate: '',
    knownRiskFactors: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    addressOrVillage: '',
    division: '',
    district: '',
    upazilaOrThana: '',
    latitude: '',
    longitude: '',
    locationSource: 'PROFILE'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      if (data.success && data.patient) {
        const p = data.patient;
        setExistingPatient(p);
        setForm({
          name: p.name || '',
          age: p.age || '',
          phone: p.phone || '',
          trimester: p.trimester || 'unknown',
          gestationalWeek: p.gestationalWeek || '',
          expectedDeliveryDate: p.expectedDeliveryDate ? p.expectedDeliveryDate.split('T')[0] : '',
          lastCheckupDate: p.lastCheckupDate ? p.lastCheckupDate.split('T')[0] : '',
          knownRiskFactors: Array.isArray(p.knownRiskFactors)
            ? p.knownRiskFactors.join(', ')
            : (typeof p.knownRiskFactors === 'object' ? JSON.stringify(p.knownRiskFactors) : p.knownRiskFactors || ''),
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
          addressOrVillage: p.addressOrVillage || '',
          division: p.division || '',
          district: p.district || '',
          upazilaOrThana: p.upazilaOrThana || '',
          latitude: p.latitude || '',
          longitude: p.longitude || '',
          locationSource: p.locationSource || 'PROFILE'
        });
      }
    } catch (err) {
      // No profile yet — form stays blank
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setSaveMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationSource: 'GPS'
        }));
        setGpsLoading(false);
        setSaveMessage({ type: 'info', text: `GPS location captured: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` });
      },
      (err) => {
        setGpsLoading(false);
        setSaveMessage({ type: 'error', text: `GPS denied or unavailable: ${err.message}. You can still save your address manually.` });
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.trimester) {
      setSaveMessage({ type: 'error', text: 'Name, age, and trimester are required.' });
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        name: form.name,
        age: Number(form.age),
        phone: form.phone,
        trimester: form.trimester,
        gestationalWeek: form.gestationalWeek ? Number(form.gestationalWeek) : undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        lastCheckupDate: form.lastCheckupDate || undefined,
        knownRiskFactors: form.knownRiskFactors,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        addressOrVillage: form.addressOrVillage,
        division: form.division || undefined,
        district: form.district || undefined,
        upazilaOrThana: form.upazilaOrThana || undefined,
        latitude: form.latitude !== '' ? Number(form.latitude) : undefined,
        longitude: form.longitude !== '' ? Number(form.longitude) : undefined,
        locationSource: form.locationSource || 'PROFILE'
      };

      let result;
      if (existingPatient) {
        result = await updatePatient(existingPatient._id, payload);
      } else {
        result = await createPatient(payload);
        if (result.success) setExistingPatient(result.patient);
      }

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading your profile...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginBottom: '16px' }}>
          ← Back
        </button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text)' }}>
          👤 My Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Keep your profile up to date so health workers can reach you faster.
        </p>
      </div>

      {saveMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          background: saveMessage.type === 'success' ? 'var(--success-bg, #ecfdf5)' : saveMessage.type === 'info' ? '#eff6ff' : 'var(--danger-bg, #fef2f2)',
          color: saveMessage.type === 'success' ? '#065f46' : saveMessage.type === 'info' ? '#1e40af' : '#991b1b',
          border: `1px solid ${saveMessage.type === 'success' ? '#a7f3d0' : saveMessage.type === 'info' ? '#bfdbfe' : '#fca5a5'}`
        }}>
          {saveMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Info */}
        <div className="dash-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>🧑 Personal Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Full Name <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Age <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="form-input"
                type="number"
                min="10" max="60"
                value={form.age}
                onChange={e => handleChange('age', e.target.value)}
                placeholder="Age in years"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Phone</label>
              <input
                className="form-input"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+880..."
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Emergency Contact Name</label>
              <input
                className="form-input"
                value={form.emergencyContactName}
                onChange={e => handleChange('emergencyContactName', e.target.value)}
                placeholder="Husband / parent name"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Emergency Contact Phone</label>
              <input
                className="form-input"
                value={form.emergencyContactPhone}
                onChange={e => handleChange('emergencyContactPhone', e.target.value)}
                placeholder="+880..."
              />
            </div>
          </div>
        </div>

        {/* Pregnancy Info */}
        <div className="dash-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>🤰 Pregnancy Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Trimester <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className="form-input"
                value={form.trimester}
                onChange={e => handleChange('trimester', e.target.value)}
                required
              >
                <option value="unknown">Not Sure</option>
                <option value="first">1st Trimester (0–3 months)</option>
                <option value="second">2nd Trimester (3–6 months)</option>
                <option value="third">3rd Trimester (6–9 months)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Gestational Week</label>
              <input
                className="form-input"
                type="number"
                min="1" max="42"
                value={form.gestationalWeek}
                onChange={e => handleChange('gestationalWeek', e.target.value)}
                placeholder="e.g. 28"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Expected Delivery Date</label>
              <input
                className="form-input"
                type="date"
                value={form.expectedDeliveryDate}
                onChange={e => handleChange('expectedDeliveryDate', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Last Checkup Date</label>
              <input
                className="form-input"
                type="date"
                value={form.lastCheckupDate}
                onChange={e => handleChange('lastCheckupDate', e.target.value)}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                Known Risk Factors <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>(comma-separated)</span>
              </label>
              <input
                className="form-input"
                value={form.knownRiskFactors}
                onChange={e => handleChange('knownRiskFactors', e.target.value)}
                placeholder="e.g. hypertension, diabetes, anemia"
              />
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="dash-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>📍 Location & Address</h3>
            <button
              type="button"
              onClick={handleGPS}
              disabled={gpsLoading}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '6px 14px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
            >
              {gpsLoading ? '📡 Getting GPS...' : '🌐 Use My Current Location'}
            </button>
          </div>

          {(form.latitude || form.longitude) && (
            <div style={{
              padding: '8px 12px', background: '#eff6ff', borderRadius: '6px',
              fontSize: '0.8rem', color: '#1e40af', marginBottom: '16px', border: '1px solid #bfdbfe'
            }}>
              📡 GPS: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)} ({form.locationSource})
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Division</label>
              <select
                className="form-input"
                value={form.division}
                onChange={e => handleChange('division', e.target.value)}
              >
                <option value="">Select Division</option>
                {BANGLADESH_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>District</label>
              <input
                className="form-input"
                value={form.district}
                onChange={e => handleChange('district', e.target.value)}
                placeholder="e.g. Dhaka, Sylhet, Khulna"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Upazila / Thana</label>
              <input
                className="form-input"
                value={form.upazilaOrThana}
                onChange={e => handleChange('upazilaOrThana', e.target.value)}
                placeholder="e.g. Dhanmondi, Savar"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Village / Address</label>
              <input
                className="form-input"
                value={form.addressOrVillage}
                onChange={e => handleChange('addressOrVillage', e.target.value)}
                placeholder="Full address or village name"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : existingPatient ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
