export default function RiskBadge({ riskLevel }) {
    if (!riskLevel) return <span className="badge badge-secondary">UNKNOWN</span>;

    let badgeClass = 'badge-secondary';
    switch (riskLevel) {
        case 'HIGH':
            badgeClass = 'badge-danger';
            break;
        case 'MEDIUM':
            badgeClass = 'badge-warning';
            break;
        case 'LOW':
            badgeClass = 'badge-success';
            break;
        default:
            badgeClass = 'badge-secondary';
    }

    return (
        <span className={`badge ${badgeClass}`}>
            {riskLevel} RISK
        </span>
    );
}
