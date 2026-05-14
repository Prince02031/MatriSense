export default function CasePriorityBadge({ priority }) {
    if (!priority) return null;

    let badgeClass = 'badge-secondary';
    let label = priority;

    switch (priority) {
        case 'URGENT':
            badgeClass = 'badge-danger';
            break;
        case 'ATTENTION_NEEDED':
            badgeClass = 'badge-warning';
            label = 'ATTENTION';
            break;
        case 'NORMAL':
            badgeClass = 'badge-primary';
            break;
        default:
            badgeClass = 'badge-secondary';
    }

    return (
        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
            {label}
        </span>
    );
}
