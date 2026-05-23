# Map Search & Manual Planner Setup Guide

## 🎯 Features Implemented

### ✅ Backend Infrastructure
- **Google Maps Service** (`server/src/services/googleMapsService.js`)
  - Places Autocomplete with 7-day caching
  - Place Details with permanent caching
  - Route generation with Google Directions API
  - Daily quota protection (500/200/300 limits)
  - Automatic usage tracking

- **API Routes** (`server/src/routes/mapRoutes.js`)
  - `POST /api/map/search-places` - Search with autocomplete
  - `GET /api/map/place-details/:placeId` - Full place information
  - `POST /api/map/generate-route` - Multi-waypoint routing
  - `POST /api/map/create-manual-itinerary` - Save itinerary
  - `PUT /api/map/itinerary/:id/reorder` - Update place order
  - `GET /api/map/usage-stats` - Monitor API usage

### ✅ Frontend Components
- **MapSearch** (`client/odyssey/components/map/MapSearch.tsx`)
  - 500ms debounced search
  - Real-time autocomplete
  - Place type icons
  - "View Details" button

- **PlaceDetailsModal** (`client/odyssey/components/map/PlaceDetailsModal.tsx`)
  - Photo carousel
  - Reviews display
  - Opening hours
  - Contact information
  - "Add to Collection" action

### ✅ Database Schema
- `api_usage_logs` - Track daily API calls
- `place_search_cache` - 7-day search cache
- `places_cache` - Permanent place details cache
- Updated `itineraries` table with map routes

---

## 🚀 Setup Instructions

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Places API (New)** - For autocomplete and place details
   - **Directions API** - For route generation
   - **Geocoding API** - For fallback address lookups
4. Create credentials → API Key
5. (Optional) Restrict API key to these APIs only

### Step 2: Configure Backend

Add to `server/.env`:
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### Step 3: Setup Database

Run the schema in Supabase SQL Editor:

```bash
# Copy the content of server/sql/map_routes_schema.sql
# Paste into Supabase SQL Editor and execute
```

This creates:
- API usage tracking table
- Cache tables with auto-cleanup
- Updated itineraries schema

### Step 4: Start Services

```bash
# Terminal 1 - Backend
cd server
npm install
npm start

# Terminal 2 - Frontend  
cd client/odyssey
npm install
npm run dev
```

### Step 5: Test Map Search

1. Open http://localhost:3000
2. Click **"Destinations"** in navbar
3. Search for "Paris" or "Eiffel Tower"
4. See autocomplete suggestions
5. Click "Details →" to view full place info
6. Select a place and see it displayed

---

## 📊 API Quota Management

### Daily Limits (Free Tier - $200/month ≈ $6.60/day)
- **Autocomplete**: 500 calls/day ($2.83/1k = ~$1.42/day)
- **Place Details**: 200 calls/day ($17/1k = ~$3.40/day)
- **Directions**: 300 calls/day ($5/1k = ~$1.50/day)

### Caching Strategy
- **Search Cache**: 7 days (reduces frequent searches)
- **Place Details Cache**: Permanent (most expensive API)
- **Console Logging**: Shows cache hits vs API calls

### Monitor Usage
```bash
curl http://localhost:4000/api/map/usage-stats
```

Returns:
```json
{
  "autocomplete": { "used": 45, "limit": 500, "remaining": 455 },
  "place_details": { "used": 12, "limit": 200, "remaining": 188 },
  "directions": { "used": 8, "limit": 300, "remaining": 292 }
}
```

---

## 🧪 Testing Checklist

### Basic Search
- [ ] Search bar appears when clicking "Destinations"
- [ ] Typing shows autocomplete after 3 characters
- [ ] Results show relevant places
- [ ] Icons display correctly (🌍 🏙️ 🏖️ etc.)
- [ ] Clicking result selects the place
- [ ] Search modal closes after selection

### Place Details
- [ ] Click "Details →" opens modal
- [ ] Photos carousel works (if available)
- [ ] Rating and reviews display
- [ ] Opening hours show correctly
- [ ] Website/phone links work
- [ ] "Add to Collection" button responds
- [ ] Close button works

### Quota Protection
- [ ] Console shows "✅ Cache hit" for repeat searches
- [ ] Console shows "⚠️ API call" for new searches
- [ ] Error appears when quota exceeded
- [ ] Usage stats endpoint returns correct data

### Error Handling
- [ ] Network errors display error message
- [ ] Invalid place IDs handled gracefully
- [ ] Loading spinners work correctly
- [ ] Modal closes properly on all paths

---

## 🔍 Troubleshooting

### "Daily quota exceeded" Error
**Cause**: Reached daily API limit  
**Solution**: Wait until next day (resets at midnight PST) or increase quota

### No Search Results
**Cause**: API key not configured or APIs not enabled  
**Solution**: 
1. Check `.env` file has correct API key
2. Verify all APIs enabled in Google Cloud Console
3. Check console for error messages

### "Failed to fetch" Error
**Cause**: Backend not running or CORS issue  
**Solution**:
1. Ensure backend is running on port 4000
2. Check `server.js` has CORS configured for localhost:3000

### Photos Not Loading
**Cause**: Place Details API response may not include photos  
**Solution**: This is normal - not all places have photos in Google Maps

### Cache Not Working
**Cause**: Database schema not run  
**Solution**: Execute `map_routes_schema.sql` in Supabase

---

## 📝 Next Steps

### Immediate (Next Session)
1. **Test with real API key** - Validate all functionality
2. **Manual Itinerary Planner** - Build drag-and-drop UI
3. **Collections Tab** - Add saved places panel

### Short-term (This Sprint)
4. **Route Visualization** - Show routes on map
5. **Transport Mode Selector** - Walking/Driving/Transit
6. **Day Planner Grid** - 3-column layout for trip days

### Long-term (Future Sprints)
7. **Visit Tracking** - Geofencing & check-ins
8. **Smart Notifications** - Arrival/departure alerts
9. **Offline Maps** - Cache map tiles
10. **Share Itinerary** - Export/share functionality

---

## 🎨 UI/UX Notes

### Current Design
- Search modal: Full-screen overlay with centered card
- Autocomplete: Dropdown with icons and type tags
- Place details: Modal with photo carousel and tabs
- Colors: Blue (#2563eb) primary, gray neutrals

### Future Improvements
- Add map preview in search results
- Show distance from user location
- Add favorite/bookmark feature
- Implement recent searches
- Add search filters (type, rating, price)

---

## 💡 Tips

1. **Development**: Use cache to avoid quota exhaustion
2. **Production**: Monitor usage via `/api/map/usage-stats`
3. **Debugging**: Check console logs for cache hits vs API calls
4. **Performance**: Debounce is set to 500ms - adjust if needed
5. **API Key**: Use restrictions in production (domain + API limits)

---

## 📞 Support

**Issues?** Check:
1. Console errors (F12 → Console)
2. Network tab (F12 → Network)
3. Backend logs (terminal running npm start)
4. Database connections (Supabase dashboard)

**Still stuck?** Review:
- `server/src/services/googleMapsService.js` for API logic
- `server/src/routes/mapRoutes.js` for endpoints
- `client/odyssey/components/map/MapSearch.tsx` for frontend logic

---

Generated on: ${new Date().toLocaleDateString()}
