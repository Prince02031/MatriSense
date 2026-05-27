'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerCase, updateWorkerCaseStatus, getAuditLog, setFollowUpDate, assignHospitalToCase } from '../../../api/workerApi';
import { getNearbyHospitals } from '../../../api/hospitalApi';
import { createReferralNote, getReferralNote } from '../../../api/referralApi';
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';

import PatientProfilePanel from '../../../components/dashboard/casedetail/PatientProfilePanel';
import PatientDocumentsPanel from '../../../components/dashboard/casedetail/PatientDocumentsPanel';
import FollowUpAnswersPanel from '../../../components/dashboard/casedetail/FollowUpAnswersPanel';
import HealthWorkerSummaryCard from '../../../components/dashboard/casedetail/HealthWorkerSummaryCard';
import MatchedRulesPanel from '../../../components/dashboard/casedetail/MatchedRulesPanel';
import EvidencePanel from '../../../components/dashboard/casedetail/EvidencePanel';
import ReferralNoteList from '../../../components/dashboard/casedetail/ReferralNoteList';
import AuditTimeline from '../../../components/dashboard/casedetail/AuditTimeline';
import CaseStatusBadge from '../../../components/dashboard/CaseStatusBadge';
import LeafletMap from '../../../components/dashboard/casedetail/LeafletMap';

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
    const [noteFollowUpDate, setNoteFollowUpDate] = useState('');  // follow-up date for the note
    const [nextCheckupDate, setNextCheckupDate] = useState('');

    // Status states
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

    // Hospital referral states
    const [hospitals, setHospitals] = useState([]);
    const [hospitalsLoading, setHospitalsLoading] = useState(false);
    const [assigningHospitalId, setAssigningHospitalId] = useState(null);
    const [assignReason, setAssignReason] = useState('');

    const loadNearbyHospitals = async (snapshot) => {
        if (!snapshot) return;
        try {
            setHospitalsLoading(true);
            const data = await getNearbyHospitals({
                latitude: snapshot.latitude,
                longitude: snapshot.longitude,
                district: snapshot.district
            });
            if (data.success) {
                setHospitals(data.hospitals);
            }
        } catch (err) {
            console.error("Failed to load nearby hospitals:", err);
        } finally {
            setHospitalsLoading(false);
        }
    };

    const handleAssignHospital = async (hospitalId) => {
        if (!assignReason.trim()) {
            alert('Please enter a reason for this hospital assignment.');
            return;
        }
        try {
            setAssigningHospitalId(hospitalId);
            const data = await assignHospitalToCase(sessionId, hospitalId, assignReason);
            if (data.success) {
                alert('Hospital assigned successfully!');
                setAssignReason('');
                await fetchDetail();
            }
        } catch (err) {
            console.error("Failed to assign hospital:", err);
            alert(err.message || 'Failed to assign hospital');
        } finally {
            setAssigningHospitalId(null);
        }
    };

    const handleHospitalSelect = (hospital) => {
        // Auto-fill hospital name in reason field for easy identification
        const suggestedReason = `Referral to ${hospital.name} (${hospital.type?.replace(/_/g, ' ')})`;
        setAssignReason(suggestedReason);
        // Scroll to hospital list so user can confirm
        setTimeout(() => {
            document.getElementById('hospital-selection').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const fetchDetail = async () => {
        try {
            const data = await getWorkerCase(sessionId);
            if (data.success) {
                setCaseDetail(data.session);
                setStatus(data.session.status || 'NEW');
                if (data.session.nextCheckupDate) {
                    setNextCheckupDate(new Date(data.session.nextCheckupDate).toISOString().split('T')[0]);
                }
                // Load nearby hospitals using triage location snapshot
                if (data.session.profileSnapshot) {
                    await loadNearbyHospitals(data.session.profileSnapshot);
                }
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
            alert('Failed to load case');
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
            const data = await updateWorkerCaseStatus(sessionId, status, user?._id || user?.id);
            if (data.success) {
                setCaseDetail(data.session);
                alert('Status updated successfully');
            }
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
                actionTaken,
                referredTo: referredTo || undefined,
                followUpDate: noteFollowUpDate || undefined,
                note: noteText,
                statusAfterNote: status
            });

            if (data.success) {
                setNotes([data.note, ...notes]);
                setNoteText('');
                setReferredTo('');
                setNoteFollowUpDate('');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add note');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleSetFollowUpDate = async (e) => {
        e.preventDefault();
        if (!nextCheckupDate) {
            alert('Please select a date');
            return;
        }
        setIsSubmittingFollowUp(true);
        try {
            const data = await setFollowUpDate(sessionId, nextCheckupDate, user?._id || user?.id);
            if (data.success) {
                setCaseDetail(data.session);
                alert('Follow-up date set successfully');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to set follow-up date');
        } finally {
            setIsSubmittingFollowUp(false);
        }
    };

    if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>Loading case details...</div>;
    if (!caseDetail) return <div style={{ padding: '48px', textAlign: 'center' }}>Case not found.</div>;

    return (
        <ProtectedRoute allowedRoles={['worker']}>
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
                            nextCheckupDate={caseDetail.nextCheckupDate}
                            followUpDateSetBy={caseDetail.followUpDateSetBy}
                            onLocationDataChange={(locationData) => {
                                // Handle GPS location data if needed for other features
                                console.log('Location data updated:', locationData);
                            }}
                        />

                        <PatientDocumentsPanel sessionId={sessionId} />

                        <HealthWorkerSummaryCard
                            safeOutput={caseDetail.safeOutput}
                            profileSnapshot={caseDetail.profileSnapshot}
                        />

                        <FollowUpAnswersPanel
                            inputTextBn={caseDetail.inputTextBn}
                            caseState={caseDetail.caseState}
                        />

                        {/* Referral & Hospital Assignment Panel */}
                        <div className="dash-card">
                            <h3>🏥 Regional Referral & Hospital Assignment</h3>
                            
                            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Patient Location Snapshot</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        <strong>Division:</strong> {caseDetail.profileSnapshot?.division || 'N/A'}<br />
                                        <strong>District:</strong> {caseDetail.profileSnapshot?.district || 'N/A'}<br />
                                        <strong>Upazila/Thana:</strong> {caseDetail.profileSnapshot?.upazilaOrThana || 'N/A'}<br />
                                        <strong>Address:</strong> {caseDetail.profileSnapshot?.addressOrVillage || 'N/A'}
                                    </p>
                                    {caseDetail.profileSnapshot?.latitude && (
                                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                                            📍 GPS Coordinates: {caseDetail.profileSnapshot.latitude.toFixed(5)}, {caseDetail.profileSnapshot.longitude.toFixed(5)} ({caseDetail.profileSnapshot.locationSource})
                                        </small>
                                    )}
                                </div>

                                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Current Assignment Status</h4>
                                    {caseDetail.assignedHospitalSnapshot ? (
                                        <div style={{ background: 'rgba(var(--accent-primary-rgb), 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                                            <strong style={{ color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{caseDetail.assignedHospitalSnapshot.name}</strong>
                                            <div style={{ fontSize: '0.85rem', marginTop: '4px', lineHeight: '1.4' }}>
                                                <strong>Type:</strong> {caseDetail.assignedHospitalSnapshot.type?.replace(/_/g, ' ')} <br />
                                                <strong>Phone:</strong> {caseDetail.assignedHospitalSnapshot.phone || 'N/A'} <br />
                                                <strong>Services:</strong> {caseDetail.assignedHospitalSnapshot.services?.join(', ') || 'N/A'}
                                            </div>
                                            <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)' }}>
                                                Assigned At: {new Date(caseDetail.assignedAt).toLocaleString()}
                                            </small>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '12px', background: 'var(--surface-disabled)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No hospital assigned yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Leaflet Map Integration */}
                            {caseDetail.profileSnapshot?.latitude && caseDetail.profileSnapshot?.longitude && (
                                <div style={{ marginTop: '20px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>🗺️ Nearby Referrals Map (click hospital marker to select)</h4>
                                    <LeafletMap 
                                        patientLat={caseDetail.profileSnapshot.latitude}
                                        patientLng={caseDetail.profileSnapshot.longitude}
                                        patientName={caseDetail.profileSnapshot.name}
                                        hospitals={hospitals}
                                        onHospitalSelect={handleHospitalSelect}
                                    />
                                </div>
                            )}

                            {/* Nearby / Recommended Hospitals */}
                            <div style={{ marginTop: '24px' }} id="hospital-selection">
                                <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>🏥 Select Referral Hospital</h4>
                                
                                {/* Assignment Reason */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                                        Assignment / Referral Reason (Required to assign/reassign):
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter reason for referral/assignment, e.g., Patient has high risk, needs NICU..."
                                        value={assignReason}
                                        onChange={(e) => setAssignReason(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {hospitalsLoading ? (
                                    <p>Loading nearby hospitals...</p>
                                ) : hospitals.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hospitals found for this region.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {hospitals.map(h => (
                                            <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div style={{ flex: 1, marginRight: '16px' }}>
                                                    <strong>{h.name}</strong> <small style={{ color: 'var(--text-muted)' }}>({h.type?.replace(/_/g, ' ')})</small>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        📍 {h.address} {h.distance !== null && h.distance !== undefined ? `(${h.distance} km away)` : ''}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', marginTop: '4px' }}>
                                                        Services: {h.services?.join(', ') || 'N/A'}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignHospital(h._id)}
                                                    disabled={assigningHospitalId !== null || caseDetail.assignedHospitalId === h._id}
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                >
                                                    {assigningHospitalId === h._id ? 'Assigning...' : caseDetail.assignedHospitalId === h._id ? 'Assigned' : 'Refer & Assign'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assignment History */}
                            {caseDetail.hospitalAssignmentHistory && caseDetail.hospitalAssignmentHistory.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                                    <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>📜 Hospital Assignment History</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {caseDetail.hospitalAssignmentHistory.map((hist, idx) => (
                                            <div key={idx} style={{ fontSize: '0.85rem', padding: '8px', background: 'var(--surface-hover)', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <strong style={{ color: 'var(--accent-primary)' }}>{hist.action}: {hist.hospitalName}</strong>
                                                    <span style={{ color: 'var(--text-muted)' }}>{new Date(hist.assignedAt).toLocaleString()}</span>
                                                </div>
                                                <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                                                    Reason: {hist.reason}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

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

                            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Set Next Checkup Date</h4>
                            <form onSubmit={handleSetFollowUpDate} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="date"
                                    value={nextCheckupDate}
                                    onChange={e => setNextCheckupDate(e.target.value)}
                                    className="form-input"
                                />
                                <button type="submit" className="btn btn-primary" disabled={isSubmittingFollowUp}>
                                    {isSubmittingFollowUp ? 'Setting...' : 'Set Checkup Date'}
                                </button>
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
                                        value={noteFollowUpDate}
                                        onChange={e => setNoteFollowUpDate(e.target.value)}
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
        </ProtectedRoute>
    );
}
