'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                // Not logged in at all
                router.push('/login');
            } else if (allowedRoles && !allowedRoles.includes(user?.role)) {
                // Logged in but missing required role
                // Redirect patients strictly to their dashboard, otherwise home
                if (user?.role === 'patient') {
                    router.push('/dashboard/patient');
                } else {
                    router.push('/');
                }
            }
        }
    }, [loading, isAuthenticated, user, allowedRoles, router]);

    // Show a loading skeleton/message while verifying auth state
    if (loading) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Verifying authorization...
            </div>
        );
    }

    // Only render children if everything is valid
    if (isAuthenticated && allowedRoles.includes(user?.role)) {
        return <>{children}</>;
    }

    // Return null while redirect executes to prevent flickering secure data
    return null;
}
