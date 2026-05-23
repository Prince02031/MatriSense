'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../../src/utils/roleHelpers';

// Updated config to match backend Enums
const navConfig = {
    MOTHER: {
        label: 'Patient',
        roleKey: 'patient',
        sections: [
            {
                title: 'Main',
                links: [
                    { href: '/dashboard/patient', icon: '🏠', label: 'Dashboard' },
                    { href: '/dashboard/patient#symptoms', icon: '📝', label: 'Report Symptoms' },
                    { href: '/dashboard/patient#history', icon: '📋', label: 'My History' },
                    { href: '/dashboard/patient#profile', icon: '👤', label: 'My Profile' },
                ],
            },
        ],
    },
    HEALTH_WORKER: {
        label: 'Health Worker',
        roleKey: 'worker',
        sections: [
            {
                title: 'Main',
                links: [
                    { href: '/dashboard/worker', icon: '🏠', label: 'Dashboard' },
                    { href: '/dashboard/worker#cases', icon: '📂', label: 'Case Queue' },
                    { href: '/dashboard/worker#patients', icon: '👥', label: 'Patients' },
                    { href: '/dashboard/worker#alerts', icon: '🔔', label: 'Alerts' },
                ],
            },
        ],
    },
    ADMIN: {
        label: 'Admin',
        roleKey: 'admin',
        sections: [
            {
                title: 'Main',
                links: [
                    { href: '/dashboard/admin', icon: '🏠', label: 'Dashboard' },
                    { href: '/dashboard/admin#users', icon: '👥', label: 'Users' },
                    { href: '/dashboard/admin#analytics', icon: '📊', label: 'Analytics' },
                    { href: '/dashboard/admin#settings', icon: '⚙️', label: 'Settings' },
                ],
            },
        ],
    },
};

export default function DashboardLayout({ children }) {
    const { user, loading, logout, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) return null;

    const getNav = () => {
        const normalized = normalizeRole(user.role);
        if (normalized === 'worker') return navConfig.HEALTH_WORKER;
        if (normalized === 'admin') return navConfig.ADMIN;
        return navConfig.MOTHER; // Default to Patient/Mother
    };

    const nav = getNav();
    const roleClass = `role-${nav.roleKey}`;

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <div className="dashboard-wrapper">
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Link href="/" className="sidebar-logo">
                        <span className="logo-icon">🩺</span>
                        MatriSense
                    </Link>
                    <span className={`sidebar-role ${roleClass}`}>{nav.label}</span>
                </div>

                <nav className="sidebar-nav">
                    {nav.sections.map((section) => (
                        <div key={section.title}>
                            <div className="nav-section-label">{section.title}</div>
                            {section.links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`nav-link ${pathname === link.href.split('#')[0] && !link.href.includes('#') ? 'active' : ''
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="nav-icon">{link.icon}</span>
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user.name}</div>
                            <div className="sidebar-user-email">{user.email}</div>
                        </div>
                    </div>
                    <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
                        🚪 Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            ☰
                        </button>
                        <h2>
                            {normalizeRole(user.role) === 'patient' && '🤰 Patient Portal'}
                            {normalizeRole(user.role) === 'worker' && '👩‍⚕️ Worker Portal'}
                            {normalizeRole(user.role) === 'admin' && '🛡️ Admin Portal'}
                        </h2>
                    </div>
                    <div className="header-actions">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {user.name}
                        </span>
                    </div>
                </header>

                <div className="dashboard-content">
                    {children}
                </div>
            </main>
        </div>
    );
}