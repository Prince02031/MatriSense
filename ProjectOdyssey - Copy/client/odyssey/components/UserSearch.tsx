'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Lock, X, Clock } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import type { UserSearchResult } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  token?: string;
}

export default function UserSearch({ token }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);

  const {
    history,
    loading: historyLoading,
    fetchHistory,
    recordClick,
    removeEntry,
    clearAll,
  } = useSearchHistory(token || '');

  // Fetch history when search bar is focused for the first time
  useEffect(() => {
    if (focused && history.length === 0 && token) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  // Live search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `${BASE}/api/users/search?q=${encodeURIComponent(query)}&limit=8`,
          { headers }
        );
        const json = await res.json();
        setResults(json.data ?? []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Called when user clicks any search result ─────────────────────────────
  const handleResultClick = async (userId: string) => {
    if (token) {
      await recordClick(userId, query);
    }
    setFocused(false);
    setQuery('');
    setResults([]);
    router.push(`/profile/${userId}`);
  };

  // ── Called when user clicks a history item ─────────────────────────────────
  const handleHistoryClick = async (userId: string) => {
    if (token) {
      await recordClick(userId, '');
    }
    setFocused(false);
    router.push(`/profile/${userId}`);
  };

  const showHistory = focused && query.trim().length === 0 && token;
  const showResults = focused && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A9B7F] focus:border-transparent"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown panel */}
      {(showHistory || showResults) && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-96 overflow-y-auto">
          
          {/* ── HISTORY MODE ── */}
          {showHistory && (
            <>
              {historyLoading && (
                <p className="text-xs text-gray-400 px-4 py-3">Loading...</p>
              )}

              {!historyLoading && history.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No recent searches</p>
                </div>
              )}

              {!historyLoading && history.length > 0 && (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Recent Searches
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAll();
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Entries */}
                  <ul>
                    {history.map(entry => (
                      <li
                        key={entry._id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                      >
                        {/* Avatar + name — clickable */}
                        <button
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          onClick={() => handleHistoryClick(entry.user._id)}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEntry(entry._id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 p-1"
                          aria-label="Remove from history"
                        >
                          <X className="w-4 h-4" />
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
                <div className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Searching...</p>
                </div>
              )}

              {!searching && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-gray-400">
                    No users found for "{query}"
                  </p>
                </div>
              )}

              {!searching && results.length > 0 && (
                <ul>
                  {results.map(user => (
                    <li
                      key={user._id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleResultClick(user._id)}
                    >
                      <img
                        src={user.profileImage}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{user.displayName}</p>
                          {user.isPrivate && (
                            <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                      </div>
                      {!user.isPrivate && (
                        <div className="flex flex-col items-end text-xs text-gray-500 shrink-0">
                          {user.level && <span className="text-[#4A9B7F] font-semibold">Lvl {user.level}</span>}
                          {user.xp !== undefined && <span>{user.xp} XP</span>}
                        </div>
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
