export default function CaseStatusBadge({ status }) {
    if (!status) return <span className="badge badge-secondary">NEW</span>;

    let bg = '#e2e8f0';
    let color = '#475569';
    let label = status;

    switch (status) {
        case 'NEW':
        case 'active':
            bg = '#dbeafe'; // light blue
            color = '#1e40af'; // dark blue
            label = 'NEW';
            break;
        case 'VIEWED':
            bg = '#fef08a'; // light yellow
            color = '#854d0e'; // dark yellow
            break;
        case 'CONTACTED':
            bg = '#ffedd5'; // light orange
            color = '#c2410c'; // dark orange
            break;
        case 'REFERRED':
            bg = '#e0e7ff'; // indigo
            color = '#3730a3';
            break;
        case 'FOLLOW_UP_NEEDED':
            bg = '#fce7f3'; // pink
            color = '#be185d';
            label = 'FOLLOW UP';
            break;
        case 'RESOLVED':
        case 'completed':
        case 'COMPLETED':
            bg = '#dcfce7'; // green
            color = '#166534';
            label = 'COMPLETED';
            break;
        case 'HOSPITAL_ASSIGNED':
            bg = '#e0e7ff'; // indigo
            color = '#3730a3';
            label = 'HOSPITAL ASSIGNED';
            break;
        case 'IN_TRANSIT':
            bg = '#fef08a'; // yellow
            color = '#854d0e';
            label = 'IN TRANSIT';
            break;
        case 'ADMITTED':
            bg = '#dbeafe'; // light blue
            color = '#1e40af';
            label = 'ADMITTED';
            break;
        case 'CANCELLED':
            bg = '#fee2e2'; // red
            color = '#991b1b';
            label = 'CANCELLED';
            break;
        default:
            break;
    }

    return (
        <span style={{
            fontSize: '0.75rem',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: bg,
            color: color,
            fontWeight: '600',
            whiteSpace: 'nowrap'
        }}>
            {label}
        </span>
    );
}
