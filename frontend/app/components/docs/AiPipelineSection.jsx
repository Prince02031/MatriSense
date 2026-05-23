import React from 'react';

export default function AiPipelineSection() {
    const steps = [
        { label: "Patient Input", desc: "Mother enters colloquial unstructured textual symptoms in Bangla" },
        { label: "LLM Extractor", desc: "Constrained JSON-mode prompt forces exact boolean mapping of 18 medical codes" },
        { label: "State Hydration", desc: "Follow-up questions are merged with extraction to form strict internal `CaseState`" },
        { label: "Deterministic Engine", desc: "CaseState runs against hard Math/Logic to yield a `Decision` (Risk = URGENT)" },
        { label: "RAG Retrieval", desc: "Risk level fetches locked Knowledge Cards outlining allowed medical advice" },
        { label: "Generation & Validation", desc: "LLM synthesizes cards into empathetic output -> Safety Validator blocks hallucinations" }
    ];

    return (
        <div className="dash-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Neuro-Symbolic AI Pipeline</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                To solve the unreliability of purely generative health triage, MatriSense isolates the LLM from decision-making responsibilities.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map((step, idx) => (
                    <div key={idx} style={{
                        display: 'flex', gap: '16px', alignItems: 'center',
                        padding: '12px', background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)', borderRadius: '8px'
                    }}>
                        <div style={{
                            background: 'var(--accent-primary)', color: 'white',
                            width: '28px', height: '28px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0
                        }}>
                            {idx + 1}
                        </div>
                        <div>
                            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{step.label}</strong>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{step.desc}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
