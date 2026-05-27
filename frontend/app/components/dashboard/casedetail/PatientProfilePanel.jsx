'use client';

import { useState, useEffect } from 'react';
import CasePriorityBadge from '../CasePriorityBadge';
import RiskBadge from '../RiskBadge';

export default function PatientProfilePanel({ patient, decision, caseState, nextCheckupDate, followUpDateSetBy, onLocationDataChange }) {
    const profile = caseState?.profile || {};
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [gpsData, setGpsData] = useState(null);
    const [gpsError, setGpsError] = useState(null);

    const name = patient?.name || profile?.name || 'Anonymous Patient';
    const age = patient?.age ? `${patient.age} yrs` : profile?.age ? `${profile.age} yrs` : 'N/A';
    const phone = patient?.phone || 'N/A';
    const trimester = patient?.trimester || profile?.trimester || 'unknown';
    const gestationalWeek = patient?.gestationalWeek || profile?.gestationalWeek || 'N/A';

    // Location data priority: GPS > Previously filled fields > N/A
    const division = gpsData?.division || patient?.division || profile?.division || 'N/A';
    const district = gpsData?.district || patient?.district || profile?.district || 'N/A';
    const upazila = gpsData?.upazilaOrThana || patient?.upazilaOrThana || profile?.upazilaOrThana || 'N/A';
    const address = gpsData?.addressOrVillage || patient?.addressOrVillage || profile?.addressOrVillage || 'N/A';
    const latitude = gpsData?.latitude || patient?.latitude || profile?.latitude;
    const longitude = gpsData?.longitude || patient?.longitude || profile?.longitude;

    const requestGPS = () => {
        if (!navigator.geolocation) {
            setGpsError('GPS not supported on this device');
            return;
        }

        setGpsEnabled(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                // In a real app, you'd reverse geocode these coordinates to get division/district/upazila
                // For now, we'll store the coordinates and let the backend handle geocoding if needed
                setGpsData({
                    latitude: lat,
                    longitude: lng,
                    addressOrVillage: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
                });
                // Notify parent component about location data update
                if (onLocationDataChange) {
                    onLocationDataChange({ latitude: lat, longitude: lng });
                }
            },
            (error) => {
                setGpsEnabled(false);
                setGpsError(`GPS Error: ${error.message}`);
            },
            { timeout: 10000 }
        );
    };

    const disableGPS = () => {
        setGpsEnabled(false);
        setGpsData(null);
        setGpsError(null);
    };

    const formatDate = (date) => {
        if (!date) return null;
        try {
            return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return null;
        }
    };

    return (
        <div className="dash-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                👤 Patient Profile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Age:</strong> {age}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                </div>
                <div>
                    <p><strong>Trimester:</strong> <span style={{ textTransform: 'capitalize' }}>{trimester}</span></p>
                    <p><strong>Gestational Wk:</strong> {gestationalWeek}</p>
                    {decision && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <RiskBadge riskLevel={decision.riskLevel} />
                            <CasePriorityBadge priority={decision.priority} />
                        </div>
                    )}
                </div>
            </div>

            {/* Location Information Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.95rem', margin: 0 }}>📍 Location Information</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {!gpsEnabled ? (
                            <button
                                onClick={requestGPS}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    background: '#0ea5a8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                📡 Enable GPS
                            </button>
                        ) : (
                            <button
                                onClick={disableGPS}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '0.8rem',
                                    background: '#dc2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕ Disable GPS
                            </button>
                        )}
                    </div>
                </div>

                {gpsError && (
                    <div style={{ padding: '8px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                        ⚠️ {gpsError}
                    </div>
                )}

                {gpsEnabled && gpsData && (
                    <div style={{ padding: '8px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
                        ✓ GPS active: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>Division:</strong></p>
                        <p style={{ color: division === 'N/A' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{division}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>District:</strong></p>
                        <p style={{ color: district === 'N/A' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{district}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>Upazila/Thana:</strong></p>
                        <p style={{ color: upazila === 'N/A' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{upazila}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}><strong>Address/Village:</strong></p>
                        <p style={{ color: address === 'N/A' ? 'var(--text-muted)' : 'var(--text-primary)', wordBreak: 'break-word' }}>{address}</p>
                    </div>
                </div>
                {(latitude || longitude) && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📌 GPS: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                    </div>
                )}
            </div>


            {/* Next Checkup Date Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Next Checkup Date:</strong>
                </p>
                {nextCheckupDate ? (
                    <div style={{ color: 'var(--accent-primary)', fontWeight: '600', fontSize: '1rem' }}>
                        {formatDate(nextCheckupDate)}
                        {followUpDateSetBy && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 'normal' }}>
                                Set by: {followUpDateSetBy?.name || 'Health Worker'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ⏳ Pending (awaiting health worker assignment)
                    </div>
                )}
            </div>
        </div>
    );
}
