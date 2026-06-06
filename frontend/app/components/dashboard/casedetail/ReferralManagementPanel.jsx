import React, { useState, useEffect } from 'react';
import {
    getReferralPreferences,
    acceptReferralPreference,
    rejectReferralPreference,
    getAssignmentHistory,
    addReferralNote,
    updateReferralStatusFromWorker
} from '../../../api/workerApi';
import styles from './ReferralManagementPanel.module.css';

export default function ReferralManagementPanel({ sessionId, currentAssignedHospital, riskLevel }) {
    const [preferences, setPreferences] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form states
    const [noteText, setNoteText] = useState('');
    const [statusToUpdate, setStatusToUpdate] = useState('');

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [prefRes, histRes] = await Promise.all([
                getReferralPreferences(sessionId),
                getAssignmentHistory(sessionId)
            ]);
            if (prefRes.success) setPreferences(prefRes.preferences || []);
            if (histRes.success) setHistory(histRes.history || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionId) fetchAllData();
    }, [sessionId]);

    const handleAcceptPreference = async (preferenceId) => {
        try {
            await acceptReferralPreference(preferenceId);
            fetchAllData();
        } catch (err) {
            alert("Error accepting preference: " + err.message);
        }
    };

    const handleRejectPreference = async (preferenceId) => {
        const note = prompt("Reason for rejecting preference:");
        if (note === null) return;
        try {
            await rejectReferralPreference(preferenceId, note);
            fetchAllData();
        } catch (err) {
            alert("Error rejecting preference: " + err.message);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        try {
            await addReferralNote(sessionId, noteText, 'ADDED_NOTE', statusToUpdate || undefined);
            setNoteText('');
            setStatusToUpdate('');
            fetchAllData();
        } catch (err) {
            alert("Error adding note: " + err.message);
        }
    };

    if (loading) return <div className="dash-card">Loading referral data...</div>;
    if (error) return <div className="dash-card error">Error: {error}</div>;

    const pendingPreference = preferences.find(p => p.status === 'PENDING_WORKER_REVIEW');
    const pastPreferences = preferences.filter(p => p.status !== 'PENDING_WORKER_REVIEW');

    return (
        <div className="dash-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>🏥 Referral & Assignment Management</h3>

            {/* Current Assignment Status */}
            <div style={{ marginBottom: '20px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#64748b' }}>Current Assignment</h4>
                {currentAssignedHospital ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🏨</span>
                        <strong>{currentAssignedHospital.name}</strong>
                    </div>
                ) : (
                    <span style={{ color: '#ef4444', fontWeight: '500' }}>Not Assigned</span>
                )}
            </div>

            {/* Pending Patient Preference */}
            {pendingPreference && (
                <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', color: '#b45309' }}>⚠️ Pending Patient Preference</h4>
                            <p style={{ margin: '0 0 4px 0' }}><strong>Hospital:</strong> {pendingPreference.hospitalId?.name}</p>
                            <p style={{ margin: '0 0 8px 0' }}><strong>Reason:</strong> {pendingPreference.reason}</p>
                        </div>
                        <span style={{ background: '#f59e0b', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>PENDING</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={() => handleAcceptPreference(pendingPreference._id)}
                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                            Accept Preference
                        </button>
                        <button
                            onClick={() => handleRejectPreference(pendingPreference._id)}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Past Preferences Summary */}
            {pastPreferences.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '8px' }}>Previous Preferences</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {pastPreferences.map(pref => (
                            <li key={pref._id} style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                <span>{pref.hospitalId?.name}</span> -
                                <span style={{
                                    marginLeft: '8px',
                                    fontWeight: 'bold',
                                    color: pref.status === 'ACCEPTED' ? '#10b981' : pref.status === 'REJECTED' ? '#ef4444' : '#64748b'
                                }}>
                                    {pref.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Assignment History / Timeline */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '8px' }}>Assignment & Referral Timeline</h4>
                {history.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No history yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.map((item, idx) => (
                            <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '6px', borderLeft: '4px solid #3b82f6', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong>{item.action}</strong>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                {item.hospitalId && <div><strong>Hospital:</strong> {item.hospitalId.name}</div>}
                                {item.note && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#475569' }}>"{item.note}"</div>}
                                {item.role && <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>By: {item.role}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Note / Action form */}
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#475569' }}>Add Referral Note / Update Status</h4>
                <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Add note or reason..."
                        rows="3"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        required
                    />
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select
                            value={statusToUpdate}
                            onChange={e => setStatusToUpdate(e.target.value)}
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                        >
                            <option value="">(No status change)</option>
                            <option value="HOSPITAL_ASSIGNED">Assigned</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="ADMITTED">Admitted</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                        <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                            Add Note
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
