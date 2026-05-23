import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

export function useSavedStatus(postId: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!postId) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsSaved(false);
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/saved-posts/check/${postId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setIsSaved(data.isSaved);
        }
      } catch (err) {
        console.error('Error checking saved status:', err);
        setIsSaved(false);
      } finally {
        setLoading(false);
      }
    };

    checkSavedStatus();
  }, [postId, refetchTrigger]);

  return { isSaved, setIsSaved, loading, refetch };
}

export async function toggleSavePost(postId: string): Promise<{ success: boolean; saved?: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    // First check if it's already saved
    const checkRes = await fetch(`${API_URL}/saved-posts/check/${postId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const checkData = await checkRes.json();
    const isSaved = checkData.isSaved;

    // Toggle save/unsave
    const method = isSaved ? 'DELETE' : 'POST';
    const res = await fetch(`${API_URL}/saved-posts/${postId}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return { success: true, saved: !isSaved };
    } else {
      return { success: false, error: data.error || 'Failed to toggle save' };
    }
  } catch (err) {
    console.error('Error toggling save:', err);
    return { success: false, error: 'Network error' };
  }
}

export async function fetchSavedPosts(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/saved-posts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error || 'Failed to fetch saved posts' };
    }
  } catch (err) {
    console.error('Error fetching saved posts:', err);
    return { success: false, error: 'Network error' };
  }
}
