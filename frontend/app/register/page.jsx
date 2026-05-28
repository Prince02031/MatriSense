'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../../src/utils/roleHelpers';
import LanguageToggle from '../components/LanguageToggle';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'patient',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await register(
                formData.name,
                formData.email,
                formData.password,
                formData.role,
                formData.phone
            );

            const targetPath = getDashboardPath(user);
            router.push(targetPath);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <LanguageToggle compact />
                    </div>
                    <Link href="/" className="auth-logo">
                        <span className="logo-icon">🩺</span>
                        MatriSense
                    </Link>
                    <h1>Create Account</h1>
                    <p>Join MatriSense to get started</p>
                </div>

                <div className="auth-card">
                    {error && (
                        <div className="form-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="name">Full Name</label>
                            <div className="form-input-icon">
                                <span className="icon">👤</span>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-email">Email Address</label>
                            <div className="form-input-icon">
                                <span className="icon">📧</span>
                                <input
                                    id="reg-email"
                                    name="email"
                                    type="email"
                                    className="form-input"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="reg-password">Password</label>
                            <div className="form-input-icon">
                                <span className="icon">🔒</span>
                                <input
                                    id="reg-password"
                                    name="password"
                                    type="password"
                                    className="form-input"
                                    placeholder="At least 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="phone">Phone Number</label>
                            <div className="form-input-icon">
                                <span className="icon">📱</span>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className="form-input"
                                    placeholder="01XXXXXXXXX"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Select Your Role</label>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
                                💡 Admin accounts are created by system administrators only.
                            </p>
                            <div className="role-selector">
                                <div className="role-option">
                                    <input
                                        type="radio"
                                        id="role-patient"
                                        name="role"
                                        value="patient"
                                        checked={formData.role === 'patient'}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="role-patient">
                                        <span className="role-icon">🤰</span>
                                        <span className="role-name">Patient</span>
                                        <span className="role-desc">Mother</span>
                                    </label>
                                </div>
                                <div className="role-option">
                                    <input
                                        type="radio"
                                        id="role-worker"
                                        name="role"
                                        value="worker"
                                        checked={formData.role === 'worker'}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor="role-worker">
                                        <span className="role-icon">👩‍⚕️</span>
                                        <span className="role-name">Worker</span>
                                        <span className="role-desc">Health Worker</span>
                                    </label>
                                </div>

                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <><span className="spinner"></span> Creating account...</>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>
                </div>

                <div className="auth-footer">
                    Already have an account? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}