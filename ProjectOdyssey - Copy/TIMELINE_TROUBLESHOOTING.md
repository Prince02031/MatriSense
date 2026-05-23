# Timeline Troubleshooting Guide

## What You Should See

When you go to the Dashboard, you should see a new "Your Journey Timeline" section with:

1. **Section Header** - "📅 Your Journey Timeline" with description
2. **Stats Bar** - Three cards showing:
   - Trips Completed (amber)
   - Upcoming Adventures (blue)
   - Total Journeys (purple)
3. **Timeline Content**:
   - Past trips in a vertical timeline
   - Upcoming trips in a horizontal scrollable section (with 🔮 Upcoming Adventures label)
4. **Empty State** - If no trips exist, shows a message to create trips first

## Debugging Steps

### Step 1: Check Browser Console
1. Open Dashboard
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Look for messages starting with 🕐, 🔍, 📊, ✅, or ❌
5. Share the error message if you see ❌

Expected logs:
```
🕐 TripTimeline mounted, fetching data...
🔍 Fetching timeline... Token: exists
📊 Timeline API response status: 200
✅ Timeline data received: {...}
```

### Step 2: Check If Component Is Rendering
1. Open DevTools (F12)
2. Go to **Elements** tab
3. Search for "Your Journey Timeline" (Ctrl+F / Cmd+F)
4. If found: component is rendering ✅
5. If not found: component might not be imported

### Step 3: Verify API Connection
1. Open Console (F12 → Console)
2. Run this command:
```javascript
fetch('http://localhost:4000/api/trips/timeline', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e))
```
3. Check the response
4. Should see `success: true` with `data: {pastTrips, upcomingTrips, stats}`

### Step 4: Check Local Storage
1. Open DevTools (F12)
2. Go to **Application** tab → **Local Storage**
3. Find `localhost:3000` (or your dev port)
4. Look for `token` - should exist and have a value
5. If missing: you're not logged in

### Step 5: Verify Server Is Running
1. Check if backend server is running (should be on http://localhost:4000)
2. Go to http://localhost:4000 in new tab
3. Should see JSON response with endpoints list
4. If page doesn't load: server is not running

## Common Issues & Solutions

### Issue: "No authentication token found"
**Cause**: You're not logged in  
**Solution**: Make sure you're logged in properly to the dashboard

### Issue: Network Error / Failed to fetch
**Cause**: Backend server not running  
**Solution**: 
```bash
cd server
npm start
```

### Issue: Error 401 Unauthorized
**Cause**: Token is invalid or expired  
**Solution**: Log out and log back in

### Issue: Error 404 Not Found
**Cause**: API endpoint doesn't exist  
**Solution**: Verify route is properly added to `server/src/routes/tripRoutes.js`

### Issue: Empty state showing but you have trips
**Cause**: Trips don't have proper dates  
**Solution**: Make sure trips have `trip_start_date` and `trip_end_date` set in database

### Issue: Timeline header visible but stats/trips don't show
**Cause**: API returns data but component not rendering it  
**Solution**: Check console for JavaScript errors

## Database Setup

The timeline feature requires the `trip_memories` table:

### Check If Table Exists
1. Go to Supabase Dashboard
2. Navigate to your database
3. Check **Tables** section
4. Look for `trip_memories` table

### If Table Doesn't Exist
Run this SQL in Supabase SQL Editor:
```sql
CREATE TABLE public.trip_memories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id character varying NOT NULL,
  mood character varying,
  favorite_moment text,
  trip_rating integer CHECK (trip_rating >= 0 AND trip_rating <= 5),
  would_revisit boolean DEFAULT false,
  memory_photos jsonb DEFAULT '[]'::jsonb,
  visited_places jsonb DEFAULT '[]'::jsonb,
  trip_description text,
  badges_earned jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT trip_memories_pkey PRIMARY KEY (id),
  CONSTRAINT trip_memories_itinerary_id_fkey 
    FOREIGN KEY (itinerary_id) REFERENCES public.itineraries(id) ON DELETE CASCADE,
  CONSTRAINT trip_memories_user_id_itinerary_id_unique 
    UNIQUE(user_id, itinerary_id)
);

CREATE INDEX trip_memories_user_id_idx ON public.trip_memories(user_id);
CREATE INDEX trip_memories_itinerary_id_idx ON public.trip_memories(itinerary_id);
CREATE INDEX trip_memories_created_at_idx ON public.trip_memories(created_at);
```

## If You Still Don't See Timeline After Troubleshooting

Please provide:
1. **Console errors** (F12 → Console → expand any red errors)
2. **API response** (run the fetch command from Step 3)
3. **Database status** (does `trip_memories` table exist?)
4. **Server logs** (is backend running and showing any errors?)

---

**Feature Status**: ✅ Installed & Ready  
**Next Steps**: Create a trip and complete it to see it in your timeline!
