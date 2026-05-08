'use client';

import Link from 'next/link';
import { useAuth } from './context/AuthContext';

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <main className="landing">
      <span className="landing-badge">🩺 MatriSense</span>

      <h1>Safe Motherhood,<br />Powered by AI</h1>

      <p className="landing-subtitle">
        AI-driven maternal health triage for rural Bangladesh. Report symptoms in Bangla,
        get instant risk assessment, and connect with health workers.
      </p>

      <div className="landing-actions">
        {isAuthenticated ? (
          <Link href={`/dashboard/${user.role}`} className="btn btn-primary btn-lg">
            Go to Dashboard →
          </Link>
        ) : (
          <>
            <Link href="/login" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link href="/register" className="btn btn-outline btn-lg">
              Create Account
            </Link>
          </>
        )}
      </div>

      <div className="landing-features">
        <div className="feature-card">
          <div className="icon">🗣️</div>
          <h3>Bangla Input</h3>
          <p>Report symptoms naturally in Bangla text</p>
        </div>
        <div className="feature-card">
          <div className="icon">🤖</div>
          <h3>AI Triage</h3>
          <p>Intelligent risk classification powered by AI</p>
        </div>
        <div className="feature-card">
          <div className="icon">👩‍⚕️</div>
          <h3>Health Workers</h3>
          <p>Cases routed to workers for follow-up</p>
        </div>
      </div>
    </main>
  );
}
