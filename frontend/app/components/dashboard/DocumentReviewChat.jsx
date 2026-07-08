'use client';

import { useState, useRef, useEffect } from 'react';
import { sendDocumentReviewMessage } from '../../api/patientApi';

/**
 * Standalone, document-scoped chat used to walk a patient through
 * confirming/correcting the values Gemini Vision extracted from one
 * uploaded document. Independent of the triage Guided Care Assistant —
 * no TriageSession involved, no persistence beyond this component's state
 * (stateless per-turn backend, same convention as the triage chat).
 */
export default function DocumentReviewChat({ documentId, onClose, onDone }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! Let's go through what I found in your document together. Just tell me if each value looks right, or correct me if it doesn't.",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;

        setInput('');
        setError(null);
        setLoading(true);

        const updated = [...messages, { role: 'user', content: trimmed }];
        setMessages(updated);

        try {
            const data = await sendDocumentReviewMessage(documentId, {
                message: trimmed,
                chatHistory: updated,
                language: 'en',
            });

            if (!data.success) {
                throw new Error(data.error || 'Failed to get a reply.');
            }

            setMessages([...updated, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            setError(err.message || 'Failed to send message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="dash-card"
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>💬 Discuss &amp; Confirm</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)' }}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: msg.role === 'user' ? 'var(--accent-teal, #0d9488)' : 'var(--surface-subtle, #f1f5f9)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                fontSize: '0.88rem',
                                lineHeight: 1.4,
                                whiteSpace: 'pre-line',
                            }}
                        >
                            {msg.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Thinking...
                        </div>
                    )}
                    {error && (
                        <p style={{ color: 'var(--accent-rose)', fontSize: '0.82rem' }}>{error}</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                    style={{ display: 'flex', gap: '8px', padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your reply..."
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '999px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.88rem',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="badge badge-info"
                        style={{ padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                        Send
                    </button>
                </form>

                <div style={{ padding: '10px 18px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                        type="button"
                        className="badge badge-success"
                        style={{ width: '100%', padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: '0.88rem' }}
                        onClick={onDone}
                    >
                        ✓ Done discussing — Save
                    </button>
                </div>
            </div>
        </div>
    );
}
