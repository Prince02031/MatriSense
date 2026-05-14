export default function ReferralNoteList({ notes }) {
    if (!notes || notes.length === 0) {
        return <p style={{ color: 'var(--text-muted)' }}>No referral or follow-up notes yet.</p>;
    }

    return (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
            {notes.map(n => (
                <li key={n._id} style={{
                    marginBottom: '16px',
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '0.9rem' }}>
                            {new Date(n.createdAt).toLocaleString()}
                        </strong>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#e2e8f0',
                            fontWeight: 'bold'
                        }}>
                            {n.actionTaken}
                        </span>
                    </div>
                    {n.referredTo && (
                        <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--accent-primary)' }}>
                            <strong>Referred To:</strong> {n.referredTo}
                        </div>
                    )}
                    {n.followUpDate && (
                        <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            <strong>Follow-up Date:</strong> {new Date(n.followUpDate).toLocaleDateString()}
                        </div>
                    )}
                    <div style={{ fontSize: '0.95rem' }}>{n.note}</div>
                </li>
            ))}
        </ul>
    );
}
