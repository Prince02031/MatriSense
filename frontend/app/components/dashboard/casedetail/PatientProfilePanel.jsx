import CasePriorityBadge from '../CasePriorityBadge';
import RiskBadge from '../RiskBadge';

export default function PatientProfilePanel({ patient, decision, caseState }) {
    const profile = caseState?.profile || {};

    const name = patient?.name || profile?.name || 'Anonymous Patient';
    const age = patient?.age ? `${patient.age} yrs` : profile?.age ? `${profile.age} yrs` : 'N/A';
    const phone = patient?.phone || 'N/A';
    const trimester = patient?.trimester || profile?.trimester || 'unknown';
    const gestationalWeek = patient?.gestationalWeek || profile?.gestationalWeek || 'N/A';

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
        </div>
    );
}
