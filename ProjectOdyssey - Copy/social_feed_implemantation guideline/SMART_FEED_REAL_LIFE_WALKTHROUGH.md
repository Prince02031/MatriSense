# Smart Feed & Follow System — Real Life Walkthrough
### "Ekanto Follows Alfi, Alfi Posts, and the Feed Knows What to Show"

---

## The Cast

| Person | Role | What they do in this story |
|--------|------|---------------------------|
| **Alfi** | Content creator | Posts trip blogs, writes reviews, shares to feed |
| **Ekanto** | Explorer / reader | Follows Alfi, scrolls the feed, discovers trending posts from strangers |
| **Stranger (Rafi)** | Random user | Alfi & Ekanto don't follow him, but his posts are trending |

---

## The Two Systems Working Together

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│           MONGODB               │    │        FOLLOW GRAPH             │
│                                 │    │                                 │
│  posts collection               │    │  follows collection             │
│  comments collection            │    │  { followerId, followingId }    │
│  likes collection               │    │                                 │
│  users collection               │    │  Ekanto ──follows──▶ Alfi      │
└─────────────────────────────────┘    └─────────────────────────────────┘
       "What to show in the feed"            "Who to prioritise"
```

The feed algorithm reads the follows collection first to find who Ekanto cares about,
then builds a personalised page of 10 posts — 6 from friends, 4 trending.

---

## Phase 1 — Ekanto Follows Alfi

### Step 1 — Ekanto opens Alfi's profile page

He's on `/profile/alfi` in the browser.

**Frontend calls (public — no token needed):**
```
GET http://localhost:4000/api/follow/stats/<alfi_user_id>
```

**Server queries MongoDB:**
```javascript
const followers = await Follow.countDocuments({ followingId: alfiId });
const following  = await Follow.countDocuments({ followerId:  alfiId });
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "64a1f3b2c9e4d500001a2b3c",
    "followersCount": 41,
    "followingCount": 8
  }
}
```

Alfi's profile shows **41 Followers · 8 Following**.

---

### Step 2 — Frontend checks if Ekanto already follows Alfi

When the profile page mounts it auto-checks so the button says "Follow" or "Unfollow".

**Frontend calls (Ekanto's token):**
```
GET http://localhost:4000/api/follow/check/<alfi_user_id>
Authorization: Bearer <ekanto_jwt>
```

**Server queries MongoDB:**
```javascript
const existing = await Follow.findOne({
  followerId:  ekanto._id,
  followingId: alfi._id
});
return { isFollowing: !!existing };
```

**Response (Ekanto hasn't followed yet):**
```json
{ "isFollowing": false }
```

The button renders as **"Follow"** (filled/primary style).

---

### Step 3 — Ekanto clicks Follow

**Frontend calls:**
```
POST http://localhost:4000/api/follow/<alfi_user_id>
Authorization: Bearer <ekanto_jwt>
```

**Server does:**
```javascript
// Guard: can't follow yourself
if (ekanto._id.equals(alfi._id)) return res.status(400).json({ error: "You cannot follow yourself" });

// Guard: already following?
const existing = await Follow.findOne({ followerId: ekanto._id, followingId: alfi._id });
if (existing) return res.status(409).json({ error: "Already following this user" });

// Create the relationship
await Follow.create({ followerId: ekanto._id, followingId: alfi._id });
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Now following this user",
  "data": {
    "_id": "64b2...",
    "followerId":  "64b1... (Ekanto's ID)",
    "followingId": "64a1... (Alfi's ID)",
    "createdAt": "2026-03-01T09:00:00Z"
  }
}
```

The button flips to **"Unfollow"** (outline/secondary style). Alfi now has **42 followers**.

---

## Phase 2 — Alfi Creates Content

### Step 4 — Alfi posts a trip blog

Alfi just got back from Sundarbans. He writes a blog post.

**Frontend calls:**
```
POST http://localhost:4000/api/posts
Authorization: Bearer <alfi_jwt>
Content-Type: application/json

{
  "type": "blog",
  "content": "Just spent 3 days in Sundarbans. The tigers are real and the silence at night is unlike anything I have experienced. 10/10 would go again.",
  "images": ["https://cdn.odyssey.app/alfi/sundarbans1.jpg"]
}
```

**MongoDB document created:**
```json
{
  "_id": "64c1a2b3...",
  "authorId": "64a1f3b2... (Alfi)",
  "authorUsername": "alfi",
  "type": "blog",
  "content": "Just spent 3 days in Sundarbans...",
  "images": ["..."],
  "likesCount": 0,
  "commentsCount": 0,
  "createdAt": "2026-03-01T10:00:00Z"
}
```

---

### Step 5 — Alfi also writes a review and shares it to feed

He reviews the Sundarbans resort he stayed at.

**Frontend calls (with shareToFeed flag):**
```
POST http://localhost:4000/api/reviews
Authorization: Bearer <alfi_jwt>
Content-Type: application/json

{
  "place_id": "ChIJsundar123",
  "place_name": "Tiger's Den Resort, Sundarbans",
  "place_type": "POI",
  "rating": 5,
  "title": "Best wildlife stay in Bangladesh",
  "comment": "Woke up at 5am to hear tigers. Staff are incredible. The boat tour at dawn was magical.",
  "shareToFeed": true
}
```

**What happens on the server — two operations in sequence:**

1. **Supabase** — stores the real review permanently:
```sql
INSERT INTO reviews (user_id, place_id, place_name, rating, title, comment, ...)
VALUES ('alfi-supabase-uuid', 'ChIJsundar123', 'Tiger''s Den Resort', 5, 'Best wildlife stay...', ...)
RETURNING *
```

2. **MongoDB** — creates a feed post of type `"review"`:
```javascript
await Post.create({
  authorId: alfi._id,
  authorUsername: 'alfi',
  type: 'review',
  reviewData: {
    reviewId:  'supa-uuid-from-step1',  // links back to Supabase
    placeName: "Tiger's Den Resort, Sundarbans",
    placeType: 'POI',
    rating:    5,
    title:     'Best wildlife stay in Bangladesh',
    comment:   'Woke up at 5am to hear tigers...',
    images:    []
  }
});
```

**Response contains both:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "place_name": "Tiger's Den Resort, Sundarbans",
    "rating": 5,
    "title": "Best wildlife stay in Bangladesh"
  },
  "feedPost": {
    "_id": "64c1b2c3...",
    "type": "review",
    "authorUsername": "alfi",
    "reviewData": { "placeName": "Tiger's Den Resort, Sundarbans", "rating": 5, ... }
  },
  "message": "Review created and shared to feed"
}
```

---

### Step 6 — Meanwhile, Rafi (a stranger) posts too

Rafi is someone neither Alfi nor Ekanto follows. But Rafi's post about Paris has gone viral —
it already has **340 likes** and **82 comments**.

His post exists in MongoDB as:
```json
{
  "_id": "64c2d3e4...",
  "authorUsername": "rafi",
  "type": "blog",
  "content": "Paris in winter is criminally underrated.",
  "likesCount": 340,
  "commentsCount": 82
}
```

---

## Phase 3 — Ekanto Opens the Feed

### Step 7 — First page load (no cursor)

Ekanto taps the Feed tab. The frontend fires the first request with no cursor.

**Frontend calls:**
```
GET http://localhost:4000/api/posts/feed?limit=10
Authorization: Bearer <ekanto_jwt>
```

**What the server does — step by step:**

```
Step A: decode cursor → no cursor → { friendsSkip: 0, trendingSkip: 0 }

Step B: calculate targets
        FRIENDS_TARGET  = ceil(10 × 0.6) = 6
        TRENDING_TARGET = 10 - 6         = 4

Step C: find who Ekanto follows
        Follow.find({ followerId: ekanto._id }) → [ { followingId: alfi._id } ]
        followingIds = [ alfi._id ]

Step D: fetch friend posts (newest first)
        Post.find({ authorId: { $in: [alfi._id] } })
            .sort({ createdAt: -1 })
            .skip(0)
            .limit(10)    ← 6 target + 4 buffer
        → returns 2 posts (Alfi's blog + Alfi's review share)
        friendsTaken = 2  (less than 6 target → gap = 4)

Step E: fill the gap with more trending
        trendingTarget = 4 + 4 (gap) = 8

Step F: fetch trending posts
        Post.find({
          authorId: { $nin: [alfi._id, ekanto._id] }   ← exclude friends + self
        })
        .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
        .skip(0)
        .limit(12)   ← 8 target + 4 buffer
        → returns Rafi's post + 7 other trending posts

Step G: interleave (3 friends : 2 trending)
        Slot 1: friend  → Alfi's blog post
        Slot 2: friend  → Alfi's review (Tiger's Den)
        Slot 3: friend  → (none left, pull from trending instead)
        Slot 4: trending → Rafi's Paris post
        Slot 5: trending → another trending
        ...continues until 10 slots filled

Step H: build cursor
        nextCursor = base64({
          friendsSkip: 0 + 2 = 2,   ← 2 friend posts consumed
          trendingSkip: 0 + 8 = 8   ← 8 trending consumed
        })
```

**Response Ekanto's app receives:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64c1a2b3",
      "authorUsername": "alfi",
      "type": "blog",
      "content": "Just spent 3 days in Sundarbans...",
      "_feedSource": "friends"
    },
    {
      "_id": "64c1b2c3",
      "authorUsername": "alfi",
      "type": "review",
      "reviewData": { "placeName": "Tiger's Den Resort", "rating": 5, ... },
      "_feedSource": "friends"
    },
    {
      "_id": "64c2d3e4",
      "authorUsername": "rafi",
      "type": "blog",
      "content": "Paris in winter is criminally underrated.",
      "likesCount": 340,
      "_feedSource": "trending"
    },
    ...7 more trending posts
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJmcmllbmRzU2tpcCI6MiwidHJlbmRpbmdTa2lwIjo4fQ==",
    "allCaughtUp": false,
    "message": null,
    "page": {
      "friendsOnThisPage": 2,
      "trendingOnThisPage": 8,
      "total": 10
    }
  }
}
```

**What Ekanto sees in the UI:**
```
┌──────────────────────────────────────┐
│  [From someone you follow]           │
│  alfi  ·  Just now                   │
│  "Just spent 3 days in Sundarbans..."│
│  ❤️ 0  💬 0                          │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  [From someone you follow]           │
│  alfi  ·  Just now                   │
│  ⭐⭐⭐⭐⭐  Tiger's Den Resort         │
│  "Best wildlife stay in Bangladesh"  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  [Trending]                          │
│  rafi  ·  2 days ago                 │
│  "Paris in winter is criminally..."  │
│  ❤️ 340  💬 82                       │
└──────────────────────────────────────┘
... 7 more trending posts
```

---

### Step 8 — Ekanto scrolls to the bottom (Page 2)

The IntersectionObserver fires when the sentinel div enters the viewport.

**Frontend calls:**
```
GET http://localhost:4000/api/posts/feed?limit=10&cursor=eyJmcmllbmRzU2tpcCI6MiwidHJlbmRpbmdTa2lwIjo4fQ==
Authorization: Bearer <ekanto_jwt>
```

**Server decodes cursor:**
```javascript
const { friendsSkip: 2, trendingSkip: 8 } = JSON.parse(Buffer.from(cursor, 'base64').toString());
```

**What the server does:**
```
Step A: friendsSkip = 2 → skip the 2 Alfi posts already seen
        fetch friend posts → Post.find(...).skip(2) → returns 0 (Alfi has no more posts)
        friendsTaken = 0  →  gap = 6

Step B: trendingSkip = 8 → skip the 8 slugs already seen
        trendingTarget = 4 + 6 (gap) = 10
        fetch trending → returns whatever posts come after the first 8
        trendingTaken = whatever is left
```

If there are 5 more trending posts:
```json
{
  "data": [ ...5 trending posts... ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "eyJmcmllbmRzU2tpcCI6MiwidHJlbmRpbmdTa2lwIjoxM31=",
    "allCaughtUp": false,
    "page": { "friendsOnThisPage": 0, "trendingOnThisPage": 5, "total": 5 }
  }
}
```

---

### Step 9 — Ekanto reaches the very end

**Frontend calls:**
```
GET http://localhost:4000/api/posts/feed?limit=10&cursor=<cursor_from_page2>
Authorization: Bearer <ekanto_jwt>
```

The server tries to fetch friend posts → **0 results** (Alfi has no new posts).  
The server tries to fetch trending posts → **0 results** (all trending already shown).

**Response:**
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

**Frontend behaviour:**
- `hasMoreRef.current = false` → stops all future scroll-triggered calls
- Renders the "all caught up" UI

**What Ekanto sees:**
```
┌──────────────────────────────────────┐
│               🎉                    │
│     You are all caught up!           │
│     Check back next time 🎉          │
└──────────────────────────────────────┘
```

---

## Phase 4 — Edge Cases in Real Life

### What if Ekanto tries to follow himself?

```
POST http://localhost:4000/api/follow/<ekanto_user_id>
Authorization: Bearer <ekanto_jwt>
```

**Response (400):**
```json
{ "error": "You cannot follow yourself" }
```

The frontend should hide the Follow button entirely on the logged-in user's own profile.

---

### What if Ekanto's app glitches and fires the follow request twice?

The MongoDB schema has a **compound unique index** on `{ followerId, followingId }`.
If the same pair is inserted twice, the second insert throws a duplicate key error which the server catches:

```
POST http://localhost:4000/api/follow/<alfi_user_id>  ← second time
```

**Response (409):**
```json
{ "error": "Already following this user" }
```

The frontend should sync the button state back to "Unfollow".

---

### What if Ekanto unfollows Alfi and opens the feed?

After unfollowing:
```
DELETE http://localhost:4000/api/follow/<alfi_user_id>
Authorization: Bearer <ekanto_jwt>
```

The follows collection no longer has the Ekanto→Alfi record.

Next time Ekanto opens the feed:
```
followingIds = []   ← empty
FRIENDS_TARGET = 6  but 0 friend posts exist
trendingTarget = 4 + 6 (gap) = 10   ← filled entirely by trending
```

Ekanto's feed now shows **100% trending posts** — Alfi's posts won't appear.

---

### What if the app is brand new and there are no posts at all?

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

The frontend should detect `data.length === 0` on the **first page** (no cursor sent) and show a "No posts yet — be the first!" empty state instead of the caught-up message.

---

## The Cursor Explained — No Magic, Just Bookmarks

The cursor is just a **base64-encoded JSON bookmark** of where each bucket was left off:

```
Page 1 returned:    2 friend posts  + 8 trending posts
Next cursor encodes: { friendsSkip: 2, trendingSkip: 8 }
Base64:             eyJmcmllbmRzU2tpcCI6MiwidHJlbmRpbmdTa2lwIjo4fQ==
```

```
Page 2 started at:  skip(2) for friends + skip(8) for trending
Page 2 returned:    0 friend posts  + 5 trending posts
Next cursor encodes: { friendsSkip: 2, trendingSkip: 13 }
```

If someone crafts a fake cursor and sends garbage, the server catches the JSON parse error:

```
GET /api/posts/feed?cursor=i_am_fake
```
```json
{ "error": "Invalid cursor" }   HTTP 400
```

---

## Full Flow Summary

```
Ekanto opens app
        │
        ▼
GET /api/follow/stats/alfiId          ← show follower count on profile
        │
        ▼
GET /api/follow/check/alfiId          ← show Follow / Unfollow button
        │
        ▼
POST /api/follow/alfiId               ← Ekanto clicks Follow
        │
        ▼
┌───────────────────────────┐
│   Alfi creates content    │
│   POST /api/posts         │  ← blog post
│   POST /api/reviews       │  ← review + shareToFeed:true → also writes MongoDB post
└───────────────────────────┘
        │
        ▼
GET /api/posts/feed?limit=10          ← Page 1 (no cursor)
  → 2 friend posts (Alfi)
  → 8 trending posts (Rafi + others)
  → nextCursor = "abc123..."
        │
        ▼  [user scrolls]
GET /api/posts/feed?cursor=abc123...  ← Page 2
  → 0 friend posts (Alfi has no more)
  → 5 trending posts (remaining)
  → nextCursor = "def456..."
        │
        ▼  [user scrolls]
GET /api/posts/feed?cursor=def456...  ← Page 3
  → 0 friend posts
  → 0 trending posts
  → allCaughtUp: true
  → "You are all caught up! Check back next time 🎉"
        │
        ▼
🎉  Feed stops loading. Ekanto checks back tomorrow.
```
