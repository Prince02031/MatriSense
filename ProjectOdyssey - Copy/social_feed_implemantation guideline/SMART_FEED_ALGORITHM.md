# Smart Feed Algorithm

## Goal

Return 10 posts per page that feel personal — prioritising people the user follows, filled out with globally trending content when friends haven't posted enough.

---

## The Split

Every page of 10 posts is always divided as:

```
6 posts  →  from people you follow   (60%)
4 posts  →  globally trending         (40%)
```

If friends haven't posted enough to fill their 6 slots, the shortfall is handed to trending. If you follow nobody, all 10 posts come from trending.

---

## Step-by-Step

```
INPUT: userId, limit (default 10), cursor (optional)

─────────────────────────────────────────────────────────────
STEP 1 — Decode cursor
─────────────────────────────────────────────────────────────
If no cursor:
    friendsSkip  = 0
    trendingSkip = 0

If cursor provided:
    decode base64 → parse JSON → { friendsSkip, trendingSkip }
    (invalid JSON → return 400)

─────────────────────────────────────────────────────────────
STEP 2 — Calculate targets
─────────────────────────────────────────────────────────────
FRIENDS_TARGET  = ceil(limit × 0.6)          → 6 for limit=10
TRENDING_TARGET = limit − FRIENDS_TARGET      → 4 for limit=10

─────────────────────────────────────────────────────────────
STEP 3 — Find who the user follows
─────────────────────────────────────────────────────────────
followingIds = Follow.find({ followerId: userId })
                     .select("followingId")

─────────────────────────────────────────────────────────────
STEP 4 — Fetch friend posts
─────────────────────────────────────────────────────────────
Post.find({ authorId: { $in: followingIds } })
    .sort({ createdAt: −1 })              ← newest first
    .skip(friendsSkip)
    .limit(FRIENDS_TARGET + 4)            ← +4 buffer for safety

friendsTaken = min(friendPosts.length, FRIENDS_TARGET)
friendsGap   = FRIENDS_TARGET − friendsTaken

─────────────────────────────────────────────────────────────
STEP 5 — Fetch trending posts
─────────────────────────────────────────────────────────────
trendingTarget = TRENDING_TARGET + friendsGap   ← fill the gap

Post.find({
    authorId: { $nin: [...followingIds, userId] },   ← no friends, no self
    _id:      { $nin: friendPostIds }                ← no duplicates
})
.sort({ likesCount: −1, commentsCount: −1, createdAt: −1 })
.skip(trendingSkip)
.limit(trendingTarget + 4)                           ← +4 buffer

trendingTaken = min(trendingPosts.length, trendingTarget)

─────────────────────────────────────────────────────────────
STEP 6 — Backfill (if trending also ran dry)
─────────────────────────────────────────────────────────────
trendingGap = trendingTarget − trendingTaken

If trendingGap > 0:
    fetch trendingGap extra friend posts from the buffer collected in Step 4

─────────────────────────────────────────────────────────────
STEP 7 — Interleave
─────────────────────────────────────────────────────────────
Pattern: 3 friends → 2 trending → 3 friends → 2 trending …

Walk through slots 1..limit:
    slot % 5 ∈ {1,2,3}  → pull next friend post (or trending if friends exhausted)
    slot % 5 ∈ {4,5}    → pull next trending post (or friend if trending exhausted)

─────────────────────────────────────────────────────────────
STEP 8 — Detect exhaustion
─────────────────────────────────────────────────────────────
allCaughtUp = (merged.length === 0)

─────────────────────────────────────────────────────────────
STEP 9 — Build next cursor
─────────────────────────────────────────────────────────────
nextCursor = base64(JSON.stringify({
    friendsSkip:  friendsSkip  + friendsTaken + extraFriendsTaken,
    trendingSkip: trendingSkip + trendingTaken
}))

If allCaughtUp: nextCursor = null
```

---

## Output Shape

```
{
  data: Post[],            ← each post has _feedSource: "friends" | "trending"
  pagination: {
    hasMore:     bool,
    nextCursor:  string | null,
    allCaughtUp: bool,
    message:     string | null,   ← "You are all caught up! Check back next time 🎉"
    page: {
      friendsOnThisPage:  number,
      trendingOnThisPage: number,
      total:              number
    }
  }
}
```

---

## The Cursor

The cursor is a **base64-encoded JSON bookmark** — it records how many posts from each bucket have already been served, so consecutive pages never repeat posts.

```
After page 1:  { friendsSkip: 6, trendingSkip: 4 }
After page 2:  { friendsSkip: 6, trendingSkip: 14 }   ← friends exhausted
After page 3:  allCaughtUp → nextCursor = null
```

The cursor is stateless — the server stores nothing between requests.

---

## Visual Summary

```
Page 1                    Page 2                    Page 3
──────────────            ──────────────            ──────────────
F  friend post            F  (none left)            (empty)
F  friend post            T  trending      ──────▶  allCaughtUp
F  friend post            T  trending               🎉 message
T  trending               T  trending
T  trending               T  trending
F  friend post            T  trending
F  friend post            T  trending
F  friend post            T  trending
T  trending               T  trending
T  trending               T  trending
      │
      ▼
  nextCursor
```

---

## Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| User follows nobody | All 10 posts trending |
| Fewer than 6 friend posts | Gap filled by extra trending |
| Fewer than 4 trending posts | Gap filled by extra friend posts |
| Both buckets empty | `allCaughtUp: true`, `data: []`, `nextCursor: null` |
| Invalid cursor string | `400 { error: "Invalid cursor" }` |
