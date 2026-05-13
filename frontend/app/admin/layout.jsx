import ProtectedRoute from '../components/ProtectedRoute';

export default function AdminDashboardLayout({ children }) {
    return (
        <ProtectedRoute allowedRoles={['admin']}>
            <div style={{ backgroundColor: 'var(--bg-card)', minHeight: '100vh', padding: '24px' }}>
                {children}
            </div>
        </ProtectedRoute>
    );
}
