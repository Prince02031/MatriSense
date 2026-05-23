# User Search & Public Profile — Frontend Implementation Guide

**For:** Alfi (Frontend Developer)  
**Backend Author:** Saad  
**Feature:** Search for users + View public profiles + Follow from profile  
**Base URL:** `http://localhost:4000` (dev)

---

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Interfaces](#typescript-interfaces)
3. [Search Users](#search-users)
   - [API Reference](#search-api-reference)
   - [Search Component](#search-component)
4. [Public Profile Page](#public-profile-page)
   - [API Reference](#profile-api-reference)
   - [Privacy States](#privacy-states)
   - [Profile Page Component](#profile-page-component)
5. [Combining with Follow Button](#combining-with-follow-button)
6. [Edge Cases](#edge-cases)

---

## Overview

Two new endpoints have been added under `/api/users`:

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/users/search?q=term` | Search users by username or displayName | Optional |
| `GET /api/users/:userId` | Full public profile with stats + recent posts | Optional |

**"Optional auth"** means:
- Without a token → works fine, but `isFollowing` is always `false`
- With a valid token → adds `isFollowing` to every result so the Follow button renders correctly immediately

---

## TypeScript Interfaces

Add to your shared `lib/types.ts`:

```typescript
// ─── Search ────────────────────────────────────────────────────────────────

export interface UserSearchResult {
  _id:          string;
  username:     string;
  displayName:  string;
  profileImage: string;
  isPrivate:    boolean;
  // only present when isPrivate === false:
  bio?:         string;
  travelStyle?: string[];
  xp?:          number;
  level?:       number;
  isFollowing?: boolean;
}

export interface UserSearchResponse {
  success: boolean;
  count:   number;
  data:    UserSearchResult[];
}

// ─── Public Profile ────────────────────────────────────────────────────────

export interface ProfileStats {
  followersCount: number;
  followingCount: number;
  postsCount:     number;
}

export interface PublicProfile {
  _id:          string;
  username:     string;
  displayName:  string;
  profileImage: string;
  coverImage?:  string;
  bio?:         string;
  travelStyle?: string[];
  xp?:          number;
  level?:       number;
  isPrivate:    boolean;
  isOwnProfile: boolean;
  isFollowing:  boolean;
  // only when isPrivate === false:
  stats?:       ProfileStats;
  recentPosts?: FeedPost[];    // last 6, uses same FeedPost type as feed
  privacy?: {
    publicProfile:       boolean;
    showTripHistory:     boolean;
    showReviewsPublicly: boolean;
  };
}

export interface PublicProfileResponse {
  success: boolean;
  data:    PublicProfile;
}
```

---

## Search Users

### Search API Reference

```
GET /api/users/search?q=<term>&limit=<n>
Authorization: Bearer <token>   (optional — adds isFollowing to results)

Query params:
  q      required   Search string matched against username AND displayName
  limit  optional   Max results (default 10, max 20)
```

**Example — search for "alfi":**
```
GET /api/users/search?q=alfi
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64a1...",
      "username": "alfi",
      "displayName": "Alfi Rahman",
      "profileImage": "https://...",
      "bio": "Explorer. Coffee addict.",
      "travelStyle": ["Adventure", "Budget"],
      "xp": 1200,
      "level": 5,
      "isPrivate": false,
      "isFollowing": false
    },
    {
      "_id": "64b2...",
      "username": "alfirocks",
      "displayName": "Alfi (private)",
      "profileImage": "https://...",
      "isPrivate": true
    }
  ]
}
```

Private profiles appear in results but only show name + avatar — no follow button, clicking goes to a "This profile is private" page.

---

### Search Component

```tsx
// components/UserSearch.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { UserSearchResult } from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Props {
  token?: string;   // pass if user is logged in
}

export default function UserSearch({ token }: Props) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }

    // Debounce — wait 350ms after user stops typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res  = await fetch(`${BASE}/api/users/search?q=${encodeURIComponent(query)}&limit=8`, { headers });
        const json = await res.json();
        setResults(json.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, token]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        placeholder="Search users..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="input input-bordered w-full"
      />

      {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}

      {results.length > 0 && (
        <ul className="absolute z-50 w-full bg-base-100 border rounded-lg shadow-lg mt-1">
          {results.map(user => (
            <li
              key={user._id}
              className="flex items-center gap-3 p-3 hover:bg-base-200 cursor-pointer"
              onClick={() => router.push(`/profile/${user._id}`)}
            >
              <img
                src={user.profileImage}
                alt={user.username}
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.displayName}</p>
                <p className="text-xs text-gray-400">@{user.username}</p>
              </div>

              {user.isPrivate && (
                <span className="text-xs text-gray-400">🔒 Private</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Public Profile Page

### Profile API Reference

```
GET /api/users/:userId
Authorization: Bearer <token>   (optional — adds isFollowing + isOwnProfile)
```

**Response for a public profile (logged-in viewer):**
```json
{
  "success": true,
  "data": {
    "_id": "64a1...",
    "username": "alfi",
    "displayName": "Alfi Rahman",
    "profileImage": "https://...",
    "coverImage":   "https://...",
    "bio": "Explorer. Coffee addict.",
    "travelStyle": ["Adventure", "Budget"],
    "xp": 1200,
    "level": 5,
    "isPrivate":    false,
    "isOwnProfile": false,
    "isFollowing":  false,
    "stats": {
      "followersCount": 42,
      "followingCount": 8,
      "postsCount": 17
    },
    "recentPosts": [ ...up to 6 posts... ]
  }
}
```

**Response for a private profile:**
```json
{
  "success": true,
  "data": {
    "_id": "64b2...",
    "username": "alfred",
    "displayName": "Alfred (private)",
    "profileImage": "https://...",
    "isPrivate":    true,
    "isOwnProfile": false,
    "isFollowing":  false
  }
}
```

**Response when viewing own profile:**
```json
{
  "data": {
    ...full profile...,
    "isOwnProfile": true,
    "isFollowing":  false,
    "recentPosts": [ ...always shown, ignores showTripHistory... ]
  }
}
```

---

### Privacy States

Your profile page needs to handle **three states**:

| State | Condition | What to show |
|-------|-----------|-------------|
| **Own profile** | `isOwnProfile === true` | Full info + Edit button instead of Follow |
| **Public profile** | `isPrivate === false` | Full info + Follow/Unfollow button + stats + posts |
| **Private profile** | `isPrivate === true` | Avatar + name + "This account is private" |

Also check `recentPosts.length === 0` — even on a public profile, if `showTripHistory` is `false`, the server returns an empty array.

---

### Profile Page Component

```tsx
// app/profile/[userId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import FollowButton from '@/components/FollowButton';
import PostCard from '@/components/PostCard';
import type { PublicProfile } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { token }  = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${BASE}/api/users/${userId}`, { headers })
      .then(r => r.json())
      .then(json => {
        if (json.success) setProfile(json.data);
        else setError(json.error ?? 'Failed to load profile');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner" /></div>;
  if (error)   return <p className="text-center py-20 text-error">{error}</p>;
  if (!profile) return null;

  // ── Private profile ───────────────────────────────────────────────────────
  if (profile.isPrivate) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <img src={profile.profileImage} className="w-24 h-24 rounded-full mx-auto mb-4" />
        <h2 className="text-xl font-bold">{profile.displayName}</h2>
        <p className="text-gray-400">@{profile.username}</p>
        <p className="mt-6 text-gray-500">🔒 This account is private</p>
      </div>
    );
  }

  // ── Public / Own profile ──────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover image */}
      <div
        className="h-48 bg-cover bg-center rounded-b-2xl"
        style={{ backgroundImage: `url(${profile.coverImage})` }}
      />

      {/* Avatar + action */}
      <div className="flex items-end justify-between px-4 -mt-12 mb-4">
        <img src={profile.profileImage} className="w-24 h-24 rounded-full border-4 border-base-100 object-cover" />
        <div className="mb-2">
          {profile.isOwnProfile ? (
            <a href="/settings" className="btn btn-outline btn-sm">Edit Profile</a>
          ) : token ? (
            <FollowButton targetUserId={profile._id} token={token} />
          ) : (
            <a href="/login" className="btn btn-primary btn-sm">Login to Follow</a>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="px-4 mb-6">
        <h1 className="text-xl font-bold">{profile.displayName}</h1>
        <p className="text-gray-400 text-sm">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        {profile.travelStyle?.length ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.travelStyle.map(tag => (
              <span key={tag} className="badge badge-outline text-xs">{tag}</span>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-gray-400 mt-1">⚡ Level {profile.level} · {profile.xp} XP</p>
      </div>

      {/* Stats */}
      {profile.stats && (
        <div className="flex justify-around border-y py-3 px-4 mb-6 text-center">
          <div>
            <p className="text-lg font-bold">{profile.stats.postsCount}</p>
            <p className="text-xs text-gray-400">Posts</p>
          </div>
          <div>
            <p className="text-lg font-bold">{profile.stats.followersCount}</p>
            <p className="text-xs text-gray-400">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold">{profile.stats.followingCount}</p>
            <p className="text-xs text-gray-400">Following</p>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div className="px-4 space-y-4">
        <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Recent Posts</h3>
        {profile.recentPosts?.length ? (
          profile.recentPosts.map(post => <PostCard key={post._id} post={post} />)
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">No posts yet</p>
        )}
      </div>
    </div>
  );
}
```

---

## Combining with Follow Button

When Ekanto views Alfi's profile:
1. `GET /api/users/:alfiId` returns `isFollowing: false` (or `true` if already following)
2. Render `<FollowButton>` — it does **not** need to call `GET /follow/check` again, because the profile response already has `isFollowing`
3. To skip the redundant check on mount, pass `initialState` to `FollowButton`:

```tsx
// Updated FollowButton with initialState prop
interface Props {
  targetUserId:  string;
  token:         string;
  initialState?: boolean;   // ← pass profile.isFollowing here
}

export default function FollowButton({ targetUserId, token, initialState }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialState ?? false);
  const [loading, setLoading]         = useState(initialState === undefined); // check only if unknown

  useEffect(() => {
    if (initialState !== undefined) return; // already know the state
    fetch(`/api/follow/check/${targetUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setIsFollowing(data.isFollowing))
      .finally(() => setLoading(false));
  }, [targetUserId, token, initialState]);
  
  // ... rest unchanged
}
```

Usage in the profile page:
```tsx
<FollowButton
  targetUserId={profile._id}
  token={token}
  initialState={profile.isFollowing}   // no extra API call needed
/>
```

---

## Edge Cases

| Scenario | Backend | Frontend |
|----------|---------|----------|
| User not found | `404 { error: "User not found" }` | Show "User not found" page |
| Private profile | Returns minimal stub with `isPrivate: true` | Show "🔒 This account is private" |
| Own profile | `isOwnProfile: true`, `recentPosts` always filled | Show Edit button, hide Follow button |
| `showTripHistory: false` | `recentPosts: []` | Show "No posts yet" — don't assume the user never posted |
| Not logged in | `isFollowing: false` always | Show "Login to Follow" button |
| Empty search query | `400 { error: "Search query 'q' is required" }` | Don't call the API with empty string |
| No search results | `{ count: 0, data: [] }` | Show "No users found for '...'" |
