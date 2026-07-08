'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkerCase, getAuditLog, setFollowUpDate, assignHospitalToCase, getReferralPreferences, acceptReferralPreference, rejectReferralPreference, addReferralNote, updateReferralStatusFromWorker, getAssignmentHistory, getReferralNotesForSession, requestPatientGPS, deliverReferralToPatient } from '../../../api/workerApi';
import { getNearbyHospitals } from '../../../api/hospitalApi';
// Old imports from referralApi replaced with workerApi imports
import { useAuth } from '../../../context/AuthContext';
import ProtectedRoute from '../../../components/ProtectedRoute';

import PatientProfilePanel from '../../../components/dashboard/casedetail/PatientProfilePanel';
import PatientDocumentsPanel from '../../../components/dashboard/casedetail/PatientDocumentsPanel';
import CaseClinicalDataPanel from '../../../components/dashboard/casedetail/CaseClinicalDataPanel';
import FollowUpAnswersPanel from '../../../components/dashboard/casedetail/FollowUpAnswersPanel';
import HealthWorkerSummaryCard from '../../../components/dashboard/casedetail/HealthWorkerSummaryCard';
import MatchedRulesPanel from '../../../components/dashboard/casedetail/MatchedRulesPanel';
import EvidencePanel from '../../../components/dashboard/casedetail/EvidencePanel';
import ReferralNoteList from '../../../components/dashboard/casedetail/ReferralNoteList';
import AuditTimeline from '../../../components/dashboard/casedetail/AuditTimeline';
import CaseStatusBadge from '../../../components/dashboard/CaseStatusBadge';
import LeafletMap from '../../../components/dashboard/casedetail/LeafletMap';

// Ordered to preserve the original single-page review flow:
// patient profile → documents → health-worker summary → symptoms & follow-up
// → regional referral & hospital assignment. Clinical Data sits with the
// documents it's derived from; Notes & Audit closes the review.
const CASE_TABS = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'documents', icon: '📄', label: 'Documents' },
    { id: 'clinical', icon: '🩺', label: 'Clinical Data' },
    { id: 'recommendations', icon: '💡', label: 'Recommendations' },
    { id: 'triage', icon: '📋', label: 'Triage Review' },
    { id: 'referral', icon: '🏥', label: 'Referral & Hospital' },
    { id: 'notes', icon: '🗒️', label: 'Notes & Audit' },
];

export default function WorkerCaseDetailPage({ params }) {
    const { sessionId } = use(params);
    const { user } = useAuth();
    const router = useRouter();

    const [caseDetail, setCaseDetail] = useState(null);
    const [notes, setNotes] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [showCaseManagement, setShowCaseManagement] = useState(false);

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
    const [deliveringReferral, setDeliveringReferral] = useState(false);
    const [hospitalSearchTerm, setHospitalSearchTerm] = useState('');

    // Preference states
    const [preferences, setPreferences] = useState([]);
    const [preferencesLoading, setPreferencesLoading] = useState(false);
    const [handlingPreferenceId, setHandlingPreferenceId] = useState(null);

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

    const handleRequestGPS = async () => {
        try {
            const data = await requestPatientGPS(sessionId);
            if (data.success) {
                alert('✓ GPS request sent to patient. They will be prompted to share location on their dashboard.');
            } else {
                alert('Failed to send GPS request: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Failed to request GPS:', err);
            alert('Failed to send GPS request: ' + err.message);
        }
    };

    const handleDeliverReferralToPatient = async () => {
        if (!caseDetail.assignedHospitalId) {
            alert('Please assign a hospital first before delivering the referral.');
            return;
        }

        if (!window.confirm('Are you sure you want to send this referral to the patient? They will receive a notification.')) {
            return;
        }

        try {
            setDeliveringReferral(true);
            const result = await deliverReferralToPatient(
                sessionId,
                caseDetail.assignedHospitalId,
                caseDetail.hospitalAssignmentHistory?.[0]?.reason || 'Hospital referral'
            );

            alert('✓ Referral delivered to patient! They will receive a notification.');
            await fetchDetail();
        } catch (err) {
            console.error('Failed to deliver referral:', err);
            alert('Failed to deliver referral to patient: ' + err.message);
        } finally {
            setDeliveringReferral(false);
        }
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
            // Fetch preferences using new workerApi
            setPreferencesLoading(true);
            const prefData = await getReferralPreferences(sessionId);
            if (prefData.success) {
                setPreferences(prefData.preferences);
            }

            // Notes via MCP route
            const noteData = await getReferralNotesForSession(sessionId);
            if (noteData.success) {
                setNotes(noteData.notes);
            }

            const auditData = await getAuditLog(sessionId);

            // History via MCP route
            const histData = await getAssignmentHistory(sessionId);
            if (histData.success) {
                const mappedHistoryLogs = (histData.history || []).map((h, i) => ({
                    _id: `hist_${i}_${h.assignedAt}`,
                    action: h.action || 'HOSPITAL ASSIGNMENT',
                    actorRole: h.assignedBy || 'MCP_SYSTEM',
                    createdAt: h.assignedAt || new Date().toISOString(),
                    details: {
                        hospitalName: h.hospitalName,
                        reason: h.reason
                    }
                }));

                const allLogs = [...(auditData?.logs || []), ...mappedHistoryLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setAuditLogs(allLogs);

                // If the backend history array is attached to session, update it
                setCaseDetail(prev => ({ ...prev, hospitalAssignmentHistory: histData.history }));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load case');
        } finally {
            setLoading(false);
            setPreferencesLoading(false);
        }
    };

    const handleAcceptPreference = async (prefId) => {
        const note = window.prompt("Enter an optional note for accepting this preference:");
        if (note === null) return; // User cancelled prompt

        try {
            setHandlingPreferenceId(prefId);
            const data = await acceptReferralPreference(prefId);
            if (data.success) {
                alert('✓ Hospital preference accepted and assigned!');
                await fetchDetail();
            }
        } catch (err) {
            console.error('Failed to accept preference:', err);
            alert(err.message || 'Failed to accept preference');
        } finally {
            setHandlingPreferenceId(null);
        }
    };

    const handleRejectPreference = async (prefId) => {
        const note = window.prompt("Please enter a reason for rejecting this preference (Required):");
        if (note === null) return; // User cancelled prompt
        if (!note.trim()) {
            alert('A rejection reason is required.');
            return;
        }

        try {
            setHandlingPreferenceId(prefId);
            const data = await rejectReferralPreference(prefId, note);
            if (data.success) {
                alert('✓ Hospital preference rejected.');
                await fetchDetail();
            }
        } catch (err) {
            console.error('Failed to reject preference:', err);
            alert(err.message || 'Failed to reject preference');
        } finally {
            setHandlingPreferenceId(null);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [sessionId]);

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        setIsSubmittingStatus(true);
        try {
            const data = await updateReferralStatusFromWorker(sessionId, status, 'Status updated from dropdown');
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
            const combinedNote = `[${actionTaken}] ${noteText} ${referredTo ? `(Referred: ${referredTo})` : ''} ${noteFollowUpDate ? `(Follow-up: ${noteFollowUpDate})` : ''}`;
            const data = await addReferralNote(sessionId, combinedNote, actionTaken, status);

            if (data.success) {
                setNoteText('');
                setReferredTo('');
                setNoteFollowUpDate('');
                await fetchDetail();
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button onClick={() => router.back()} className="btn btn-secondary">← Back to Dashboard</button>
                </div>

                {/* Case Management summary bar — full detail lives in the modal */}
                <div className="dash-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Status</div>
                            <CaseStatusBadge status={status} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Next Checkup</div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {caseDetail.nextCheckupDate ? new Date(caseDetail.nextCheckupDate).toLocaleDateString() : '— not set'}
                            </div>
                        </div>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCaseManagement(true)}>
                        🛠️ Manage Case
                    </button>
                </div>

                <div className="case-tabs">
                    {CASE_TABS.map((tabItem) => (
                        <button
                            key={tabItem.id}
                            type="button"
                            onClick={() => setActiveTab(tabItem.id)}
                            className={`case-tab ${activeTab === tabItem.id ? 'active' : ''}`}
                        >
                            <span className="case-tab-icon">{tabItem.icon}</span>
                            <span className="case-tab-label">{tabItem.label}</span>
                        </button>
                    ))}
                </div>

                <div>
                    {/* Tabbed Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {activeTab === 'overview' && (
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
                        )}

                        {activeTab === 'documents' && (
                            <PatientDocumentsPanel sessionId={sessionId} />
                        )}

                        {activeTab === 'clinical' && (
                            <CaseClinicalDataPanel sessionId={sessionId} />
                        )}

                        {activeTab === 'recommendations' && (
                            <HealthWorkerSummaryCard
                                safeOutput={caseDetail.safeOutput}
                                profileSnapshot={caseDetail.profileSnapshot}
                            />
                        )}

                        {activeTab === 'triage' && (
                            <>
                                <FollowUpAnswersPanel
                                    inputTextBn={caseDetail.inputTextBn}
                                    caseState={caseDetail.caseState}
                                />
                                <MatchedRulesPanel decision={caseDetail.decision} />
                                <EvidencePanel
                                    evidenceTags={caseDetail.decision?.evidenceTags}
                                    careGuidanceContext={caseDetail.careGuidanceContext}
                                />
                            </>
                        )}

                        {/* Referral & Hospital Assignment Panel */}
                        {activeTab === 'referral' && (
                        <div className="dash-card">
                            <h3>🏥 Regional Referral & Hospital Assignment</h3>

                            <div className="wgrid-2" style={{ marginTop: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Patient Location Snapshot</h4>
                                        {!caseDetail.profileSnapshot?.latitude && (
                                            <button
                                                onClick={handleRequestGPS}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.75rem',
                                                    background: '#0ea5a8',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                📡 Request GPS
                                            </button>
                                        )}
                                    </div>
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

                            {/* Patient Referral Preference Section */}
                            {preferences.length > 0 && (
                                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
                                        <span>⭐ Patient Preferred Hospital Request</span>
                                    </h4>

                                    {preferences.map((pref) => {
                                        const isPending = pref.status === 'PENDING_WORKER_REVIEW';
                                        const matchedHosp = hospitals.find(h => h._id === pref.hospitalId?._id);
                                        const distance = matchedHosp && matchedHosp.distance !== undefined ? `${matchedHosp.distance} km` : null;

                                        return (
                                            <div key={pref._id} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div>
                                                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{pref.hospitalId?.name || 'Unknown Hospital'}</strong>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                                            ({pref.hospitalId?.type?.replace(/_/g, ' ') || 'N/A'})
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        background: isPending ? 'rgba(245, 158, 11, 0.15)' :
                                                            pref.status === 'ACCEPTED' ? 'rgba(22, 163, 74, 0.15)' :
                                                                pref.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' :
                                                                    pref.status === 'REASSIGNED' ? 'rgba(14, 165, 168, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                        color: isPending ? 'var(--accent-amber)' :
                                                            pref.status === 'ACCEPTED' ? 'var(--accent-emerald)' :
                                                                pref.status === 'REJECTED' ? 'var(--accent-rose)' :
                                                                    pref.status === 'REASSIGNED' ? 'var(--accent-primary)' : 'var(--text-muted)'
                                                    }}>
                                                        {pref.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: '0.85rem', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {pref.reason && (
                                                        <div>
                                                            <strong>Requested Reason:</strong> {pref.reason}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                        <div>
                                                            <strong>Submitted:</strong> {new Date(pref.createdAt).toLocaleString()}
                                                        </div>
                                                        {distance && (
                                                            <div>
                                                                <strong>Distance:</strong> {distance} away
                                                            </div>
                                                        )}
                                                    </div>
                                                    {pref.hospitalId?.services && pref.hospitalId.services.length > 0 && (
                                                        <div>
                                                            <strong>Services:</strong> {pref.hospitalId.services.join(', ')}
                                                        </div>
                                                    )}
                                                </div>

                                                {isPending && (
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                                                        <button
                                                            onClick={() => handleAcceptPreference(pref._id)}
                                                            disabled={handlingPreferenceId !== null}
                                                            className="btn btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                        >
                                                            {handlingPreferenceId === pref._id ? 'Processing...' : 'Accept Preference'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectPreference(pref._id)}
                                                            disabled={handlingPreferenceId !== null}
                                                            className="btn btn-danger"
                                                            style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                                        >
                                                            {handlingPreferenceId === pref._id ? 'Processing...' : 'Reject Preference'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setAssignReason(`Reassignment from preference: patient requested ${pref.hospitalId?.name}`);
                                                                document.getElementById('hospital-selection').scrollIntoView({ behavior: 'smooth' });
                                                            }}
                                                            className="btn btn-outline"
                                                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                        >
                                                            Reassign Hospital
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

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
                                {/* Hospital Search Bar */}
                                <div style={{ marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search hospitals by name, type, or services..."
                                        value={hospitalSearchTerm}
                                        onChange={(e) => setHospitalSearchTerm(e.target.value)}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
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
                                ) : (() => {
                                    const term = hospitalSearchTerm.toLowerCase().trim();
                                    const filtered = term
                                        ? hospitals.filter(h =>
                                            (h.name || '').toLowerCase().includes(term) ||
                                            (h.type || '').toLowerCase().replace(/_/g, ' ').includes(term) ||
                                            (h.address || '').toLowerCase().includes(term) ||
                                            (h.services || []).some(s => s.toLowerCase().includes(term))
                                        )
                                        : hospitals;
                                    
                                    if (filtered.length === 0) {
                                        return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hospitals match &quot;{hospitalSearchTerm}&quot;. Try a different search term.</p>;
                                    }
                                    return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {filtered.map(h => (
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
                                    );
                                })()}
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

                                    {/* Deliver to Patient Button */}
                                    {caseDetail.assignedHospitalId && (
                                        <button
                                            onClick={handleDeliverReferralToPatient}
                                            disabled={deliveringReferral}
                                            style={{
                                                marginTop: '16px',
                                                padding: '10px 20px',
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: deliveringReferral ? 'not-allowed' : 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.9rem',
                                                opacity: deliveringReferral ? 0.6 : 1,
                                                width: '100%'
                                            }}
                                        >
                                            {deliveringReferral ? '📤 Delivering...' : '📤 Deliver Referral to Patient'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        )}

                        {activeTab === 'notes' && (
                            <>
                                <div className="dash-card">
                                    <h3>Add Referral / Follow-up Note</h3>
                                    <form onSubmit={handleAddNote} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                                <div className="dash-card">
                                    <h3>🗒️ Activity & Notes History</h3>
                                    <div style={{ marginTop: '16px' }}>
                                        <ReferralNoteList notes={notes} />
                                    </div>
                                </div>

                                <AuditTimeline session={caseDetail} auditLogs={auditLogs} />
                            </>
                        )}

                        {/* Guided flow: advance to the next tab in the review sequence */}
                        {(() => {
                            const currentIndex = CASE_TABS.findIndex((tabItem) => tabItem.id === activeTab);
                            const nextTab = CASE_TABS[currentIndex + 1];
                            if (!nextTab) return null;
                            return (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                                    onClick={() => {
                                        setActiveTab(nextTab.id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    Next: {nextTab.icon} {nextTab.label} →
                                </button>
                            );
                        })()}
                    </div>

                </div>

                {/* Case Management modal */}
                {showCaseManagement && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                        }}
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setShowCaseManagement(false)}
                    >
                        <div className="dash-card" style={{ width: '100%', maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>🛠️ Case Management</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCaseManagement(false)}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleUpdateStatus} style={{ marginTop: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Update Status: </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-input" style={{ flex: 1 }}>
                                        <option value="NEW">New</option>
                                        <option value="VIEWED">Viewed</option>
                                        <option value="CONTACTED">Contacted Patient</option>
                                        <option value="REFERRED">Referred to Clinic</option>
                                        <option value="HOSPITAL_ASSIGNED">Hospital Assigned</option>
                                        <option value="IN_TRANSIT">In Transit</option>
                                        <option value="ADMITTED">Admitted</option>
                                        <option value="FOLLOW_UP_NEEDED">Follow-up Needed</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmittingStatus}>
                                        {isSubmittingStatus ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </form>

                            <hr style={{ margin: '16px 0', borderColor: 'var(--border-subtle)' }} />

                            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Set Next Checkup Date</h4>
                            <form onSubmit={handleSetFollowUpDate} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
