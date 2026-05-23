export default function EvidencePanel({ evidenceTags, careGuidanceContext }) {
    const hasTags = evidenceTags && evidenceTags.length > 0;
    const hasContext = careGuidanceContext && careGuidanceContext.cards && careGuidanceContext.cards.length > 0;

    if (!hasTags && !hasContext) {
        return (
            <div className="dash-card">
                <h3>📚 RAG Evidence</h3>
                <p style={{ color: 'var(--text-muted)' }}>No specific clinical evidence tags linked.</p>
            </div>
        );
    }

    return (
        <div className="dash-card">
            <h3>📚 RAG Evidence</h3>

            {hasTags && (
                <div style={{ marginBottom: '16px', marginTop: '12px' }}>
                    <strong>Evidence Tags:</strong>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {evidenceTags.map((tag, idx) => (
                            <span key={idx} style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.85rem' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {hasContext && (
                <div>
                    <strong>Guidance Cards:</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        {careGuidanceContext.cards.map((card, idx) => (
                            <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#fafafa' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{card.topic}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{card.contentEn}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
