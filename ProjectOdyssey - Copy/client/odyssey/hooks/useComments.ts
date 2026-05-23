import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

export interface Comment {
  _id: string;
  postId: string;
  userId: {
    _id: string;
    username: string;
    email: string;
  };
  text: string;
  createdAt: string;
}

export function useComments(postId: string, limit: number = 20) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/comments/${postId}?limit=${limit}&skip=0`);
      const data = await res.json();

      if (data.success) {
        setComments(data.data);
      } else {
        setError(data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const refresh = () => {
    fetchComments();
  };

  return { comments, loading, error, refresh };
}

export async function addComment(postId: string, text: string): Promise<{ success: boolean; data?: Comment; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ postId, text }),
    });

    const data = await res.json();
    return { success: data.success, data: data.data, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function updateComment(commentId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    return { success: data.success, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/comments/${commentId}`, {
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
