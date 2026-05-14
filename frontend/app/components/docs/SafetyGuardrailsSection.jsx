import React from 'react';

export default function SafetyGuardrailsSection() {
    return (
        <div className="dash-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Safety Guardrails & Validation</h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Two layers of safety wrappers exist natively on the backend before the client portal ever receives data.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: '#be123c', marginBottom: '8px', fontSize: '0.95rem' }}>Pre-Generation</h4>
                    <ul style={{ fontSize: '0.85rem', paddingLeft: '20px', margin: 0, color: '#9f1239' }}>
                        <li>Validates that Rule Engine successfully ran.</li>
                        <li>Verifies RAG Context array is completely populated.</li>
                        <li>Triggers hard fallback if context generation failed.</li>
                    </ul>
                </div>

                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: '#047857', marginBottom: '8px', fontSize: '0.95rem' }}>Post-Generation</h4>
                    <ul style={{ fontSize: '0.85rem', paddingLeft: '20px', margin: 0, color: '#065f46' }}>
                        <li>Regex-based checks block unauthorized medication mentions (e.g., Aspirin, Misoprostol).</li>
                        <li>Checks for explicit diagnosis keywords.</li>
                        <li>If unsafe, overrides output with standardized hardcoded fallback string.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
