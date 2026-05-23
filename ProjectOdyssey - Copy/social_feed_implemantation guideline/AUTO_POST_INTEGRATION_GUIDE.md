# Integration Guide: Auto-Generate Posts on Trip Completion

## Overview
This guide shows how to integrate the auto-post feature into your existing trip completion workflow.

---

## 📍 Where to Add the Integration

The auto-post should be triggered when:
1. A user marks a trip as "completed"
2. A user finishes the last day of their trip
3. A user checks out from the last destination

---

## 🔧 Implementation Options

### Option 1: Trip Status Update (Recommended)

Add to `server/src/routes/tripRoutes.js`:

```javascript
const { createAutoPostForTrip } = require("../services/postService");

/**
 * PUT /api/trips/:id/complete
 * Mark a trip as completed and auto-generate a post
 */
router.put("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const tripId = req.params.id;

    // 1. Get trip details from Supabase
    const { data: trip, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (error || !trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // 2. Update trip status to completed
    const { error: updateError } = await supabase
      .from("itineraries")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", tripId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    // 3. Auto-generate post
    let post = null;
    try {
      post = await createAutoPostForTrip(userId, trip);
      console.log("✅ Auto-post created:", post._id);
    } catch (postError) {
      // Don't fail the entire request if post creation fails
      console.error("⚠️ Failed to create auto-post:", postError);
    }

    return res.json({
      success: true,
      message: "Trip completed successfully",
      data: {
        trip,
        post
      }
    });

  } catch (err) {
    console.error("Error completing trip:", err);
    return res.status(500).json({ error: err.message });
  }
});
```

---

### Option 2: Automatic on Last Check-Out

Add to `server/src/routes/visitRoutes.js`:

```javascript
const supabase = require("../config/supabaseClient");
const { createAutoPostForTrip } = require("../services/postService");

/**
 * POST /api/visits/check-out
 * Check out from a place and auto-generate post if it's the last destination
 */
router.post("/check-out", authMiddleware, async (req, res) => {
  try {
    const { itineraryId, placeId } = req.body;
    const userId = req.user.id;

    // ... existing check-out logic ...

    // After successful check-out:
    
    // 1. Get the itinerary
    const { data: trip } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", itineraryId)
      .eq("user_id", userId)
      .single();

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // 2. Check if this was the last place
    const { data: visitLogs } = await supabase
      .from("visit_logs")
      .select("*")
      .eq("itinerary_id", itineraryId)
      .eq("user_id", userId);

    const totalPlaces = trip.selected_places?.length || 0;
    const visitedPlaces = visitLogs?.filter(log => log.check_out_time)?.length || 0;

    // 3. If all places visited, auto-generate post
    if (visitedPlaces >= totalPlaces && totalPlaces > 0) {
      try {
        await createAutoPostForTrip(userId, trip);
        console.log("✅ Trip completed! Auto-post created.");
      } catch (postError) {
        console.error("⚠️ Failed to create auto-post:", postError);
      }
    }

    return res.json({
      success: true,
      message: "Checked out successfully",
      tripCompleted: visitedPlaces >= totalPlaces
    });

  } catch (err) {
    console.error("Check-out error:", err);
    return res.status(500).json({ error: err.message });
  }
});
```

---

### Option 3: Manual Button in Frontend

If you want users to manually trigger the post:

```javascript
/**
 * POST /api/posts/auto-generate
 * Manually create an auto-generated post from a trip
 */
router.post("/auto-generate", authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.body;
    const userId = req.user.id;

    if (!tripId) {
      return res.status(400).json({ error: "tripId is required" });
    }

    // 1. Get trip from Supabase
    const { data: trip, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (error || !trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // 2. Create auto-post
    const post = await createAutoPostForTrip(userId, trip);

    return res.json({
      success: true,
      message: "Post generated successfully",
      data: post
    });

  } catch (err) {
    console.error("Error generating post:", err);
    return res.status(500).json({ error: err.message });
  }
});
```

---

## 📋 Testing the Integration

### Step 1: Create a Test Trip

```bash
POST http://localhost:4000/api/trips/save
Authorization: Bearer YOUR_TOKEN

{
  "tripName": "My Test Trip",
  "selectedPlaces": [
    { "name": "Dhaka", "category": "city" },
    { "name": "Cox's Bazar", "category": "beach" }
  ],
  "selectedItinerary": {
    "schedule": [
      { "day": 1, "activities": ["Visit Dhaka"] },
      { "day": 2, "activities": ["Go to Cox's Bazar"] }
    ],
    "estimatedCost": "$300"
  },
  "status": "confirmed"
}
```

### Step 2: Complete the Trip

```bash
PUT http://localhost:4000/api/trips/TRIP_ID/complete
Authorization: Bearer YOUR_TOKEN
```

### Step 3: Check if Post Was Created

```bash
GET http://localhost:4000/api/posts?userId=YOUR_USER_ID
```

You should see an auto-generated post with:
- `type: "auto"`
- Content describing the completed trip
- Trip name and places visited

---

## 🎨 Customizing Auto-Post Content

Edit `server/src/services/postService.js` to customize the auto-generated post content:

```javascript
// Change the heading
{
  type: "heading",
  content: [
    { 
      type: "text", 
      text: `${user.username} completed an epic journey! 🎉` // Custom text
    }
  ]
}

// Add custom fields
{
  type: "paragraph",
  content: [
    { 
      type: "text", 
      text: `Distance traveled: ${trip.distance_km} km` 
    }
  ]
}

// Add emojis based on trip type
const emoji = trip.category === "beach" ? "🏖️" : 
              trip.category === "mountain" ? "⛰️" : "🗺️";
```

---

## 🔒 Security Notes

1. Always verify `userId` matches the trip owner before generating posts
2. Catch and log errors during post creation (don't fail the trip completion)
3. Rate limit auto-post creation to prevent spam
4. Validate trip data exists before creating post

---

## ⚡ Performance Tips

1. Create the post asynchronously (don't block trip completion)
2. Cache user data to avoid repeated database queries
3. Implement a job queue for post generation if you have high traffic

Example with background processing:

```javascript
// Quick response
await supabase.from("itineraries").update({ status: "completed" });

// Post generation in background
setImmediate(async () => {
  try {
    await createAutoPostForTrip(userId, trip);
  } catch (err) {
    console.error("Background post creation failed:", err);
  }
});

return res.json({ success: true });
```

---

## 🐛 Troubleshooting

### Post Not Created
- Check console logs for errors
- Verify trip data has `selected_places` array
- Ensure user exists in MongoDB
- Check MongoDB connection

### Wrong User Info
- Verify `authorId` matches `req.user.id`
- Check JWT token is valid
- Ensure User model is properly populated

### Content Format Issues
- Validate BlockNote JSON structure
- Test with simple content first
- Check for undefined values in trip data

---

## 📞 Contact

If you need help integrating this:
- Check `SOCIAL_FEED_API_DOCS.md` for full API reference
- Test with Postman collection: `ProjectOdyssey-SocialFeed.postman_collection.json`
- Look at service code: `server/src/services/postService.js`

---

**Status:** ✅ Ready for Integration  
**Last Updated:** February 19, 2026
