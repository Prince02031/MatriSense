import { useState, useCallback } from 'react';
import type { SearchHistoryEntry } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function useSearchHistory(token: string) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users/search-history`, {
        headers: authHeaders(token),
      });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch (err) {
      console.error('Failed to fetch search history:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── Record a click ─────────────────────────────────────────────────────────
  const recordClick = useCallback(async (searchedUserId: string, query = '') => {
    if (!token) return;
    try {
      await fetch(`${BASE}/api/users/search-history`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchedUserId, query }),
      });
      // No need to re-fetch — optimistic update is enough for UX
    } catch (err) {
      console.error('Failed to record search history:', err);
    }
  }, [token]);

  // ── Remove one entry ───────────────────────────────────────────────────────
  const removeEntry = useCallback(async (entryId: string) => {
    setHistory(prev => prev.filter(e => e._id !== entryId)); // optimistic
    try {
      await fetch(`${BASE}/api/users/search-history/${entryId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
    } catch (err) {
      console.error('Failed to remove history entry:', err);
      fetchHistory(); // revert on failure
    }
  }, [token, fetchHistory]);

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    setHistory([]); // optimistic
    try {
      await fetch(`${BASE}/api/users/search-history`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
    } catch (err) {
      console.error('Failed to clear search history:', err);
      fetchHistory(); // revert on failure
    }
  }, [token, fetchHistory]);

  return { history, loading, fetchHistory, recordClick, removeEntry, clearAll };
}
