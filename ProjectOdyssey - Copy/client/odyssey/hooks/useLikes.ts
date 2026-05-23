import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

export interface LikeUser {
  _id: string;
  username: string;
  email: string;
}

export function useLikeStatus(postId: string) {
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!postId) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLiked(false);
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/likes/${postId}/check`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setIsLiked(data.liked);
        }
      } catch (err) {
        console.error('Error checking like status:', err);
        setIsLiked(false);
      } finally {
        setLoading(false);
      }
    };

    checkLikeStatus();
  }, [postId, refetchTrigger]); // Refetch when postId changes OR when refetch is triggered

  return { isLiked, setIsLiked, loading, refetch };
}

export function useLikesList(postId: string, limit: number = 20) {
  const [users, setUsers] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/likes/${postId}?limit=${limit}&skip=0`);
        const data = await res.json();

        if (data.success) {
          setUsers(data.data);
        } else {
          setError(data.message || 'Failed to fetch likes');
        }
      } catch (err) {
        setError('Network error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, [postId]);

  return { users, loading, error };
}

export async function toggleLike(postId: string): Promise<{ success: boolean; liked?: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/likes/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return { success: data.success, liked: data.liked, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function unlikePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/likes/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return { success: data.success, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}
