# Search History — Frontend Implementation Guide

**For:** Alfi (Frontend Developer)  
**Backend Author:** Saad  
**Feature:** User search history — show recent searches, record clicks, remove entries, clear all  
**Base URL:** `http://localhost:4000` (dev)

---

## How It Works

```
Search bar focused (no query typed)     → show history list from GET /search-history
User starts typing                      → hide history, show live search results
User clicks a result                    → POST /search-history, then navigate to profile
User taps ✕ on a history item          → DELETE /search-history/:entryId
User taps "Clear all"                   → DELETE /search-history
```

---

## API Reference

All four endpoints require authentication.

### 1. Get history

```
GET /api/users/search-history
Authorization: Bearer <token>
```

Returns last 20 entries, most recent first.

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id":       "64f1...",
      "query":     "alfi",
      "updatedAt": "2026-03-01T10:30:00Z",
      "user": {
        "_id":          "64a1...",
        "username":     "alfi",
        "displayName":  "Alfi Rahman",
        "profileImage": "https://..."
      }
    },
    ...
  ]
}
```

### 2. Record a click

```
POST /api/users/search-history
Authorization: Bearer <token>
Content-Type: application/json

{ "searchedUserId": "64a1...", "query": "alfi" }
```

- `searchedUserId` — required, the MongoDB `_id` of the profile that was clicked
- `query` — optional, the search term typed at the time of the click

Calling this for the same user twice does **not** create a duplicate — it just refreshes the timestamp so they rise to the top.

Response `201`:
```json
{ "success": true, "message": "Search history recorded", "data": { ... } }
```

### 3. Remove one entry

```
DELETE /api/users/search-history/:entryId
Authorization: Bearer <token>
```

Use the `_id` from the history list (not the user's `_id`).

```json
{ "success": true, "message": "History entry removed" }
```

### 4. Clear all history

```
DELETE /api/users/search-history
Authorization: Bearer <token>
```

```json
{ "success": true, "message": "Search history cleared (3 entries removed)" }
```

---

## TypeScript Interfaces

Add to `lib/types.ts`:

```typescript
export interface SearchHistoryEntry {
  _id:       string;   // history entry ID — use this for DELETE /:entryId
  query:     string;   // search term used when the user was clicked
  updatedAt: string;
  user: {
    _id:          string;
    username:     string;
    displayName:  string;
    profileImage: string;
  };
}

export interface SearchHistoryResponse {
  success: boolean;
  count:   number;
  data:    SearchHistoryEntry[];
}
```

---

## Implementation

### Hook — `useSearchHistory`

```typescript
// hooks/useSearchHistory.ts
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
      const res  = await fetch(`${BASE}/api/users/search-history`, {
        headers: authHeaders(token),
      });
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── Record a click ─────────────────────────────────────────────────────────
  const recordClick = useCallback(async (searchedUserId: string, query = '') => {
    if (!token) return;
    try {
      await fetch(`${BASE}/api/users/search-history`, {
        method:  'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body:    JSON.stringify({ searchedUserId, query }),
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
        method:  'DELETE',
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
        method:  'DELETE',
        headers: authHeaders(token),
      });
    } catch (err) {
      console.error('Failed to clear search history:', err);
      fetchHistory(); // revert on failure
    }
  }, [token, fetchHistory]);

  return { history, loading, fetchHistory, recordClick, removeEntry, clearAll };
}
```

---

### Updated Search Bar Component

This replaces the basic `UserSearch` from the previous guide. When focused with no query it shows history; once the user types it shows live results.

```tsx
// components/UserSearch.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import type { UserSearchResult } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  token: string;
}

export default function UserSearch({ token }: Props) {
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<UserSearchResult[]>([]);
  const [focused,  setFocused]  = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    history,
    loading: historyLoading,
    fetchHistory,
    recordClick,
    removeEntry,
    clearAll,
  } = useSearchHistory(token);

  // Fetch history when search bar is focused for the first time
  useEffect(() => {
    if (focused && history.length === 0) fetchHistory();
  }, [focused]);                          // eslint-disable-line react-hooks/exhaustive-deps

  // Live search with debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(
          `${BASE}/api/users/search?q=${encodeURIComponent(query)}&limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        setResults(json.data ?? []);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, token]);

  // ── Called when user clicks any result ─────────────────────────────────────
  const handleResultClick = async (userId: string) => {
    await recordClick(userId, query);    // fire-and-forget
    setFocused(false);
    setQuery('');
    setResults([]);
    router.push(`/profile/${userId}`);
  };

  // ── Called when user clicks a history item ─────────────────────────────────
  const handleHistoryClick = async (userId: string, entryId: string) => {
    await recordClick(userId, '');       // refresh timestamp
    setFocused(false);
    router.push(`/profile/${userId}`);
  };

  const showHistory = focused && query.trim().length === 0;
  const showResults = focused && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-md">
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)} // allow click events
        className="input input-bordered w-full"
      />

      {/* Dropdown panel */}
      {(showHistory || showResults) && (
        <div className="absolute z-50 w-full bg-base-100 border rounded-xl shadow-lg mt-1 overflow-hidden">

          {/* ── HISTORY MODE ── */}
          {showHistory && (
            <>
              {historyLoading && (
                <p className="text-xs text-gray-400 px-4 py-3">Loading...</p>
              )}

              {!historyLoading && history.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-3">No recent searches</p>
              )}

              {!historyLoading && history.length > 0 && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Recent
                    </span>
                    <button
                      onClick={clearAll}
                      className="text-xs text-error hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Entries */}
                  <ul>
                    {history.map(entry => (
                      <li
                        key={entry._id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-base-200"
                      >
                        {/* Avatar + name — clickable */}
                        <button
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          onClick={() => handleHistoryClick(entry.user._id, entry._id)}
                        >
                          <img
                            src={entry.user.profileImage}
                            alt={entry.user.username}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {entry.user.displayName}
                            </p>
                            <p className="text-xs text-gray-400">@{entry.user.username}</p>
                          </div>
                        </button>

                        {/* Remove button */}
                        <button
                          onClick={() => removeEntry(entry._id)}
                          className="text-gray-400 hover:text-error text-lg leading-none shrink-0"
                          aria-label="Remove from history"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {/* ── SEARCH RESULTS MODE ── */}
          {showResults && (
            <>
              {searching && (
                <p className="text-xs text-gray-400 px-4 py-3">Searching...</p>
              )}

              {!searching && results.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-3">
                  No users found for "{query}"
                </p>
              )}

              {!searching && results.length > 0 && (
                <ul>
                  {results.map(user => (
                    <li
                      key={user._id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-base-200 cursor-pointer"
                      onClick={() => handleResultClick(user._id)}
                    >
                      <img
                        src={user.profileImage}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{user.displayName}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                      {user.isPrivate && (
                        <span className="text-xs text-gray-400 shrink-0">🔒</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Behaviour Summary

| State | What shows |
|-------|-----------|
| Bar not focused | Nothing |
| Focused, empty query | History list (max 20, newest first) |
| Focused, typing | Live search results (debounced 350ms) |
| No history + focused | "No recent searches" |
| No results for query | "No users found for '...'" |

---

## Edge Cases

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Same person clicked again | Entry upserted — `updatedAt` refreshed, floats to top | History re-fetched on next open |
| Remove entry ID not found / wrong user | `404 { error: "History entry not found" }` | Optimistic removal already done — no visual change needed |
| Recording yourself | `400` | Don't call `recordClick` on own profile (hide search result for own user or skip the call) |
| Not logged in | `401` on all history endpoints | Don't render search history at all — guests only see live results |
| Private user in history (account went private after being searched) | User stub still returns from `populate` | Clicking navigates to profile which shows the private wall |
