# User Search & Profile — Real Life Walkthrough
### "Ekanto searches for Alfi, views his profile, and follows him from there"

---

## The Cast

| Person | MongoDB ID | Privacy |
|--------|-----------|---------|
| **Ekanto** | `64b1...` | Public profile |
| **Alfi** | `64a1...` | Public profile, showTripHistory: true |
| **Rafi** | `64c1...` | Private profile 🔒 |

---

## Scene 1 — Ekanto Searches for "alfi"

Ekanto is on the app. He heard about this travel blogger named Alfi and wants to find him.

### Step 1 — He types "alfi" in the search bar

The frontend debounces 350ms then fires:

```
GET http://localhost:4000/api/users/search?q=alfi&limit=8
Authorization: Bearer <ekanto_jwt>
```

**What the server does:**

```javascript
// Build case-insensitive regex
const regex = /alfi/i;

// Query MongoDB users collection
User.find({
  $or: [
    { username:    /alfi/i },   // matches: "alfi", "alfirocks", "superalfi"
    { displayName: /alfi/i }    // matches: "Alfi Rahman", "Khalfi", etc.
  ]
})
.select("_id username displayName profileImage bio travelStyle xp level privacy")
.limit(8)
```

MongoDB returns 3 users: **Alfi**, **Alfirocks**, and **Rafi** (whose displayName is "Ralfi").

**For each result the server checks:**
1. Is the profile private? → If yes AND it's not Ekanto's own → return stub only
2. Does Ekanto follow this person? → `Follow.findOne({ followerId: ekanto, followingId: user })`

Rafi's `privacy.publicProfile = false`, so he gets a stub:
```json
{
  "_id": "64c1...",
  "username": "rafi123",
  "displayName": "Ralfi",
  "profileImage": "https://...",
  "isPrivate": true
}
```

Alfi and Alfirocks are public, and Ekanto doesn't follow either:
```json
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
}
```

**Full response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    { ...Alfi — full, isFollowing: false },
    { ...Alfirocks — full, isFollowing: false },
    { ...Rafi — stub, isPrivate: true }
  ]
}
```

**What Ekanto sees in the dropdown:**
```
┌──────────────────────────────────┐
│  [avatar]  Alfi Rahman           │
│            @alfi                 │
│                                  │
│  [avatar]  Alfirocks             │
│            @alfirocks            │
│                                  │
│  [avatar]  Ralfi    🔒 Private   │
│            @rafi123              │
└──────────────────────────────────┘
```

He clicks on "Alfi Rahman".

---

## Scene 2 — Ekanto Views Alfi's Public Profile

The frontend navigates to `/profile/64a1...` and fires:

```
GET http://localhost:4000/api/users/64a1...
Authorization: Bearer <ekanto_jwt>
```

**What the server does (all in parallel):**

```javascript
const userId   = "64a1...";    // Alfi
const callerId = "64b1...";    // Ekanto

// Fetches all at once with Promise.all
const [
  followersCount,   // → 42
  followingCount,   // → 8
  postsCount,       // → 17
  recentPosts,      // → last 6 posts by Alfi
  followDoc         // → null (Ekanto doesn't follow Alfi yet)
] = await Promise.all([
  Follow.countDocuments({ followingId: "64a1..." }),    // 42
  Follow.countDocuments({ followerId:  "64a1..." }),    // 8
  Post.countDocuments({ authorId: "64a1..." }),          // 17
  Post.find({ authorId: "64a1..." })
      .sort({ createdAt: -1 }).limit(6),                 // last 6 posts
  Follow.findOne({ followerId: "64b1...", followingId: "64a1..." }) // null
]);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id":          "64a1...",
    "username":     "alfi",
    "displayName":  "Alfi Rahman",
    "profileImage": "https://...",
    "coverImage":   "https://...",
    "bio":          "Explorer. Coffee addict.",
    "travelStyle":  ["Adventure", "Budget"],
    "xp":           1200,
    "level":        5,
    "isPrivate":    false,
    "isOwnProfile": false,
    "isFollowing":  false,
    "stats": {
      "followersCount": 42,
      "followingCount": 8,
      "postsCount":     17
    },
    "recentPosts": [
      {
        "_id": "64c1a2b3...",
        "type": "blog",
        "content": "Just spent 3 days in Sundarbans...",
        "likesCount": 12,
        "commentsCount": 3
      },
      {
        "_id": "64c1b2c3...",
        "type": "review",
        "reviewData": {
          "placeName": "Tiger's Den Resort",
          "rating": 5,
          "title": "Best wildlife stay in Bangladesh"
        },
        "likesCount": 8,
        "commentsCount": 1
      }
      // ...4 more posts
    ]
  }
}
```

**What Ekanto sees on screen:**
```
┌────────────────────────────────────────────┐
│  [cover image — Sundarbans landscape]      │
│                                            │
│  [avatar]                    [Follow]      │  ← isFollowing: false → Follow btn
│                                            │
│  Alfi Rahman                               │
│  @alfi                                     │
│  Explorer. Coffee addict.                  │
│  [Adventure] [Budget]                      │
│  ⚡ Level 5 · 1200 XP                      │
│                                            │
│  17         42          8                  │
│  Posts   Followers   Following             │
│                                            │
│  ─── Recent Posts ─────────────────────── │
│  [Post: Just spent 3 days in Sundarbans...]│
│  [Review: Tiger's Den Resort ⭐⭐⭐⭐⭐]    │
│  [...4 more posts...]                      │
└────────────────────────────────────────────┘
```

Because `isFollowing: false` was already in the response, the `<FollowButton>` renders immediately as "Follow" without making a separate `/api/follow/check` call.

---

## Scene 3 — Ekanto Clicks Follow

```
POST http://localhost:4000/api/follow/64a1...
Authorization: Bearer <ekanto_jwt>
```

The Follow button optimistically flips to "Unfollow". The follower count on screen bumps from 42 → 43 (you can increment it locally without refreshing the profile).

Server response:
```json
{
  "success": true,
  "message": "Now following this user"
}
```

---

## Scene 4 — Ekanto Views Rafi's Private Profile

He somehow gets Rafi's user ID and navigates to `/profile/64c1...`.

```
GET http://localhost:4000/api/users/64c1...
Authorization: Bearer <ekanto_jwt>
```

Server detects `privacy.publicProfile = false` and Ekanto is not Rafi:

```javascript
if (!user.privacy?.publicProfile && !isOwnProfile) {
  return res.json({
    success: true,
    data: {
      _id:          user._id,
      username:     user.username,
      displayName:  user.displayName,
      profileImage: user.profileImage,
      isPrivate:    true,
      isOwnProfile: false,
      isFollowing:  false
    }
  });
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id":          "64c1...",
    "username":     "rafi123",
    "displayName":  "Rafi",
    "profileImage": "https://...",
    "isPrivate":    true,
    "isOwnProfile": false,
    "isFollowing":  false
  }
}
```

**What Ekanto sees:**
```
┌──────────────────────────────────────┐
│                                      │
│             [avatar]                 │
│           Rafi                       │
│           @rafi123                   │
│                                      │
│     🔒 This account is private       │
│                                      │
└──────────────────────────────────────┘
```

No stats. No posts. No follow button (you can't follow someone private unless they accept — but that's a future feature if needed).

---

## Scene 5 — Alfi Views His Own Profile

Alfi opens his own profile page. The frontend sends his own JWT:

```
GET http://localhost:4000/api/users/64a1...
Authorization: Bearer <alfi_jwt>
```

The server detects `callerId === userId` → `isOwnProfile: true`:

```json
{
  "data": {
    ...full profile...,
    "isOwnProfile": true,
    "isFollowing":  false,
    "recentPosts":  [ ...always shown, even if showTripHistory=false... ]
  }
}
```

**What Alfi sees — Edit button instead of Follow:**
```
┌────────────────────────────────────────────┐
│  [cover image]                             │
│                                            │
│  [avatar]               [Edit Profile]     │  ← isOwnProfile: true
│                                            │
│  Alfi Rahman                               │
│  @alfi  ·  Explorer. Coffee addict.        │
│                                            │
│  17         42          8                  │
│  Posts   Followers   Following             │
└────────────────────────────────────────────┘
```

---

## Scene 6 — Unauthenticated Visitor Views Alfi's Profile

Someone not logged in visits the profile link:

```
GET http://localhost:4000/api/users/64a1...
(no Authorization header)
```

`optionalAuth` middleware detects no token → `req.user = undefined` → `callerId = undefined`.

Server skips the `followDoc` query entirely (no one to check following for).

```json
{
  "data": {
    ...full public profile...,
    "isOwnProfile": false,
    "isFollowing":  false      ← always false without auth
  }
}
```

**What the visitor sees:**
```
┌────────────────────────────────────────────┐
│  [cover image]                             │
│                                            │
│  [avatar]           [Login to Follow]      │  ← not logged in
│                                            │
│  Alfi Rahman                               │
└────────────────────────────────────────────┘
```

---

## Complete Flow Summary

```
Ekanto types "alfi" in search bar
          │
          ▼  (350ms debounce)
GET /api/users/search?q=alfi         ← returns 3 results with isFollowing
          │
          ▼  clicks "Alfi Rahman"
GET /api/users/64a1...               ← returns full profile
          │                             isFollowing: false  (no extra check needed)
          │                             stats: { 42 followers, 8 following, 17 posts }
          │                             recentPosts: [6 latest posts]
          ▼
Profile page renders:
  - Follow button (because isFollowing: false)
  - Stats bar
  - 6 recent posts

Ekanto clicks Follow
          │
          ▼
POST /api/follow/64a1...             ← Follow button flips to "Unfollow"
                                        followers count bumps to 43 locally

                                        next time Ekanto opens the feed:
                                        GET /api/posts/feed
                                        → Alfi's posts appear in the friends section
```
