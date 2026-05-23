import { useState, useCallback, useRef } from 'react';
import type { Post } from './usePosts';

const API_URL = 'http://localhost:4000/api';

export type FeedSource = 'friends' | 'trending';

export interface SmartFeedPost extends Post {
  _feedSource: FeedSource;
}

interface SmartFeedPagination {
  hasMore: boolean;
  nextCursor: string | null;
  allCaughtUp: boolean;
  message: string | null;
  page: {
    friendsOnThisPage: number;
    trendingOnThisPage: number;
    total: number;
  };
}

export function useSmartFeed() {
  const [posts, setPosts] = useState<SmartFeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [allCaughtUpMessage, setAllCaughtUpMessage] = useState<string | null>(null);

  // Use refs to avoid stale closures in the intersection observer
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (cursor: string | null, reset: boolean) => {
    if (loadingRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`${API_URL}/posts/feed?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        setError('Not authenticated');
        return;
      }
      if (res.status === 400) {
        // Invalid cursor — reset from scratch
        console.warn('[useSmartFeed] Invalid cursor, resetting feed');
        cursorRef.current = null;
        fetchPage(null, true);
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load smart feed');
        return;
      }

      const newPosts: SmartFeedPost[] = data.data ?? [];
      const pagination: SmartFeedPagination = data.pagination;

      setPosts(prev => (reset ? newPosts : [...prev, ...newPosts]));
      cursorRef.current = pagination.nextCursor;
      setHasMore(pagination.hasMore);
      setAllCaughtUp(pagination.allCaughtUp);
      setAllCaughtUpMessage(pagination.message);
    } catch (err) {
      setError('Network error');
      console.error('[useSmartFeed] fetch error:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  /** Call this once when switching to the "For You" tab. */
  const loadInitial = useCallback(() => {
    cursorRef.current = null;
    setAllCaughtUp(false);
    setAllCaughtUpMessage(null);
    setHasMore(true);
    setPosts([]);
    setError(null);
    loadingRef.current = false;
    fetchPage(null, true);
  }, [fetchPage]);

  /** Call this when the sentinel div scrolls into view. */
  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || allCaughtUp) return;
    fetchPage(cursorRef.current, false);
  }, [hasMore, allCaughtUp, fetchPage]);

  return {
    posts,
    loading,
    error,
    hasMore,
    allCaughtUp,
    allCaughtUpMessage,
    loadInitial,
    loadMore,
  };
}
