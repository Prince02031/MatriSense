import CasePriorityBadge from '../CasePriorityBadge';
import RiskBadge from '../RiskBadge';

export default function PatientProfilePanel({ patient, decision }) {
    if (!patient) return null;

    return (
        <div className="dash-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                👤 Patient Profile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <p><strong>Name:</strong> {patient.name}</p>
                    <p><strong>Age:</strong> {patient.age ? `${patient.age} yrs` : 'N/A'}</p>
                    <p><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
                </div>
                <div>
                    <p><strong>Trimester:</strong> {patient.trimester}</p>
                    <p><strong>Gestational Wk:</strong> {patient.gestationalWeek || 'N/A'}</p>
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
