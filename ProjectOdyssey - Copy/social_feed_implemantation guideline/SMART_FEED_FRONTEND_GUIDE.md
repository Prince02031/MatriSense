# Smart Feed & Follow System — Frontend Implementation Guide

**For:** Alfi (Frontend Developer)  
**Backend Author:** Saad  
**Feature:** Personalised Feed + Follow/Unfollow Social Graph  
**Base URL:** `http://localhost:4000` (dev) — replace with production URL when deployed

---

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [Follow System](#follow-system)
   - [Follow Button Component](#follow-button-component)
   - [Follower / Following Counters](#follower--following-counters)
   - [Following / Followers List Pages](#following--followers-list-pages)
4. [Smart Feed](#smart-feed)
   - [How the Algorithm Works](#how-the-algorithm-works)
   - [API Reference](#api-reference)
   - [Infinite Scroll Implementation](#infinite-scroll-implementation)
   - ["You Are All Caught Up" State](#you-are-all-caught-up-state)
   - [Labelling Posts by Source](#labelling-posts-by-source)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Quick Visual Reference](#quick-visual-reference)

---

## Overview

Two new features have been added to the backend:

| Feature | What it does |
|---------|--------------|
| **Follow system** | Users can follow / unfollow each other. Following status is stored in MongoDB. |
| **Smart Feed** | `GET /api/posts/feed` returns a **cursor-paginated** mix of posts from people the user follows (60%) and globally trending posts (40%). The cursor enables smooth infinite scroll. When all posts are exhausted the API sends an `allCaughtUp: true` flag and a human-readable message. |

---

## TypeScript Interfaces

Add these to your shared types file (e.g. `lib/types.ts`).

```typescript
// ─── Follow ────────────────────────────────────────────────────────────────

export interface FollowStats {
  userId: string;
  followersCount: number;
  followingCount: number;
}

export interface FollowCheckResponse {
  isFollowing: boolean;
}

export interface FollowUser {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

// ─── Feed ──────────────────────────────────────────────────────────────────

export type FeedSource = 'friends' | 'trending';
export type PostType   = 'blog' | 'auto' | 'review';

export interface FeedPost {
  _id: string;
  authorId: string;
  authorUsername: string;
  type: PostType;
  content?: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  _feedSource: FeedSource;          // ← injected by the backend for labelling

  // present when type === 'review'
  reviewData?: {
    reviewId:  string | null;
    placeName: string;
    placeType: string;
    rating:    number;
    title:     string;
    comment:   string;
    images:    string[];
    visitDate: string | null;
  };
}

export interface FeedPageStats {
  friendsOnThisPage:  number;
  trendingOnThisPage: number;
  total:              number;
}

export interface FeedPagination {
  hasMore:    boolean;
  nextCursor: string | null;
  allCaughtUp: boolean;
  message:    string | null;   // "You are all caught up! Check back next time 🎉"
  page:       FeedPageStats;
}

export interface FeedResponse {
  success:    boolean;
  data:       FeedPost[];
  pagination: FeedPagination;
}
```

---

## Follow System

### Follow Button Component

The follow button needs to:
1. Check whether the current user already follows the target on mount.
2. Toggle follow / unfollow on click.
3. Give optimistic UI feedback.

```tsx
// components/FollowButton.tsx
'use client';

import { useState, useEffect } from 'react';

interface Props {
  targetUserId: string;
  token: string;               // JWT from your auth context
}

export default function FollowButton({ targetUserId, token }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── 1. Check status on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/follow/check/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setIsFollowing(data.isFollowing))
      .finally(() => setLoading(false));
  }, [targetUserId, token]);

  // ── 2. Toggle ─────────────────────────────────────────────────────────────
  const toggle = async () => {
    setLoading(true);
    const method = isFollowing ? 'DELETE' : 'POST';
    await fetch(`/api/follow/${targetUserId}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    setIsFollowing(prev => !prev);
    setLoading(false);
  };

  if (loading) return <button disabled className="btn btn-ghost">...</button>;

  return (
    <button
      onClick={toggle}
      className={isFollowing ? 'btn btn-outline' : 'btn btn-primary'}
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}
```

**Endpoints used:**

| Method | URL | Auth |
|--------|-----|------|
| `GET`    | `/api/follow/check/:userId`  | ✅ Required |
| `POST`   | `/api/follow/:userId`        | ✅ Required |
| `DELETE` | `/api/follow/:userId`        | ✅ Required |

---

### Follower / Following Counters

Display on any user profile card. This endpoint is **public** — no token needed.

```typescript
// lib/api/follow.ts
export async function getFollowStats(userId: string) {
  const res = await fetch(`/api/follow/stats/${userId}`);
  const json = await res.json();
  // json.data = { userId, followersCount, followingCount }
  return json.data as FollowStats;
}
```

```tsx
// inside a profile component
const stats = await getFollowStats(user._id);

<div className="flex gap-4">
  <span><strong>{stats.followersCount}</strong> Followers</span>
  <span><strong>{stats.followingCount}</strong> Following</span>
</div>
```

---

### Following / Followers List Pages

```typescript
// Get list of people I follow (auth required)
GET /api/follow/following
Authorization: Bearer <token>
// Returns: { success, count, data: FollowUser[] }

// Get list of people who follow me (auth required)
GET /api/follow/followers
Authorization: Bearer <token>
// Returns: { success, count, data: FollowUser[] }
```

Each user in `data` has: `_id`, `username`, `displayName`, `avatar`.

---

## Smart Feed

### How the Algorithm Works

```
Each page = 10 posts:
  ┌──────────────────────────┐
  │   6 posts from friends   │  (people you follow, newest first)
  │   4 posts trending       │  (highest likes + comments globally)
  └──────────────────────────┘
  Interleaved 3:2 → F F F T T  F F F T T  ...
```

- If you follow nobody, all 10 posts will be trending.  
- If trending runs dry, the extra slots are filled with more friend posts.  
- When there are genuinely no more posts in either bucket, the backend sets `allCaughtUp: true`.

---

### API Reference

```
GET /api/posts/feed
Authorization: Bearer <token>   (required)

Query Parameters:
  limit    number   Posts per page.  Default: 10.  Max: 20.
  cursor   string   Opaque base64 cursor returned by previous page.
                    Omit for first page.
```

**First page request:**
```
GET /api/posts/feed?limit=10
```

**Subsequent pages:**
```
GET /api/posts/feed?limit=10&cursor=<nextCursor from previous response>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "authorId": "...",
      "authorUsername": "alfi",
      "type": "blog",
      "content": "Just visited Tokyo!",
      "likesCount": 42,
      "commentsCount": 7,
      "createdAt": "2025-01-15T10:00:00Z",
      "_feedSource": "friends"
    },
    {
      "_id": "...",
      "type": "review",
      "_feedSource": "trending",
      "reviewData": {
        "placeName": "Eiffel Tower",
        "rating": 5,
        "title": "Absolutely stunning",
        "comment": "...",
        "images": ["https://..."]
      }
    }
    ...
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJmcmllbmRzU2tpcCI6NiwidHJlbmRpbmdTa2lwIjo0fQ==",
    "allCaughtUp": false,
    "message": null,
    "page": {
      "friendsOnThisPage": 6,
      "trendingOnThisPage": 4,
      "total": 10
    }
  }
}
```

**All caught up response (last page):**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "hasMore": false,
    "nextCursor": null,
    "allCaughtUp": true,
    "message": "You are all caught up! Check back next time 🎉",
    "page": { "friendsOnThisPage": 0, "trendingOnThisPage": 0, "total": 0 }
  }
}
```

---

### Infinite Scroll Implementation

Here is a complete React hook you can drop in:

```typescript
// hooks/useSmartFeed.ts
import { useState, useCallback, useRef } from 'react';
import type { FeedPost, FeedPagination } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchFeedPage(token: string, cursor?: string | null) {
  const params = new URLSearchParams({ limit: '10' });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`${BASE}/api/posts/feed?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Feed fetch failed');
  return res.json() as Promise<{ success: boolean; data: FeedPost[]; pagination: FeedPagination }>;
}

export function useSmartFeed(token: string) {
  const [posts, setPosts]           = useState<FeedPost[]>([]);
  const [loading, setLoading]       = useState(false);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [message, setMessage]       = useState<string | null>(null);
  const cursorRef                   = useRef<string | null>(null);
  const hasMoreRef                  = useRef(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMoreRef.current) return;

    setLoading(true);
    try {
      const json = await fetchFeedPage(token, cursorRef.current);
      setPosts(prev => [...prev, ...json.data]);

      const p = json.pagination;
      cursorRef.current = p.nextCursor;
      hasMoreRef.current = p.hasMore;

      if (p.allCaughtUp) {
        setAllCaughtUp(true);
        setMessage(p.message);
      }
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, loading]);

  const reset = useCallback(() => {
    setPosts([]);
    cursorRef.current  = null;
    hasMoreRef.current = true;
    setAllCaughtUp(false);
    setMessage(null);
  }, []);

  return { posts, loading, allCaughtUp, message, loadMore, reset };
}
```

Wire it up with `IntersectionObserver` for trigger-on-scroll:

```tsx
// app/feed/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSmartFeed } from '@/hooks/useSmartFeed';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/hooks/useAuth';   // your existing auth hook

export default function FeedPage() {
  const { token } = useAuth();
  const { posts, loading, allCaughtUp, message, loadMore } = useSmartFeed(token);

  // Sentinel div at the bottom triggers loadMore when it enters viewport
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMore(); // load first page on mount
  }, []);       // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !allCaughtUp) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, allCaughtUp, loadMore]);

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-4">
      {posts.map(post => (
        <PostCard key={post._id} post={post} />
      ))}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {/* All caught up */}
      {allCaughtUp && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {/* Invisible sentinel */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
```

---

### "You Are All Caught Up" State

Check `pagination.allCaughtUp === true` in the response. When `true`:

- `pagination.hasMore` will be `false`
- `pagination.nextCursor` will be `null`
- `pagination.message` will contain a ready-to-display string: `"You are all caught up! Check back next time 🎉"`
- `pagination.data` will be `[]`

Do **not** keep calling the API once `allCaughtUp` is `true` — there is nothing more to fetch. Use the `hasMoreRef` pattern shown above to gate further calls.

---

### Labelling Posts by Source

Every post in `data` has a `_feedSource` field: `"friends"` or `"trending"`.

You can use this to show a subtle label:

```tsx
// inside PostCard.tsx
{post._feedSource === 'friends' && (
  <span className="text-xs text-blue-500 font-medium">From someone you follow</span>
)}
{post._feedSource === 'trending' && (
  <span className="text-xs text-orange-400 font-medium">Trending</span>
)}
```

This field is **only** in the feed response — it is never stored in the database.

---

## Edge Cases & Error Handling

| Scenario | Backend behaviour | What to do on frontend |
|---|---|---|
| Invalid / corrupted cursor | `400 { error: "Invalid cursor" }` | Reset feed, reload from page 1 |
| Not authenticated | `401` | Redirect to login |
| User has no follows | Returns 100% trending posts | Normal — no change needed |
| Feed is empty (brand new app) | Returns `[]` with `allCaughtUp: true` | Show "No posts yet" state |
| Network error | `fetch` throws | Show a retry button |
| Following / unfollowing yourself | `400 { error: "You cannot follow yourself" }` | Hide the Follow button on own profile |
| Already following | `409 { error: "Already following" }` | Button state was wrong — sync it |

---

## Quick Visual Reference

```
┌─────────────────────────────────────────┐
│              FEED PAGE                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [From someone you follow]      │    │  ← _feedSource: "friends"
│  │  @alfi posted a review          │    │
│  │  ⭐⭐⭐⭐⭐  Eiffel Tower          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [Trending]                     │    │  ← _feedSource: "trending"
│  │  @stranger wrote a blog         │    │
│  └─────────────────────────────────┘    │
│                                         │
│        ... more posts ...               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🎉 You are all caught up!      │    │  ← allCaughtUp: true
│  │  Check back next time 🎉        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Questions?

Ask Saad about:  
- Follow route auth issues  
- Feed cursor problems  
- The `_feedSource` tag  

The backend server runs on **port 4000** in development.
