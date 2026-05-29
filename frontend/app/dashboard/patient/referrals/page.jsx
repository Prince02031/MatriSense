'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import ProtectedRoute from '../../../components/ProtectedRoute';

const translateHospitalType = (type, lang) => {
    if (!type) return lang === 'bn' ? 'প্রযোজ্য নয়' : 'N/A';
    if (lang !== 'bn') return type.replace(/_/g, ' ');
    
    const types = {
        'COMMUNITY_CLINIC': 'কমিউনিটি ক্লিনিক',
        'UPAZILA_HEALTH_COMPLEX': 'উপজেলা স্বাস্থ্য কমপ্লেক্স',
        'DISTRICT_HOSPITAL': 'জেলা হাসপাতাল',
        'GENERAL_HOSPITAL': 'জেনারেল হাসপাতাল',
        'MEDICAL_COLLEGE_HOSPITAL': 'মেডিকেল কলেজ হাসপাতাল',
        'MATERNAL_AND_CHILD_HEALTH_TRAINING_INSTITUTE': 'মা ও শিশু স্বাস্থ্য প্রশিক্ষণ ইনস্টিটিউট',
        'PRIVATE_CLINIC': 'বেসরকারি ক্লিনিক/হাসপাতাল',
        'PRIVATE_HOSPITAL': 'বেসরকারি হাসপাতাল'
    };
    return types[type] || type.replace(/_/g, ' ');
};

export default function PatientReferralsPage() {
    const { user, authFetch } = useAuth();
    const { t, language } = useLanguage();
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
                alert(t.referralAcknowledgedAlert || 'Referral acknowledged! Please visit the assigned hospital.');
            }
        } catch (err) {
            console.error('Failed to acknowledge referral:', err);
            alert(t.referralAcknowledgeFailedAlert || 'Failed to acknowledge referral');
        }
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRoles={['patient']}>
                <div style={{ padding: '48px', textAlign: 'center' }}>{t.loadingReferrals}</div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRoles={['patient']}>
            <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 8px 0' }}>🏥 {t.healthWorkerReferrals}</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t.referralsFromWorker}</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="btn btn-secondary"
                    >
                        {t.back}
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
                        {language === 'bn'
                            ? `🔔 আপনার ${notificationCount}টি নতুন রেফারেল রয়েছে`
                            : `🔔 You have ${notificationCount} new referral${notificationCount !== 1 ? 's' : ''}`
                        }
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
                        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{t.noReferralsYet}</p>
                        <p style={{ fontSize: '0.9rem' }}>{t.noReferralsYetHelp}</p>
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
                                                🏥 {referral.hospitalName || t.hospitalAssignment}
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
                                                    {t.pending}
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
                                                    {t.acknowledged}
                                                </span>
                                            )}
                                        </div>

                                        {/* Hospital Details */}
                                        <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                            <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                <strong>{t.type}:</strong> {translateHospitalType(referral.hospitalType, language)}
                                            </p>
                                            <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                <strong>{t.address}:</strong> {referral.hospitalAddress || (language === 'bn' ? 'প্রযোজ্য নয়' : 'N/A')}
                                            </p>
                                            {referral.hospitalPhone && (
                                                <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                    <strong>{t.phone}:</strong> <a href={`tel:${referral.hospitalPhone}`} style={{ color: '#0ea5a8', textDecoration: 'none' }}>{referral.hospitalPhone}</a>
                                                </p>
                                            )}
                                            {referral.hospitalServices && referral.hospitalServices.length > 0 && (
                                                <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                                                    <strong>{t.services}:</strong> {referral.hospitalServices.join(', ')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Referral Reason */}
                                        {referral.reason && (
                                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>{t.reasonForReferral}</p>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>{referral.reason}</p>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {t.sent} {new Date(referral.deliveredAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
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
                                                {t.markAsRead}
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
                                                {t.acknowledge}
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
                                                {t.callHospital}
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
                    {t.autoRefreshing}
                </div>
            </div>
        </ProtectedRoute>
    );
}
