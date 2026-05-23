export default function AuditTimeline({ auditLogs }) {
    if (!auditLogs || auditLogs.length === 0) {
        return (
            <div className="dash-card">
                <h3>⏱️ Audit Timeline</h3>
                <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>No audit history available.</p>
            </div>
        );
    }

    return (
        <div className="dash-card">
            <h3>⏱️ Audit Timeline</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {auditLogs.map((log) => (
                    <div key={log._id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            marginTop: '4px'
                        }} />
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                {log.action}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                By: {log.actorRole}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(log.createdAt).toLocaleString()}
                            </div>

                            {/* Render explicit details if they exist in the payload */}
                            {log.details && Object.keys(log.details).length > 0 && (
                                <div style={{ marginTop: '6px', fontSize: '0.8rem', background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                                    {Object.entries(log.details).map(([k, v]) => (
                                        <div key={k}><strong>{k}:</strong> {String(v)}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
