import React from 'react';

export default function ArchitectureDiagram() {
    return (
        <div className="dash-card" style={{ marginBottom: '24px', background: 'var(--bg-card)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
                System Architecture
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', textAlign: 'center' }}>

                {/* Frontend Layer */}
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>💻</div>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Client Applications</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Next.js React Frontend<br />
                        - Mother Portal<br />
                        - Health Worker Dashboard
                    </div>
                </div>

                {/* API Gateway / Logic Layer */}
                <div style={{ background: '#f0fdf4', border: '1px solid var(--accent-primary)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⚙️</div>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Node.js Core Backend</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Express API<br />
                        Deterministic Rule Engine<br />
                        Safety Overrides Validator
                    </div>
                </div>

                {/* AI & DB Layer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>🧠</div>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>AI Pipeline</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Google Gemini API
                        </div>
                    </div>

                    <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>s🗄️</div>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>Data Store</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            MongoDB (Patient Data & Rules)<br />
                            FAISS (Knowledge Base)
                        </div>
                    </div>
                </div>

            </div>

            <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Architecture ensures sensitive healthcare logic operates deterministically while AI is strictly sandboxed to extraction and empathetic summarization roles.
            </p>
        </div>
    );
}
