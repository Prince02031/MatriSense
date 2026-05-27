'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function PatientReferralsPage() {
    const { user, authFetch } = useAuth();
    const router = useRouter();

    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Fetch referrals from health worker
    const fetchReferrals = async () => {
        try {
            const res = await authFetch(`${API_BASE}/api/patient/referrals`, {
                method: 'GET',
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setReferrals(data.referrals || []);
                setNotificationCount(data.notificationCount || 0);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Failed to fetch referrals:', err);
        } finally {
            setLoading(false);
        }
    };

    // Set up auto-refresh every 10 seconds
    useEffect(() => {
        fetchReferrals();

        const interval = setInterval(() => {
            fetchReferrals();
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (referralId) => {
        try {
            const res = await authFetch(`${API_BASE}/api/patient/referrals/${referralId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (res.ok) {
                setReferrals(prev =>
                    prev.map(r => r._id === referralId ? { ...r, readAt: new Date() } : r)
                );
            }
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const acknowledgeReferral = async (referralId) => {
        try {
            const res = await authFetch(`${API_BASE}/api/patient/referrals/${referralId}/acknowledge`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (res.ok) {
                setReferrals(prev =>
                    prev.map(r => r._id === referralId ? { ...r, acknowledgedAt: new Date() } : r)
                );
                alert('Referral acknowledged! Please visit the assigned hospital.');
            }
        } catch (err) {
            console.error('Failed to acknowledge referral:', err);
            alert('Failed to acknowledge referral');
        }
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRoles={['patient']}>
                <div style={{ padding: '48px', textAlign: 'center' }}>Loading referrals...</div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['patient']}>
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 8px 0' }}>🏥 Health Worker Referrals</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Referrals from your assigned health worker</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="btn btn-secondary"
                    >
                        ← Back
                    </button>
                </div>

                {notificationCount > 0 && (
                    <div style={{
                        background: '#dbeafe',
                        border: '1px solid #93c5fd',
                        color: '#1e40af',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontWeight: '500'
                    }}>
                        🔔 You have {notificationCount} new referral{notificationCount !== 1 ? 's' : ''}
                    </div>
                )}

                {referrals.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        background: 'var(--surface-hover)',
                        borderRadius: '12px',
                        color: 'var(--text-muted)'
                    }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No referrals yet</p>
                        <p style={{ fontSize: '0.9rem' }}>Your referrals will appear here once your health worker sends them</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {referrals.map((referral) => (
                            <div
                                key={referral._id}
                                style={{
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-sm)',
                                    borderLeft: !referral.readAt ? '4px solid #0ea5a8' : '4px solid var(--border)'
                                }}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                                    <div>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                                                🏥 {referral.hospitalName || 'Hospital Assignment'}
                                            </h3>
                                            {!referral.acknowledgedAt && (
                                                <span style={{
                                                    background: '#fca5a5',
                                                    color: '#7f1d1d',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    PENDING
                                                </span>
                                            )}
                                            {referral.acknowledgedAt && (
                                                <span style={{
                                                    background: '#bbf7d0',
                                                    color: '#166534',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    ACKNOWLEDGED
                                                </span>
                                            )}
                                        </div>

                                        {/* Hospital Details */}
                                        <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                            <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                <strong>Type:</strong> {referral.hospitalType?.replace(/_/g, ' ') || 'N/A'}
                                            </p>
                                            <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                <strong>Address:</strong> {referral.hospitalAddress || 'N/A'}
                                            </p>
                                            {referral.hospitalPhone && (
                                                <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                    <strong>Phone:</strong> <a href={`tel:${referral.hospitalPhone}`} style={{ color: '#0ea5a8', textDecoration: 'none' }}>{referral.hospitalPhone}</a>
                                                </p>
                                            )}
                                            {referral.hospitalServices && referral.hospitalServices.length > 0 && (
                                                <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                    <strong>Services:</strong> {referral.hospitalServices.join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Referral Reason */}
                                        {referral.reason && (
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>Reason for Referral:</p>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>{referral.reason}</p>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Sent: {new Date(referral.deliveredAt).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {!referral.readAt && (
                                            <button
                                                onClick={() => markAsRead(referral._id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: '#e0f2fe',
                                                    border: '1px solid #bae6fd',
                                                    color: '#0c4a6e',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                ✓ Mark as Read
                                            </button>
                                        )}
                                        {!referral.acknowledgedAt && (
                                            <button
                                                onClick={() => acknowledgeReferral(referral._id)}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: '#0ea5a8',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                ✓ Acknowledge
                                            </button>
                                        )}
                                        {referral.hospitalPhone && (
                                            <a
                                                href={`tel:${referral.hospitalPhone}`}
                                                style={{
                                                    padding: '8px 12px',
                                                    background: '#d1fae5',
                                                    border: '1px solid #a7f3d0',
                                                    color: '#065f46',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    textAlign: 'center',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                📞 Call Hospital
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Auto-refresh indicator */}
                <div style={{
                    marginTop: '24px',
                    padding: '12px',
                    background: 'var(--surface-hover)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                }}>
                    🔄 Auto-refreshing every 10 seconds
                </div>
            </div>
        </ProtectedRoute>
    );
}
