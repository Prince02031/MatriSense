import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

// ── API helpers (call anywhere) ────────────────────────────────────────────

export async function followUser(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/follow/${targetUserId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 409) return { success: false, error: 'already_following' };
    return { success: !!data.success, error: data.error };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function unfollowUser(
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/follow/${targetUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function checkFollowStatus(targetUserId: string): Promise<boolean> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/follow/check/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data.isFollowing ?? false;
  } catch {
    return false;
  }
}

export async function getFollowStats(
  userId: string,
): Promise<{ followersCount: number; followingCount: number }> {
  try {
    const res = await fetch(`${API_URL}/follow/stats/${userId}`);
    const data = await res.json();
    return data.data ?? { followersCount: 0, followingCount: 0 };
  } catch {
    return { followersCount: 0, followingCount: 0 };
  }
}

// ── React hooks ────────────────────────────────────────────────────────────

/**
 * Returns live follow stats for any user (no auth required).
 * @param userId - The user ID to fetch stats for
 * @param refreshKey - Optional key to force refresh when changed
 */
export function useFollowStats(userId: string | null, refreshKey?: any) {
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const stats = await getFollowStats(userId);
      setFollowersCount(stats.followersCount);
      setFollowingCount(stats.followingCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [userId, refreshKey]);

  return { followersCount, followingCount, loading, refresh };
}

/**
 * Provides the follow/unfollow toggle state for a target user.
 *
 * - Does NOT render if targetUserId equals the current user's own ID
 *   (caller should check `isSelf` and hide the button accordingly).
 * - initialState: If provided, skips the initial follow status check (useful when profile already provides isFollowing)
 */
export function useFollowButton(targetUserId: string | null, initialState?: boolean) {
  const [isFollowing, setIsFollowing] = useState(initialState ?? false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(initialState !== undefined);
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    if (!targetUserId) {
      setChecked(true);
      return;
    }

    const currentUserId = localStorage.getItem('userId');

    if (!currentUserId) {
      setChecked(true);
      return;
    }

    if (currentUserId === targetUserId) {
      setIsSelf(true);
      setChecked(true);
      return;
    }

    // Skip check if initialState was provided
    if (initialState !== undefined) {
      setIsSelf(false);
      setChecked(true);
      return;
    }

    setIsSelf(false);
    checkFollowStatus(targetUserId).then(status => {
      setIsFollowing(status);
      setChecked(true);
    });
  }, [targetUserId, initialState]);

  const toggle = async () => {
    if (!targetUserId || loading || isSelf) return;

    const prev = isFollowing;
    setLoading(true);
    setIsFollowing(!prev); // optimistic update

    try {
      const result = prev
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);

      if (!result.success && result.error !== 'already_following') {
        setIsFollowing(prev); // revert on failure
      } else if (result.error === 'already_following') {
        setIsFollowing(true); // sync to server truth
      }
    } catch {
      setIsFollowing(prev);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, loading, checked, isSelf, toggle };
}
