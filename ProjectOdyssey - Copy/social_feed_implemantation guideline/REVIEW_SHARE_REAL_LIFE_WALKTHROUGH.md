# Review Share — Real Life Walkthrough
### "Alfi Reviews Cox's Bazar and Ekanto Sees It in the Feed"

---

## The Two Databases Running at the Same Time

Before anything, understand the project uses **two separate databases**:

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│       SUPABASE (PostgreSQL)     │    │           MONGODB               │
│                                 │    │                                 │
│  reviews table                  │    │  posts collection               │
│  review_images table            │    │  comments collection            │
│  places table                   │    │  likes collection               │
│  itineraries table              │    │  users collection               │
└─────────────────────────────────┘    └─────────────────────────────────┘
       "The real data store"                  "The social feed"
```

- **Supabase** = stores the actual review record, the real rating, the permanent history
- **MongoDB** = stores what appears in the social feed, likes, comments

A review post in MongoDB is a **snapshot** of the Supabase review, formatted for the feed.

---

## Step 1 — Alfi opens the Destinations page

He's on `/destinations` in the browser.

**Frontend calls:**
```
GET http://localhost:4000/api/places/trending
```

Your server queries Supabase `places` table and returns popular destinations.
Cox's Bazar appears on screen. Alfi clicks it.

---

## Step 2 — He views the place details

The `PlaceDetailsModal` opens.

**Frontend calls:**
```
GET http://localhost:4000/api/places/ChIJabc123...
```

Your server (`placeRoutes.js`) queries:
```javascript
supabase.from('places')
  .select('*, cities(name), countries(name)')
  .eq('place_id', req.params.id)
  .single()
```

Returns: name, photos, description, city, country for Cox's Bazar.

Alfi reads the details. At the bottom he sees a **"Write a Review"** button. He clicks it.

---

## Step 3 — Alfi submits his review

A review form appears. He fills in:
- ⭐⭐⭐⭐⭐ — 5 stars
- Title: "World's longest sea beach!"
- Comment: "The waves, the sunset, the seafood — everything was perfect."
- ✅ Checkbox: **"Share this review to my feed"**

He hits **Submit**. The frontend sends this **one single request**:

```
POST http://localhost:4000/api/reviews
Authorization: Bearer eyJhbGci...alfi's JWT token
Content-Type: application/json

{
  "placeName": "Cox's Bazar",
  "rating": 5,
  "title": "World's longest sea beach!",
  "comment": "The waves, the sunset, the seafood — everything was perfect.",
  "shareToFeed": true
}
```

---

## Step 4 — What the server does (the important part)

Inside `server/src/routes/reviewRoutes.js`, these 5 things happen **one by one**:

---

### 4a — Reads Alfi's identity from the JWT token

The `authMiddleware` decodes his token before the route even runs:

```
req.user.id       = "507f1f77bcf0"    ← Alfi's MongoDB ObjectId
req.user.username = "alfi"
```

---

### 4b — Saves the real review to Supabase

`ReviewModel.createReview()` runs and inserts this row into your `reviews` table:

```
Supabase → reviews table
────────────────────────────────────────────────────────────────
id          │ "550e8400-e29b-41d4-a716-446655440000"   (auto UUID)
user_id     │ "00000000-0000-0000-507f-1f77bcf00000"   (Alfi's MongoDB ID padded to UUID)
user_name   │ "alfi"
place_name  │ "Cox's Bazar"
place_type  │ "POI"
rating      │ 5
title       │ "World's longest sea beach!"
comment     │ "The waves, the sunset, the seafood — everything was perfect."
created_at  │ 2026-03-01T10:00:00Z
```

This review is **permanent**. Even if Alfi later deletes the feed post, this Supabase row stays.

---

### 4c — Checks: is shareToFeed true?

```javascript
if (shareToFeed) {
    // YES — continue to 4d
}
```

If Alfi had checked `shareToFeed: false`, the server would stop here and just return the Supabase review. No feed post created.

---

### 4d — Builds the feed post content automatically

The code generates BlockNote-formatted text from Alfi's review fields:

```javascript
// Stars: "⭐".repeat(5) + "☆".repeat(0) = "⭐⭐⭐⭐⭐"

contentBlocks = [
  { heading: "Review: Cox's Bazar  ⭐⭐⭐⭐⭐" },
  { paragraph: '"World\'s longest sea beach!"' },    ← italic title
  { paragraph: "The waves, the sunset..." },          ← comment
  { paragraph: "📍 Cox's Bazar  •  Rated 5/5" }      ← footer line
]
```

Nobody wrote this text manually — the server generated it automatically from the review fields.

---

### 4e — Saves the feed post to MongoDB

`Post.create()` inserts this document into your `posts` collection:

```
MongoDB → posts collection
────────────────────────────────────────────────────────────────
_id           │ "65f1a2b3c4d5e6f7a8b9c0d1"
authorId      │ "507f1f77bcf0"                ← Alfi's MongoDB ID
type          │ "review"                       ← the new post type
content       │ { ...BlockNote JSON from 4d }
reviewData    │ {
              │   reviewId : "550e8400-..."    ← links back to Supabase row
              │   placeName: "Cox's Bazar"
              │   placeType: "POI"
              │   rating   : 5
              │   title    : "World's longest sea beach!"
              │   comment  : "The waves, the sunset..."
              │   images   : []
              │ }
likesCount    │ 0
commentsCount │ 0
createdAt     │ 2026-03-01T10:00:00Z
```

---

### 4f — Server sends back both records to the frontend

```json
{
  "success": true,
  "message": "Review created and shared to feed successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "place_name": "Cox's Bazar",
    "rating": 5,
    "comment": "The waves, the sunset..."
  },
  "feedPost": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "type": "review",
    "reviewData": { "placeName": "Cox's Bazar", "rating": 5, ... },
    "likesCount": 0,
    "commentsCount": 0
  }
}
```

The frontend can show Alfi a success message and optionally navigate him to the feed post.

---

## Step 5 — Ekanto opens the Feed

A few minutes later, Alfi's friend Ekanto is on `/feed`.

**Frontend calls:**
```
GET http://localhost:4000/api/posts?limit=10
```

MongoDB returns the 10 newest posts sorted by `createdAt` descending.
Alfi's review post is at the top. It arrives looking like this:

```json
{
  "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
  "type": "review",
  "authorId": {
    "_id": "507f1f77bcf0",
    "username": "alfi",
    "email": "alfi@example.com"
  },
  "reviewData": {
    "reviewId": "550e8400-e29b-41d4-a716-446655440000",
    "placeName": "Cox's Bazar",
    "placeType": "POI",
    "rating": 5,
    "title": "World's longest sea beach!",
    "comment": "The waves, the sunset, the seafood — everything was perfect.",
    "images": []
  },
  "likesCount": 0,
  "commentsCount": 0,
  "createdAt": "2026-03-01T10:00:00Z"
}
```

The frontend sees `post.type === "review"` and renders `<ReviewPostCard>` — a special card with star ratings, place name, and review text — instead of the regular blog card.

---

## Step 6 — Ekanto likes the post

Ekanto clicks the ❤️ button on Alfi's review post.

**Frontend calls:**
```
POST http://localhost:4000/api/likes/65f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer eyJhbGci...ekanto's JWT token
```

`likeRoutes.js` runs:
1. Inserts a row into MongoDB `likes` collection: `{ postId, userId: ekanto's ID }`
2. Increments `likesCount` on the post to `1`

Response:
```json
{ "success": true, "liked": true }
```

---

## Step 7 — Ekanto adds a comment

Ekanto types: *"I went there last year! The sunset was unreal 🌅"*

**Frontend calls:**
```
POST http://localhost:4000/api/comments
Authorization: Bearer eyJhbGci...ekanto's JWT token
Content-Type: application/json

{
  "postId": "65f1a2b3c4d5e6f7a8b9c0d1",
  "text": "I went there last year! The sunset was unreal 🌅"
}
```

`commentRoutes.js` runs:
1. Inserts into MongoDB `comments` collection
2. Increments `commentsCount` on the post to `1`

Alfi can now see 1 like and 1 comment on his review post in the feed.

---

## The Full System Map

```
ALFI                          YOUR SERVER                        DATABASES
─────                         ───────────                        ─────────

[1] Opens /destinations
         │
         ├──GET /api/places/trending──► placeRoutes.js ────────► Supabase: places
         │                                                        ◄ Cox's Bazar, etc.

[2] Clicks Cox's Bazar
         │
         ├──GET /api/places/:id──────► placeRoutes.js ────────► Supabase: places
         │                                                        ◄ full place details

[3] Submits review
    shareToFeed: true
         │
         ├──POST /api/reviews────────► reviewRoutes.js
         │                                  │
         │                                  ├──ReviewModel.createReview()──► Supabase: reviews
         │                                  │                                ◄ { id: "550e...", rating: 5 }
         │                                  │
         │                                  └──Post.create()───────────────► MongoDB: posts
         │                                       type:"review"               ◄ { _id: "65f1...", ... }
         │
         ◄── { data: supabase review, feedPost: mongodb post }


EKANTO

[5] Opens /feed
         │
         ├──GET /api/posts───────────► postRoutes.js ────────► MongoDB: posts
         │                                                        ◄ [{ type:"review", reviewData:... }, ...]

[6] Likes the post
         │
         ├──POST /api/likes/:id──────► likeRoutes.js ─────────► MongoDB: likes + posts (likesCount++)

[7] Adds comment
         │
         └──POST /api/comments───────► commentRoutes.js ──────► MongoDB: comments + posts (commentsCount++)
```

---

## What Happens If Alfi Deletes the Feed Post?

```
DELETE http://localhost:4000/api/posts/65f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer alfi's token
```

**Gets deleted from MongoDB:**
- ✅ The feed post (`posts` collection)
- ✅ Ekanto's comment (`comments` collection)
- ✅ Ekanto's like (`likes` collection)

**NOT deleted:**
- ❌ The Supabase `reviews` row stays permanently
- ❌ His rating still counts toward Cox's Bazar's average rating

The review is a **permanent record**. The feed post is just a **social wrapper** around it.

---

## The Two Records Side by Side

| | Supabase `reviews` table | MongoDB `posts` collection |
|---|---|---|
| **Created by** | `POST /api/reviews` | Same request (when `shareToFeed: true`) |
| **Purpose** | Permanent rating record | Appears in social feed |
| **Has likes?** | ❌ No | ✅ Yes |
| **Has comments?** | ❌ No | ✅ Yes |
| **Linked by** | — | `reviewData.reviewId` points to Supabase UUID |
| **Deleted if post deleted?** | ❌ No, stays forever | ✅ Yes |
| **Visible on** | Place detail page | `/feed` page |

---

## Summary — One Button, Two Records

When Alfi checks "Share to feed" and submits his review, **one API call** creates **two records** in two different databases at the same time:

```
POST /api/reviews  (shareToFeed: true)
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
Supabase: reviews table                   MongoDB: posts collection
"Alfi rated Cox's Bazar 5/5"             "Show this card in the feed"
Permanent. Used for analytics.           Temporary. Users can like/comment.
```

That is the entire system.

---

**Last Updated:** March 1, 2026
**Backend Status:** ✅ Complete and tested
