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
                router.push('/login');
                return;
            }

            if (allowedRoles) {
                // Create a mapping to bridge the gap between Frontend labels and DB Enums
                const roleMapping = {
                    'worker': 'HEALTH_WORKER',
                    'patient': 'MOTHER',
                    'admin': 'ADMIN'
                };

                // Check if the user's actual role matches the allowed role 
                // OR if the mapped version of the allowed role matches
                const isAllowed = allowedRoles.some(role =>
                    user?.role === role || user?.role === roleMapping[role]
                );

                if (!isAllowed) {
                    // Redirect based on their actual role
                    if (user?.role === 'MOTHER' || user?.role === 'patient') {
                        router.push('/dashboard/patient');
                    } else if (user?.role === 'HEALTH_WORKER' || user?.role === 'worker') {
                        router.push('/dashboard/worker');
                    } else {
                        router.push('/');
                    }
                }
            }
        }
    }, [loading, isAuthenticated, user, allowedRoles, router]);

    if (loading) {
        return (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Verifying authorization...
            </div>
        );
    }

    // Helper to verify rendering permission
    const checkPermission = () => {
        if (!isAuthenticated || !user) return false;
        if (!allowedRoles) return true;

        const roleMapping = {
            'worker': 'HEALTH_WORKER',
            'patient': 'MOTHER',
            'admin': 'ADMIN'
        };

        return allowedRoles.some(role =>
            user.role === role || user.role === roleMapping[role]
        );
    };

    if (checkPermission()) {
        return <>{children}</>;
    }

    return null;
}