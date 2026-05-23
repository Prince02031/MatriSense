import { useState, useEffect, useCallback } from "react";

const API_URL = 'http://localhost:4000/api';

export interface Notification {
  _id: string;
  actorId: {
    _id: string;
    username: string;
    displayName: string;
    profileImage: string;
  } | string | null;
  type: "like" | "comment" | "follow";
  postId: {
    _id: string;
    type: string;
    content: string;
    mediaUrls: string[];
  } | string | null;
  commentId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch full list (call when opening the dropdown)
  const fetchNotifications = useCallback(async (options?: { unreadOnly?: boolean }) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", skip: "0" });
      if (options?.unreadOnly) params.set("unread", "true");

      const res = await fetch(`${API_URL}/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data: NotificationsResponse = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Lightweight badge polling every 45 seconds
  useEffect(() => {
    if (!token) return;
    
    const pollBadge = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setUnreadCount(data.count);
      } catch (error) {
        // Silent fail for polling
      }
    };

    pollBadge();
    const interval = setInterval(pollBadge, 45_000);
    return () => clearInterval(interval);
  }, [token]);

  const markRead = useCallback(async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [token]);

  const deleteOne = useCallback(async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id);
        if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [token]);

  const clearAll = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/notifications`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, [token]);

  return { 
    notifications, 
    unreadCount, 
    loading, 
    fetchNotifications, 
    markRead, 
    markAllRead, 
    deleteOne, 
    clearAll 
  };
}
