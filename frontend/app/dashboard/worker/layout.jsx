import ProtectedRoute from '../../components/ProtectedRoute';

export default function WorkerDashboardLayout({ children }) {
    return (
        <ProtectedRoute allowedRoles={['worker', 'admin']}>
            {children}
        </ProtectedRoute>
    );
}
