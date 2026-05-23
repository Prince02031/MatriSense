import CasePriorityBadge from '../CasePriorityBadge';
import RiskBadge from '../RiskBadge';

export default function PatientProfilePanel({ patient, decision, caseState, nextCheckupDate, followUpDateSetBy }) {
    const profile = caseState?.profile || {};

    const name = patient?.name || profile?.name || 'Anonymous Patient';
    const age = patient?.age ? `${patient.age} yrs` : profile?.age ? `${profile.age} yrs` : 'N/A';
    const phone = patient?.phone || 'N/A';
    const trimester = patient?.trimester || profile?.trimester || 'unknown';
    const gestationalWeek = patient?.gestationalWeek || profile?.gestationalWeek || 'N/A';

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
