'use client';

import { useAuth } from './context/AuthContext';
import { normalizeRole } from '../src/utils/roleHelpers';
import HomeGuest from './components/home/HomeGuest';
import HomePatient from './components/home/HomePatient';
import HomeWorker from './components/home/HomeWorker';
import HomeAdmin from './components/home/HomeAdmin';

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-matri-soft text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-soft">
            <p className="text-sm text-slate-600">লোড হচ্ছে...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return <HomeGuest />;
  }

  const normalizedRole = normalizeRole(user.role);

  if (normalizedRole === 'worker') {
    return <HomeWorker user={user} />;
  }

  if (normalizedRole === 'admin') {
    return <HomeAdmin user={user} />;
  }

  return <HomePatient user={user} />;
}
