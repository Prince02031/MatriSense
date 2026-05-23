# Social Feed API Documentation (Module C)

## Overview
This module provides a complete social media feed system for Project Odyssey, allowing users to:
- Write and publish blog posts about their travels
- Auto-generate posts when trips are completed
- Like and comment on posts
- View a feed of travel memories

---

## 📊 Database Models

### Post Model
```javascript
{
  _id: ObjectId,
  authorId: ObjectId (ref: User),
  type: "blog" | "auto",
  content: Object, // BlockNote JSON structure
  tripId: String, // UUID from Supabase itineraries
  tripName: String,
  likesCount: Number,
  commentsCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Comment Model
```javascript
{
  _id: ObjectId,
  postId: ObjectId (ref: Post),
  userId: ObjectId (ref: User),
  text: String (max 500 chars),
  createdAt: Date
}
```

### Like Model
```javascript
{
  _id: ObjectId,
  postId: ObjectId (ref: Post),
  userId: ObjectId (ref: User),
  createdAt: Date
}
```

---

## 🔌 API Endpoints

### Posts API (`/api/posts`)

#### 1. Create a Post
**POST** `/api/posts`

**Auth Required:** Yes

**Request Body:**
```json
{
  "type": "blog",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "My amazing trip!" }]
      }
    ]
  },
  "tripId": "uuid-from-supabase",
  "tripName": "My Bangladesh Adventure"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "_id": "post-id",
    "authorId": "user-id",
    "type": "blog",
    "content": { ... },
    "tripId": "uuid",
    "tripName": "My Bangladesh Adventure",
    "likesCount": 0,
    "commentsCount": 0,
    "createdAt": "2026-02-19T...",
    "author": {
      "_id": "user-id",
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 2. Get All Posts (Feed)
**GET** `/api/posts?limit=10&cursor=post-id&type=blog&userId=user-id`

**Auth Required:** No

**Query Parameters:**
- `limit` (optional): Number of posts per page (default: 10, max: 50)
- `cursor` (optional): Post ID to start from (for pagination)
- `type` (optional): Filter by "blog" or "auto"
- `userId` (optional): Filter by author ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "post-id",
      "authorId": "user-id",
      "type": "blog",
      "content": { ... },
      "likesCount": 15,
      "commentsCount": 3,
      "createdAt": "2026-02-19T...",
      "author": {
        "username": "johndoe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "next-post-id"
  }
}
```

---

#### 3. Get Single Post
**GET** `/api/posts/:id`

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "post-id",
    "authorId": "user-id",
    "type": "blog",
    "content": { ... },
    "tripId": "uuid",
    "tripName": "Trip Name",
    "likesCount": 15,
    "commentsCount": 3,
    "createdAt": "2026-02-19T...",
    "author": {
      "username": "johndoe",
      "email": "john@example.com"
    }
  }
}
```

---

#### 4. Update Post
**PUT** `/api/posts/:id`

**Auth Required:** Yes (must be author)

**Request Body:**
```json
{
  "content": { ... },
  "tripName": "Updated Trip Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": { ... }
}
```

---

#### 5. Delete Post
**DELETE** `/api/posts/:id`

**Auth Required:** Yes (must be author)

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```
*Note: Also deletes all associated comments and likes*

---

#### 6. Get Posts by User
**GET** `/api/posts/user/:userId`

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": [ ... ]
}
```

---

### Comments API (`/api/comments`)

#### 1. Add Comment
**POST** `/api/comments`

**Auth Required:** Yes

**Request Body:**
```json
{
  "postId": "post-id",
  "text": "Great post!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "_id": "comment-id",
    "postId": "post-id",
    "userId": "user-id",
    "text": "Great post!",
    "createdAt": "2026-02-19T...",
    "user": {
      "username": "janedoe",
      "email": "jane@example.com"
    }
  }
}
```

---

#### 2. Get Comments for Post
**GET** `/api/comments/:postId?limit=20&skip=0`

**Auth Required:** No

**Query Parameters:**
- `limit` (optional): Number of comments per page (default: 20, max: 100)
- `skip` (optional): Number of comments to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "comment-id",
      "postId": "post-id",
      "userId": "user-id",
      "text": "Great post!",
      "createdAt": "2026-02-19T...",
      "user": {
        "username": "janedoe",
        "email": "jane@example.com"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

---

#### 3. Update Comment
**PUT** `/api/comments/:id`

**Auth Required:** Yes (must be author)

**Request Body:**
```json
{
  "text": "Updated comment text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment updated successfully",
  "data": { ... }
}
```

---

#### 4. Delete Comment
**DELETE** `/api/comments/:id`

**Auth Required:** Yes (must be author)

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

---

### Likes API (`/api/likes`)

#### 1. Toggle Like (Like/Unlike)
**POST** `/api/likes/:postId`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Post liked successfully",
  "liked": true
}
```

*Or when unliking:*
```json
{
  "success": true,
  "message": "Post unliked successfully",
  "liked": false
}
```

---

#### 2. Get Users Who Liked a Post
**GET** `/api/likes/:postId?limit=20&skip=0`

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "like-id",
      "postId": "post-id",
      "userId": {
        "_id": "user-id",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "createdAt": "2026-02-19T..."
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "skip": 0,
    "hasMore": false
  }
}
```

---

#### 3. Check if User Liked Post
**GET** `/api/likes/:postId/check`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "liked": true
}
```

---

#### 4. Unlike Post (Explicit)
**DELETE** `/api/likes/:postId`

**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "message": "Post unliked successfully"
}
```

---

## 🤖 Auto-Generated Posts

### Service Function: `createAutoPostForTrip`

**Location:** `server/src/services/postService.js`

**Usage Example:**
```javascript
const { createAutoPostForTrip } = require("../services/postService");

// In your trip completion handler:
const post = await createAutoPostForTrip(userId, tripData);
```

**Parameters:**
```javascript
{
  userId: "user-id", // MongoDB User ID
  tripData: {
    id: "uuid",
    trip_name: "My Bangladesh Trip",
    selected_places: [
      { name: "Dhaka", ... },
      { name: "Cox's Bazar", ... }
    ],
    selected_itinerary: {
      schedule: [...],
      estimatedCost: "$500"
    }
  }
}
```

**Integration Point:**
Add this to your trip completion route (e.g., when status changes from "draft" to "completed"):

```javascript
// In tripRoutes.js
router.put("/complete/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const tripId = req.params.id;

    // Update trip status in Supabase
    const { data: trip } = await supabase
      .from("itineraries")
      .update({ status: "completed" })
      .eq("id", tripId)
      .eq("user_id", userId)
      .select()
      .single();

    // Auto-generate post
    const post = await createAutoPostForTrip(userId, trip);

    return res.json({
      success: true,
      trip,
      post
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});
```

---

## 🎨 Frontend Integration Guide

### 1. Fetch Feed
```javascript
const fetchPosts = async (cursor = null) => {
  const url = cursor 
    ? `/api/posts?limit=10&cursor=${cursor}`
    : `/api/posts?limit=10`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  return data;
};
```

---

### 2. Create Post
```javascript
const createPost = async (content, tripId, tripName) => {
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      type: "blog",
      content,
      tripId,
      tripName
    })
  });
  
  return await res.json();
};
```

---

### 3. Like Post
```javascript
const toggleLike = async (postId) => {
  const res = await fetch(`/api/likes/${postId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  return await res.json();
};
```

---

### 4. Add Comment
```javascript
const addComment = async (postId, text) => {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      postId,
      text
    })
  });
  
  return await res.json();
};
```

---

## ✅ Testing Checklist

### Backend Testing (Use Postman or `curl`)

1. **Create a blog post**
   ```bash
   POST http://localhost:4000/api/posts
   ```

2. **Get all posts**
   ```bash
   GET http://localhost:4000/api/posts
   ```

3. **Like a post**
   ```bash
   POST http://localhost:4000/api/likes/POST_ID
   ```

4. **Add a comment**
   ```bash
   POST http://localhost:4000/api/comments
   ```

5. **Get comments for a post**
   ```bash
   GET http://localhost:4000/api/comments/POST_ID
   ```

---

## 🔐 Authentication

All routes marked with "Auth Required: Yes" need a JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The `authMiddleware` automatically extracts the user ID from the token and adds it to `req.user.id`.

---

## 🚀 Next Steps for Frontend Team

1. **Install BlockNote Editor**
   ```bash
   npm install @blocknote/react
   ```

2. **Create `/write` page** with BlockNote editor

3. **Create `/feed` page** to display posts

4. **Add Like button component**

5. **Add Comment section component**

6. **Implement infinite scroll** using the cursor pagination

---

## 📝 Notes

- All timestamps are ISO 8601 format
- Post content follows BlockNote JSON schema
- Likes are unique per user per post (compound index)
- Comments are sorted oldest-first by default
- Posts cascade delete (deleting a post removes its comments and likes)
- Like counts and comment counts are denormalized for performance

---

## 🎯 Minimum Viable Features

- [x] Create blog post
- [x] View feed of posts
- [x] Like posts (toggle)
- [x] Add comments
- [x] Auto-generate posts on trip completion
- [x] Pagination for feed
- [x] Edit/delete own posts
- [x] Edit/delete own comments

---

**Last Updated:** February 19, 2026
**Backend Status:** ✅ Complete and Ready for Integration
