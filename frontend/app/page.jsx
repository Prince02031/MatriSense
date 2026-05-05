'use client';

import { useEffect, useState } from 'react';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [status, setStatus] = useState('Loading backend status...');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, messageRes] = await Promise.all([
          fetch(`${apiBase}/health`),
          fetch(`${apiBase}/api/message`),
        ]);

        const healthData = await healthRes.json();
        const messageData = await messageRes.json();

        setStatus(`${healthData.service} is ${healthData.status}`);
        setMessage(messageData.message);
      } catch (err) {
        setError('Could not connect to the backend. Start the Express server first.');
      }
    };

    load();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <span className="badge">MatriSense</span>
        <h1>Next.js frontend connected to an Express API</h1>
        <p>
          A clean starter setup for building the MatriSense app with a React-based UI and a Node.js backend.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Backend status</h2>
          <p>{status}</p>
          {error ? <p className="error">{error}</p> : <p className="success">Backend reachable at {apiBase}</p>}
        </article>

        <article className="card accent">
          <h2>API message</h2>
          <p>{message || 'Waiting for response...'}</p>
        </article>
      </section>
    </main>
  );
}
