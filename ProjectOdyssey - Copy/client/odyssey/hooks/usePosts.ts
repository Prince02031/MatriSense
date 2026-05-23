import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000/api';

export interface ReviewData {
  reviewId: string | null;
  placeName: string;
  placeType: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  visitDate: string | null;
}

export interface Post {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  type: 'blog' | 'auto' | 'review';
  content: any; // BlockNote JSON structure
  images?: string[];
  tripId?: string;
  tripName?: string;
  tripProgress?: {
    locations: Array<{
      name: string;
      placeId: string;
      visitedAt: Date;
      photos: string[];
      isCurrentLocation: boolean;
    }>;
    currentLocationName: string;
    totalLocations: number;
    completionPercentage: number;
  };
  likesCount: number;
  commentsCount: number;
  reviewData?: ReviewData;
  isLiked?: boolean;
  /** Populated by the smart feed endpoint only */
  _feedSource?: 'friends' | 'trending';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  type: 'blog' | 'auto' | 'review';
  content?: any;
  images?: string[];
  tripId?: string;
  tripName?: string;
  tripProgress?: {
    locations: Array<{
      name: string;
      placeId: string;
      visitedAt: string;
      photos: string[];
      isCurrentLocation: boolean;
    }>;
    currentLocationName: string;
    totalLocations: number;
    completionPercentage: number;
  };
  reviewData?: ReviewData;
}

export function usePosts(limit: number = 10) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (reset: boolean = false) => {
    try {
      setLoading(true);
      const url = reset || !cursor
        ? `${API_URL}/posts?limit=${limit}`
        : `${API_URL}/posts?limit=${limit}&cursor=${cursor}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setPosts(reset ? data.data : [...posts, ...data.data]);
        setCursor(data.pagination?.nextCursor || null);
        setHasMore(data.pagination?.hasMore || false);
      } else {
        setError(data.message || 'Failed to fetch posts');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(false);
    }
  };

  const refresh = () => {
    fetchPosts(true);
  };

  return { posts, loading, error, hasMore, loadMore, refresh };
}

export function usePost(postId: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/posts/${postId}`);
        const data = await res.json();

        if (data.success) {
          setPost(data.data);
        } else {
          setError(data.message || 'Failed to fetch post');
        }
      } catch (err) {
        setError('Network error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  return { post, loading, error };
}

export function useUserPosts(userId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/posts/user/${userId}`);
        const data = await res.json();

        if (data.success) {
          setPosts(data.data);
        } else {
          setError(data.message || 'Failed to fetch user posts');
        }
      } catch (err) {
        setError('Network error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

  return { posts, loading, error };
}

export async function createPost(postData: CreatePostData): Promise<{ success: boolean; data?: Post; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    });

    const data = await res.json();
    return { success: data.success, data: data.data, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function updatePost(postId: string, postData: Partial<CreatePostData>): Promise<{ success: boolean; data?: Post; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    });

    const data = await res.json();
    return { success: data.success, data: data.data, error: data.message };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch(`${API_URL}/posts/${postId}`, {
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
