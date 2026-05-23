'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerCase, updateWorkerCaseStatus, getAuditLog } from '../../../api/workerApi';
import { createReferralNote, getReferralNote } from '../../../api/referralApi';
import { useAuth } from '../../../context/AuthContext';

import PatientProfilePanel from '../../../components/dashboard/casedetail/PatientProfilePanel';
import FollowUpAnswersPanel from '../../../components/dashboard/casedetail/FollowUpAnswersPanel';
import HealthWorkerSummaryCard from '../../../components/dashboard/casedetail/HealthWorkerSummaryCard';
import MatchedRulesPanel from '../../../components/dashboard/casedetail/MatchedRulesPanel';
import EvidencePanel from '../../../components/dashboard/casedetail/EvidencePanel';
import ReferralNoteList from '../../../components/dashboard/casedetail/ReferralNoteList';
import AuditTimeline from '../../../components/dashboard/casedetail/AuditTimeline';
import CaseStatusBadge from '../../../components/dashboard/CaseStatusBadge';

export default function WorkerCaseDetailPage({ params }) {
    const { sessionId } = use(params);
    const { user } = useAuth();
    const router = useRouter();

    const [caseDetail, setCaseDetail] = useState(null);
    const [notes, setNotes] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');

    // Note form
    const [noteText, setNoteText] = useState('');
    const [actionTaken, setActionTaken] = useState('CONTACTED');
    const [referredTo, setReferredTo] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');

    // Status states
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    const fetchDetail = async () => {
        try {
            const data = await getWorkerCase(sessionId);
            if (data.success) {
                setCaseDetail(data.session);
                setStatus(data.session.status || 'NEW');
            }
            const noteData = await getReferralNote(sessionId);
            if (noteData.success) {
                setNotes(noteData.notes);
            }
            const auditData = await getAuditLog(sessionId);
            if (auditData.success) {
                setAuditLogs(auditData.logs);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [sessionId]);

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        setIsSubmittingStatus(true);
        try {
            await updateWorkerCaseStatus(sessionId, status);
            await fetchDetail(); // refresh data
            alert('Status updated successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        } finally {
            setIsSubmittingStatus(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        setIsSubmittingNote(true);
        try {
            const data = await createReferralNote({
                triageSessionId: sessionId,
                patientId: caseDetail.patientId?._id || 'unknown',
                actionTaken,
                referredTo,
                followUpDate: followUpDate || undefined,
                note: noteText,
                statusAfterNote: status
            });
            if (data.success) {
                await fetchDetail(); // refresh case and timeline
                setNoteText('');
                setReferredTo('');
                setFollowUpDate('');
                alert('Note added successfully');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add note');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading case details...</div>;
    if (!caseDetail) return <div style={{ padding: '48px', textAlign: 'center' }}>Case not found.</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={() => router.back()} className="btn btn-secondary">← Back to Dashboard</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: '600' }}>Current Status:</span>
                    <CaseStatusBadge status={status} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                {/* Left Column - Main Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <PatientProfilePanel
                        patient={caseDetail.patientId}
                        decision={caseDetail.decision}
                        caseState={caseDetail.caseState}
                    />

                    <HealthWorkerSummaryCard
                        safeOutput={caseDetail.safeOutput}
                    />

                    <FollowUpAnswersPanel
                        inputTextBn={caseDetail.inputTextBn}
                        caseState={caseDetail.caseState}
                    />

                    <div className="dash-card">
                        <h3>🗒️ Activity & Notes History</h3>
                        <div style={{ marginTop: '16px' }}>
                            <ReferralNoteList notes={notes} />
                        </div>
                    </div>
                </div>

                {/* Right Column - Audit & Action Tools */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div className="dash-card">
                        <h3>🛠️ Case Management</h3>
                        <form onSubmit={handleUpdateStatus} style={{ marginTop: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Update Status: </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input" style={{ flex: 1 }}>
                                    <option value="NEW">New</option>
                                    <option value="VIEWED">Viewed</option>
                                    <option value="CONTACTED">Contacted Patient</option>
                                    <option value="REFERRED">Referred to Clinic</option>
                                    <option value="FOLLOW_UP_NEEDED">Follow-up Needed</option>
                                    <option value="RESOLVED">Resolved</option>
                                </select>
                                <button type="submit" className="btn btn-primary" disabled={isSubmittingStatus}>
                                    {isSubmittingStatus ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>

                        <hr style={{ margin: '16px 0', borderColor: 'var(--border-subtle)' }} />

                        <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Add Referral / Follow-up Note</h4>
                        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <select value={actionTaken} onChange={e => setActionTaken(e.target.value)} className="form-input">
                                <option value="CONTACTED">Contacted Patient</option>
                                <option value="URGENT_REFERRAL">Urgent Referral</option>
                                <option value="MONITOR">Monitor Only</option>
                            </select>

                            {actionTaken === 'URGENT_REFERRAL' && (
                                <input
                                    type="text"
                                    placeholder="Referred To (Clinic/Hospital)"
                                    value={referredTo}
                                    onChange={e => setReferredTo(e.target.value)}
                                    className="form-input"
                                />
                            )}

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Follow-up Date (Optional)</label>
                                <input
                                    type="date"
                                    value={followUpDate}
                                    onChange={e => setFollowUpDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <textarea
                                placeholder="Enter clinical notes..."
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                className="form-input"
                                rows="3"
                                required
                            />

                            <button type="submit" className="btn btn-outline" style={{ width: '100%', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} disabled={isSubmittingNote}>
                                {isSubmittingNote ? 'Adding Note...' : 'Add Note'}
                            </button>
                        </form>
                    </div>

                    <MatchedRulesPanel decision={caseDetail.decision} />

                    <EvidencePanel
                        evidenceTags={caseDetail.decision?.evidenceTags}
                        careGuidanceContext={caseDetail.careGuidanceContext}
                    />

                    <AuditTimeline session={caseDetail} auditLogs={auditLogs} />

                </div>
            </div>
        </div>
    );
}
