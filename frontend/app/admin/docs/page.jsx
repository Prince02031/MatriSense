'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import docsApi from '../../api/docsApi';

export default function AdminDocsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [isPublic, setIsPublic] = useState(true);
  const [availableFrom, setAvailableFrom] = useState('2026-01-01T00:00');
  const [availableUntil, setAvailableUntil] = useState('2026-12-31T23:59');

  useEffect(() => {
    const checkAuthAndFetchConfig = async () => {
      try {
        const token = localStorage.getItem('matrisense_token');
        const userRole = localStorage.getItem('userRole');

        if (!token || userRole !== 'ADMIN') {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);

        const status = await docsApi.getDocsStatus();
        setConfig(status);

        if (status) {
          setIsPublic(status.isPublic);
          if (status.availableFrom) {
            setAvailableFrom(new Date(status.availableFrom).toISOString().slice(0, 16));
          }
          if (status.availableUntil) {
            setAvailableUntil(new Date(status.availableUntil).toISOString().slice(0, 16));
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching admin docs status:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    checkAuthAndFetchConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('matrisense_token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsSaving(false);
        return;
      }

      const updateData = {
        isPublic,
        availableFrom: new Date(availableFrom).toISOString(),
        availableUntil: new Date(availableUntil).toISOString()
      };

      const result = await docsApi.updateDocsConfig(token, updateData);

      if (result.config) {
        setConfig(result.config);
      }
      setError(null);
      alert('✓ Documentation schedule updated successfully!');
    } catch (err) {
      console.error('Error saving config:', err);
      setError(err.message || 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">🚫</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                You must log in with an Administrator account to configure document accessibility parameters.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md shadow-rose-600/10 transition duration-150 active:scale-95"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shadow-inner">M</span>
            <div>
              <h1 className="text-lg font-black text-gray-900">Docs Configuration</h1>
              <p className="text-xs text-gray-400 font-medium">Manage access and active schedules</p>
            </div>
          </div>
          <Link href="/docs" className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline">
            View Public Docs →
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl w-full mx-auto px-6 py-12 flex-grow space-y-8">
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-rose-500 text-lg">❌</span>
            <div>
              <p className="font-bold text-rose-800 text-sm">Failed to Update Settings</p>
              <p className="text-rose-600 text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Access Control & Schedule</h2>
            <p className="text-xs text-gray-400 font-medium mt-1">Configure global visibility windows and availability checks</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* Toggle Toggle */}
            <div className="flex items-center justify-between gap-6 p-6 bg-rose-50/30 rounded-2xl border border-rose-100/50">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-gray-800">Public Documentation</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  When enabled, public users can browse /docs content. When disabled, it remains strictly locked.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Schedule Inputs */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Availability Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600">
                    Available From
                  </label>
                  <input
                    type="datetime-local"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-gray-50 text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600">
                    Available Until
                  </label>
                  <input
                    type="datetime-local"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-gray-50 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Status Info */}
            {config && (
              <div className="bg-gray-50 rounded-2xl border border-gray-100/50 p-6 space-y-4">
                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Status Snapshot</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-500">
                  <div className="flex justify-between border-b pb-2 md:border-0 md:pb-0">
                    <span>Public Status:</span>
                    <span className="font-bold text-gray-800">{config.isPublic ? '✅ Enabled' : '❌ Disabled'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 md:border-0 md:pb-0">
                    <span>Active Now:</span>
                    <span className="font-bold text-gray-800">{config.isAvailableNow ? '✅ Yes' : '❌ No'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 md:border-0 md:pb-0">
                    <span>Effective From:</span>
                    <span className="font-bold text-gray-800 font-mono">{new Date(config.availableFrom).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Effective Until:</span>
                    <span className="font-bold text-gray-800 font-mono">{new Date(config.availableUntil).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md shadow-rose-600/10 transition duration-150 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? '💾 Saving Schedule...' : '💾 Save Settings'}
              </button>
              <Link
                href="/docs"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm py-3.5 rounded-2xl text-center transition duration-150 active:scale-95"
              >
                👁 Preview Live Docs
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-gray-500 font-medium">
          MatriSense Administrative System Panel • Built for clinical security and validation.
        </div>
      </footer>
    </div>
  );
}
