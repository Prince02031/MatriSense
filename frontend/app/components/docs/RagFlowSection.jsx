import React from 'react';

export default function RagFlowSection() {
    return (
        <div className="dash-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Rule-Aware RAG</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Unlike standard Retrieval-Augmented Generation that vector-searches based simply on patient queries, MatriSense RAG is <strong>Rule-Aware</strong>.
            </p>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--accent-secondary)' }}>
                <strong style={{ display: 'block', marginBottom: '8px' }}>How it Works:</strong>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>The deterministic Rule Engine outputs a precise `Decision` (e.g. Risk Level: HIGH).</li>
                    <li>The Context Assembler uses BOTH the Risk Level and matched Evidence Tags to fetch corresponding static <code>KnowledgeCards.json</code>.</li>
                    <li>The LLM is prompted strictly to assemble its response <strong>ONLY</strong> using the provided specific knowledge cards.</li>
                    <li>If a user presents "Vaginal Bleeding", the RAG index doesn't blindly search for bleeding advice—it fetches the WHO "Immediate Referral" guidelines explicitly mandated by the rule engine.</li>
                </ol>
            </div>
        </div>
    );
}
