import React from 'react';
import Link from 'next/link';

import ArchitectureDiagram from '../components/docs/ArchitectureDiagram';
import AiPipelineSection from '../components/docs/AiPipelineSection';
import RagFlowSection from '../components/docs/RagFlowSection';
import SafetyGuardrailsSection from '../components/docs/SafetyGuardrailsSection';
import DemoCredentialsSection from '../components/docs/DemoCredentialsSection';

export default function DocsPage() {
    return (
        <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', lineHeight: '1.6' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>MatriSense Documentation</h1>
                <Link href="/" className="btn btn-outline">← Back to Home</Link>
            </div>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                An overview of the architectural pipelines, safety guardrails, and deterministic rules governing the MatriSense Maternal Triage Platform.
            </p>

            <hr style={{ borderColor: 'var(--border-subtle)', marginBottom: '40px' }} />

            {/* 1. Problem */}
            <div className="dash-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>1. The Problem</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    In Bangladesh, maternal mortality remains a critical issue, largely driven by delays in identifying dangerous symptoms
                    and seeking appropriate care. Existing automated symptom checkers often rely on purely generative AI, which poses
                    severe risks of hallucinating medical diagnoses or providing unsafe advice. Furthermore, rural mothers face language
                    and literacy barriers when interfacing with rigid, formal medical forms.
                </p>
            </div>

            {/* 2. Solution Flow */}
            <div className="dash-card" style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '16px' }}>2. The Solution Flow</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    MatriSense allows mothers to input unstructured, colloquial Bangla text or voice. Instead of generative diagnosing, it uses a <strong>Neuro-Symbolic</strong> approach:
                    AI is used strictly for translation and extraction into a deterministic rule engine. The rule engine calculates risk and triggers
                    Rule-Aware RAG to synthesize empathetic, culturally appropriate, and strictly safe care guidance. High-risk patients are immediately routed to a Health Worker Dashboard for active intervention.
                </p>
            </div>

            {/* 3. System Architecture */}
            <ArchitectureDiagram />

            {/* 4. AI Pipeline */}
            <AiPipelineSection />

            {/* 5. Rule-aware RAG */}
            <RagFlowSection />

            {/* 6. Rule Engine Design */}
            <div className="dash-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px' }}>6. Deterministic Rule Engine</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    We utilize <code>json-rules-engine</code> on the Node.js backend. Rules are explicitly coded (e.g., if <code>symptoms.includes('vaginal_bleeding')</code> AND <code>trimester === 'third'</code> → <code>Risk: HIGH</code>). By decoupling the LLM from the decision tree, we guarantee that critical danger signs are never hallucinated away. The Engine dictates priority, and the LLM simply translates that priority.
                </p>
            </div>

            {/* 7. Safety Guardrails */}
            <SafetyGuardrailsSection />

            {/* 8. Data Lifecycle */}
            <div className="dash-card" style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '16px' }}>8. Data Lifecycle & Audit Logging</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    To ensure accountability, every state transition is explicitly logged to an independent <code>AuditLog</code> collection.
                </p>
                <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                    <li><strong>Extraction Audit:</strong> The raw, unfiltered LLM output is saved to the DB alongside the parsed output for quality assurance and debugging, but never shown to the user.</li>
                    <li><strong>Action Trails:</strong> Worker actions (e.g., viewing a case, updating a status, adding a referral note) create immutable timeline events preventing dropped cases.</li>
                </ul>
            </div>

            {/* 9. Demo Credentials */}
            <DemoCredentialsSection />

            {/* 10. Team */}
            <div className="dash-card" style={{ marginBottom: '40px', background: 'var(--bg-card)', textAlign: 'center' }}>
                <h3 style={{ marginBottom: '16px' }}>10. The Team</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Built by passionate developers focused on applying safe AI to global health challenges.
                </p>
            </div>

        </div>
    );
}
