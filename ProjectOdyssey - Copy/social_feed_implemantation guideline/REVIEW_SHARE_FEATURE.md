# Review Share — Feed Integration

## Overview
Users can now share their place reviews directly to the social feed.  
These appear as a **third post type** (`type: "review"`) alongside blog posts and trip updates.

---

## 🔌 New API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/posts/review-share` | ✅ Yes | Share a review to the feed (standalone) |
| `POST` | `/api/reviews` | ✅ Yes | Create review + optionally share to feed |
| `GET`  | `/api/posts?type=review` | ❌ No | Fetch only review posts in feed |
| `GET`  | `/api/posts` | ❌ No | Fetch all posts (includes reviews) |

---

## 📦 Post Data Shape (type: "review")

When you fetch posts from `GET /api/posts`, review posts look like this:

```json
{
  "_id": "mongo-post-id",
  "type": "review",
  "authorId": {
    "_id": "user-id",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Review: Cox's Bazar  ⭐⭐⭐⭐⭐" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "\"Most beautiful beach ever!\"" }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "The sunset was absolutely breathtaking." }]
      },
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "📍 Cox's Bazar  •  Rated 5/5" }]
      }
    ]
  },
  "reviewData": {
    "reviewId": "supabase-review-uuid-or-null",
    "placeName": "Cox's Bazar",
    "placeType": "POI",
    "rating": 5,
    "title": "Most beautiful beach ever!",
    "comment": "The sunset was absolutely breathtaking.",
    "images": ["https://example.com/photo.jpg"],
    "visitDate": null
  },
  "tripId": null,
  "tripName": null,
  "likesCount": 0,
  "commentsCount": 0,
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-01T10:00:00.000Z"
}
```

The key difference from blog/auto posts is the **`reviewData` field** — use it to render a custom review card.

---

## 🎨 Frontend Implementation Guide

### 1. Detect Post Type in Feed

In your feed rendering logic, check `post.type`:

```tsx
// components/PostCard.tsx (or wherever you render feed items)

if (post.type === "review") {
  return <ReviewPostCard post={post} />;
}
if (post.type === "auto") {
  return <TripUpdateCard post={post} />;
}
return <BlogPostCard post={post} />;
```

---

### 2. ReviewPostCard Component (suggested structure)

```tsx
// components/ReviewPostCard.tsx

interface ReviewData {
  reviewId: string | null;
  placeName: string;
  placeType: string;
  rating: number;           // 1–5
  title: string | null;
  comment: string | null;
  images: string[];
  visitDate: string | null;
}

interface ReviewPost {
  _id: string;
  type: "review";
  authorId: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  reviewData: ReviewData;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export default function ReviewPostCard({ post }: { post: ReviewPost }) {
  const { reviewData, authorId, likesCount, commentsCount, createdAt } = post;

  // Render star rating
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-300"}>
        ★
      </span>
    ));
  };

  return (
    <div className="border-2 border-yellow-200 rounded-xl bg-gradient-to-br from-yellow-50 to-white p-4 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={authorId.profilePicture || "/default-avatar.png"}
          className="w-10 h-10 rounded-full"
          alt={authorId.username}
        />
        <div>
          <p className="font-semibold text-gray-800">{authorId.username}</p>
          <p className="text-xs text-gray-500">shared a review</p>
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Place name + rating */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-900">📍 {reviewData.placeName}</h3>
        <div className="flex items-center gap-1 text-xl">
          {renderStars(reviewData.rating)}
          <span className="text-sm text-gray-500 ml-1">{reviewData.rating}/5</span>
        </div>
      </div>

      {/* Title */}
      {reviewData.title && (
        <p className="italic text-gray-600 mb-2">"{reviewData.title}"</p>
      )}

      {/* Comment */}
      {reviewData.comment && (
        <p className="text-gray-700 mb-3">{reviewData.comment}</p>
      )}

      {/* Images */}
      {reviewData.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {reviewData.images.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${reviewData.placeName} photo ${i + 1}`}
              className="rounded-lg w-full h-32 object-cover"
            />
          ))}
        </div>
      )}

      {/* Interaction bar (reuse your existing like/comment buttons) */}
      <div className="flex gap-4 text-sm text-gray-500 pt-2 border-t">
        <button>❤️ {likesCount} Likes</button>
        <button>💬 {commentsCount} Comments</button>
      </div>
    </div>
  );
}
```

---

### 3. "Share to Feed" Button on Review Form

When a user writes a review, add a toggle to optionally share it to the feed:

```tsx
// Inside your review form component

const [shareToFeed, setShareToFeed] = useState(false);

const handleSubmitReview = async () => {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      placeName,
      rating,
      title,       // optional
      comment,     // optional
      images,      // optional array of URLs
      shareToFeed  // true = auto-creates a feed post
    })
  });

  const data = await res.json();
  // data.data      → the Supabase review
  // data.feedPost  → the MongoDB feed post (only if shareToFeed: true)
};

// In JSX:
<label className="flex items-center gap-2 mt-3">
  <input
    type="checkbox"
    checked={shareToFeed}
    onChange={e => setShareToFeed(e.target.checked)}
  />
  <span className="text-sm text-gray-600">Share this review to your feed</span>
</label>
```

---

### 4. Standalone "Share Review" Button (from review history)

If the user has already written reviews and wants to share one later:

```tsx
const shareReviewToFeed = async (reviewId: string) => {
  const res = await fetch("/api/posts/review-share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ reviewId })
  });

  const data = await res.json();
  if (data.success) {
    alert("Review shared to feed!");
  }
};

// In JSX (e.g., on a review card in profile/reviews page):
<button onClick={() => shareReviewToFeed(review.id)}>
  Share to Feed
</button>
```

---

### 5. Fetch Posts (Feed Already Works)

No changes needed — `GET /api/posts` already returns all types including `"review"`.  
Use `type` to filter if needed:

```tsx
// All posts (blog + auto + review)
fetch("/api/posts?limit=10")

// Only review posts
fetch("/api/posts?type=review&limit=10")

// Only blog posts
fetch("/api/posts?type=blog&limit=10")
```

---

## 🗄️ Updated TypeScript Interface

Add this to your `usePosts.ts` (or wherever the `Post` type lives):

```typescript
interface ReviewData {
  reviewId: string | null;
  placeName: string;
  placeType: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[];
  visitDate: string | null;
}

interface Post {
  _id: string;
  type: "blog" | "auto" | "review";   // ← added "review"
  authorId: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
  };
  content: object;       // BlockNote JSON
  tripId?: string | null;
  tripName?: string | null;
  tripProgress?: { ... };
  reviewData?: ReviewData;   // ← new optional field
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

---

## 🧪 Postman Testing Guide (for Alfi)

### Environment Variables
| Variable | Value |
|----------|-------|
| `base_url` | `http://localhost:4000` |
| `jwt_token` | *(get from login)* |

---

### Step 0 — Get a JWT Token

```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "your@email.com",
  "password": "yourpassword"
}
```
Copy the token from the response and set it as `jwt_token`.

---

### Test 1 — Share a review (with all fields directly)

```
POST {{base_url}}/api/posts/review-share
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "placeName": "Lalbagh Fort",
  "rating": 4,
  "title": "Historic gem in the heart of Dhaka",
  "comment": "The Mughal architecture is absolutely stunning. A must visit if you're in Dhaka.",
  "images": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Lalbagh_fort.jpg/1024px-Lalbagh_fort.jpg"
  ],
  "placeType": "POI"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Review shared to feed successfully",
  "data": {
    "_id": "...",
    "type": "review",
    "reviewData": {
      "placeName": "Lalbagh Fort",
      "rating": 4,
      "title": "Historic gem in the heart of Dhaka",
      "comment": "The Mughal architecture is absolutely stunning...",
      "images": ["https://..."],
      "placeType": "POI"
    },
    "likesCount": 0,
    "commentsCount": 0,
    ...
  }
}
```

---

### Test 2 — Share using an existing Supabase review ID

First get your review ID from `GET /api/reviews`, then:

```
POST {{base_url}}/api/posts/review-share
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "reviewId": "paste-your-supabase-review-uuid-here"
}
```

**Expected Response (201):** same shape as Test 1, but `reviewData.reviewId` will be the UUID.

**Error if ID not found (404):**
```json
{ "error": "Review not found" }
```

---

### Test 3 — Create a review AND auto-share to feed in one call

```
POST {{base_url}}/api/reviews
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "placeName": "Cox's Bazar",
  "rating": 5,
  "title": "World's longest sea beach!",
  "comment": "The waves, the sunset, the seafood — everything was perfect.",
  "images": [],
  "shareToFeed": true
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Review created and shared to feed successfully",
  "data": {
    "id": "supabase-uuid",
    "place_name": "Cox's Bazar",
    "rating": 5,
    ...
  },
  "feedPost": {
    "_id": "mongo-id",
    "type": "review",
    "reviewData": { ... },
    ...
  }
}
```

---

### Test 4 — Create a review WITHOUT sharing to feed

```
POST {{base_url}}/api/reviews
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "placeName": "Sundarbans",
  "rating": 4,
  "comment": "Amazing mangrove forest. Saw a Royal Bengal Tiger!",
  "shareToFeed": false
}
```

**Expected:** `feedPost` will be absent in the response.

---

### Test 5 — Verify review posts appear in the feed

```
GET {{base_url}}/api/posts?type=review&limit=10
```

**Expected:** list of posts where all have `"type": "review"`.

---

### Test 6 — Verify review posts appear in global feed (mixed)

```
GET {{base_url}}/api/posts?limit=20
```

**Expected:** mix of `"blog"`, `"auto"`, and `"review"` type posts.

---

### Test 7 — Validation error (missing placeName)

```
POST {{base_url}}/api/posts/review-share
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "rating": 3
}
```

**Expected (400):**
```json
{ "error": "Either reviewId or placeName is required" }
```

---

### Test 8 — Validation error (invalid rating)

```
POST {{base_url}}/api/posts/review-share
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "placeName": "Some Place",
  "rating": 7
}
```

**Expected (400):**
```json
{ "error": "rating must be between 1 and 5" }
```

---

### Test 9 — Like a review post (same as any post)

```
POST {{base_url}}/api/likes/REVIEW_POST_ID_HERE
Authorization: Bearer {{jwt_token}}
```

---

### Test 10 — Comment on a review post (same as any post)

```
POST {{base_url}}/api/comments
Authorization: Bearer {{jwt_token}}
Content-Type: application/json

{
  "postId": "REVIEW_POST_ID_HERE",
  "text": "I've been here too! totally agree with your rating."
}
```

---

## ✅ Checklist

### Backend (done ✅)
- [x] `Post.js` model updated — added `"review"` type + `reviewData` schema
- [x] `POST /api/posts/review-share` — share existing or new review to feed
- [x] `POST /api/reviews` — `shareToFeed: true` flag auto-creates feed post
- [x] `GET /api/posts?type=review` — filter works automatically

### Frontend (Ekanto's tasks)
- [ ] Update `Post` TypeScript interface (add `"review"` to type union + `reviewData` field)
- [ ] Create `ReviewPostCard` component
- [ ] Add conditional rendering in `PostCard.tsx` for `type === "review"`
- [ ] Add "Share to Feed" checkbox in the review submission form
- [ ] Add "Share to Feed" button on existing review cards (profile page)

---

**Last Updated:** March 1, 2026  
**Backend Status:** ✅ Complete  
**Frontend Status:** 🔲 Pending
