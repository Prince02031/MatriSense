# Notification Feature — Frontend Guide

**Audience:** Alfi (Frontend Dev)  
**Base URL:** `http://localhost:4000`  
**Auth:** All notification endpoints require a JWT in the `Authorization: Bearer <token>` header.

---

## 1. Overview

When User A likes or comments on User B's post, User B automatically receives a notification. Notifications let User B click through directly to that post — like Facebook's notification menu.

**What triggers a notification:**
| Action | Trigger | Self-notify? |
|---|---|---|
| Like | Someone likes your post | No (skipped) |
| Comment | Someone comments on your post | No (skipped) |

---

## 2. Data Shape

Every notification object returned by the API looks like this:

```typescript
interface Notification {
  _id: string;

  // Who performed the action — fully populated
  actorId: {
    _id: string;
    username: string;
    displayName: string;
    profileImage: string;
  };

  type: "like" | "comment";

  // The post that was liked/commented on — partially populated
  postId: {
    _id: string;
    type: string;
    content: string;
    mediaUrls: string[];
  } | string;   // may be just an ID if the post was deleted

  commentId: string | null;  // only present for "comment" type

  message: string;           // usually empty — build display text from actorId + type
  read: boolean;

  createdAt: string;         // ISO date string
  updatedAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;       // always present — use for the bell badge
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}
```

**Building the display text**  
Since `message` is often empty, build it on the frontend:

```typescript
function getNotificationText(n: Notification): string {
  const name = n.actorId?.displayName || n.actorId?.username || "Someone";
  if (n.type === "like")    return `${name} liked your post`;
  if (n.type === "comment") return `${name} commented on your post`;
  return "New activity on your post";
}
```

---

## 3. API Endpoints

### 3.1 — Get notifications (+ unread count for badge)

```
GET /api/notifications
```

| Query param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Items per page (max 50) |
| `skip` | number | 0 | Offset for pagination |
| `unread` | `"true"` | — | Pass to fetch only unread notifications |

**Response** — see `NotificationsResponse` above.  
Notifications are sorted: **unread first**, then **newest first**.

---

### 3.2 — Get unread count only (lightweight, for badge polling)

```
GET /api/notifications/unread-count
```

```json
{ "success": true, "count": 4 }
```

Use this endpoint for polling every 30–60 seconds to keep the bell badge fresh **without** fetching the full list.

---

### 3.3 — Mark one notification as read

```
PATCH /api/notifications/:id/read
```

Call this when the user **clicks** a notification.

```json
{ "success": true, "data": { ...updatedNotification } }
```

---

### 3.4 — Mark ALL as read

```
PATCH /api/notifications/read-all
```

```json
{ "success": true, "message": "All notifications marked as read" }
```

---

### 3.5 — Delete one notification

```
DELETE /api/notifications/:id
```

```json
{ "success": true, "message": "Notification deleted" }
```

---

### 3.6 — Clear all notifications

```
DELETE /api/notifications
```

```json
{ "success": true, "message": "5 notification(s) cleared" }
```

---

## 4. Suggested Hook: `useNotifications`

```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);

  // Fetch full list (call when opening the dropdown)
  const fetchNotifications = useCallback(async (options?: { unreadOnly?: boolean }) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", skip: "0" });
      if (options?.unreadOnly) params.set("unread", "true");

      const res = await fetch(`${API}/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Lightweight badge polling every 45 seconds
  useEffect(() => {
    if (!token) return;
    const pollBadge = async () => {
      try {
        const res  = await fetch(`${API}/api/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setUnreadCount(data.count);
      } catch { /* silent */ }
    };

    pollBadge();
    const interval = setInterval(pollBadge, 45_000);
    return () => clearInterval(interval);
  }, [token]);

  const markRead = useCallback(async (id: string) => {
    if (!token) return;
    await fetch(`${API}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await fetch(`${API}/api/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [token]);

  const deleteOne = useCallback(async (id: string) => {
    if (!token) return;
    await fetch(`${API}/api/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => {
      const removed = prev.find(n => n._id === id);
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n._id !== id);
    });
  }, [token]);

  const clearAll = useCallback(async () => {
    if (!token) return;
    await fetch(`${API}/api/notifications`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications([]);
    setUnreadCount(0);
  }, [token]);

  return { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, deleteOne, clearAll };
}
```

---

## 5. Notification Bell Component

```tsx
// components/NotificationBell.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";   // or any icon lib

function getNotificationText(n: any): string {
  const name = n.actorId?.displayName || n.actorId?.username || "Someone";
  if (n.type === "like")    return `${name} liked your post`;
  if (n.type === "comment") return `${name} commented on your post`;
  return "New activity on your post";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, clearAll } =
    useNotifications(token);

  const handleOpen = () => {
    setOpen(prev => {
      if (!prev) fetchNotifications(); // load list on first open
      return !prev;
    });
  };

  // Click a notification → mark read → navigate to post
  const handleClick = async (n: any) => {
    if (!n.read) await markRead(n._id);

    const postId = typeof n.postId === "object" ? n.postId?._id : n.postId;
    if (postId) router.push(`/feed?post=${postId}`);  // adjust route to your post page

    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Bell icon + badge */}
      <button onClick={handleOpen} className="relative p-2">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs
                           rounded-full min-w-[18px] h-[18px] flex items-center
                           justify-center px-1 font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800
                        shadow-xl rounded-xl border border-gray-200 dark:border-gray-700
                        z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b
                          border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                        className="text-xs text-blue-500 hover:underline">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll}
                        className="text-xs text-gray-400 hover:text-red-400">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-gray-400">Loading…</li>
            )}
            {!loading && notifications.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-400">
                No notifications yet
              </li>
            )}
            {notifications.map(n => (
              <li key={(n as any)._id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer
                              hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                              ${!(n as any).read ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>

                {/* Actor avatar */}
                <img src={(n as any).actorId?.profileImage}
                     alt={(n as any).actorId?.username}
                     className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />

                {/* Text + time */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
                    {getNotificationText(n)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo((n as any).createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!(n as any).read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Click-away overlay */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
```

---

## 6. Navigating to the Post

When the user clicks a notification the bell component calls `router.push(\`/feed?post=${postId}\`)`. Your feed page should read that query param and scroll / highlight the matching post.

```typescript
// In your feed page component
const searchParams = useSearchParams();
const highlightPostId = searchParams.get("post");

// Pass it down to post cards and add a highlight ring when _id matches
```

If you have a dedicated `/posts/[id]` route, you can navigate there directly:

```typescript
router.push(`/posts/${postId}`);
```

---

## 7. Where to Place the Bell

Drop `<NotificationBell token={token} />` in your top navigation bar next to the user avatar. Example:

```tsx
// In your Navbar / Header component
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth"; // however you expose the token

export default function Navbar() {
  const { token } = useAuth();
  return (
    <nav className="...">
      {/* other nav items */}
      {token && <NotificationBell token={token} />}
      {/* avatar menu */}
    </nav>
  );
}
```

---

## 8. Edge Cases

| Scenario | What happens |
|---|---|
| Actor deleted their account | `actorId` will be `null` — guard with `n.actorId?.username \|\| "Deleted user"` |
| Post was deleted | `postId` may be just an ID string, not a populated object — clicking will navigate to a page that shows "post not found" |
| Liker likes, then unlikes, then likes again | Only one like-notification per (actor, post) is ever stored — the upsert prevents duplicates |
| Same user comments multiple times | Each comment creates a new notification (by design — each comment is a separate event) |

---

## 9. Quick API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | ✅ | List notifications (with pagination + unreadCount) |
| GET | `/api/notifications/unread-count` | ✅ | Badge count only (lightweight polling) |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all as read |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark one as read |
| DELETE | `/api/notifications` | ✅ | Clear all |
| DELETE | `/api/notifications/:id` | ✅ | Delete one |
