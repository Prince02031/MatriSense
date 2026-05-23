#!/usr/bin/env bash
# Quick Verification Script to Check All Geofencing Files

echo "🔍 Verifying Geofencing Implementation..."
echo ""

# Backend Files
echo "✅ BACKEND FILES:"
if [ -f "server/src/services/geofenceService.js" ]; then
  SIZE=$(wc -c < "server/src/services/geofenceService.js")
  echo "   ✓ geofenceService.js ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ geofenceService.js NOT FOUND"
fi

if [ -f "server/src/models/VisitLog.js" ]; then
  SIZE=$(wc -c < "server/src/models/VisitLog.js")
  echo "   ✓ VisitLog.js ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ VisitLog.js NOT FOUND"
fi

if [ -f "server/src/routes/visitRoutes.js" ]; then
  SIZE=$(wc -c < "server/src/routes/visitRoutes.js")
  echo "   ✓ visitRoutes.js ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ visitRoutes.js NOT FOUND"
fi

echo ""
echo "✅ FRONTEND FILES:"
if [ -f "client/odyssey/app/hooks/useGeofencing.ts" ]; then
  SIZE=$(wc -c < "client/odyssey/app/hooks/useGeofencing.ts")
  echo "   ✓ useGeofencing.ts ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ useGeofencing.ts NOT FOUND"
fi

if [ -f "client/odyssey/app/components/PlaceVisitCard.tsx" ]; then
  SIZE=$(wc -c < "client/odyssey/app/components/PlaceVisitCard.tsx")
  echo "   ✓ PlaceVisitCard.tsx ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ PlaceVisitCard.tsx NOT FOUND"
fi

if [ -f "client/odyssey/app/components/GeofenceSettingsModal.tsx" ]; then
  SIZE=$(wc -c < "client/odyssey/app/components/GeofenceSettingsModal.tsx")
  echo "   ✓ GeofenceSettingsModal.tsx ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ GeofenceSettingsModal.tsx NOT FOUND"
fi

if [ -f "client/odyssey/app/components/TripGeofencingView.tsx" ]; then
  SIZE=$(wc -c < "client/odyssey/app/components/TripGeofencingView.tsx")
  echo "   ✓ TripGeofencingView.tsx ($(($SIZE / 1024)) KB)"
else
  echo "   ✗ TripGeofencingView.tsx NOT FOUND"
fi

echo ""
echo "📚 DOCUMENTATION FILES:"
if [ -f "GEOFENCING_COMPLETE_PACKAGE.md" ]; then
  echo "   ✓ GEOFENCING_COMPLETE_PACKAGE.md"
else
  echo "   ✗ GEOFENCING_COMPLETE_PACKAGE.md NOT FOUND"
fi

if [ -f "GEOFENCING_FRONTEND_INTEGRATION.md" ]; then
  echo "   ✓ GEOFENCING_FRONTEND_INTEGRATION.md"
else
  echo "   ✗ GEOFENCING_FRONTEND_INTEGRATION.md NOT FOUND"
fi

if [ -f "GEOFENCING_USER_EXPERIENCE.md" ]; then
  echo "   ✓ GEOFENCING_USER_EXPERIENCE.md"
else
  echo "   ✗ GEOFENCING_USER_EXPERIENCE.md NOT FOUND"
fi

if [ -f "ProjectOdyssey-Geofencing.postman_collection.json" ]; then
  echo "   ✓ ProjectOdyssey-Geofencing.postman_collection.json"
else
  echo "   ✗ ProjectOdyssey-Geofencing.postman_collection.json NOT FOUND"
fi

echo ""
echo "🚀 QUICK START:"
echo ""
echo "1. Backend:"
echo "   cd server && npm run dev"
echo ""
echo "2. Frontend:"
echo "   cd client/odyssey"
echo "   echo 'NEXT_PUBLIC_API_URL=http://localhost:5000/api' > .env.local"
echo "   npm run dev"
echo ""
echo "3. Verify:"
echo "   - Open http://localhost:3000 in browser"
echo "   - Allow location permission"
echo "   - Navigate to active trip"
echo "   - See geofencing component"
echo ""
echo "✨ DONE! Your geofencing system is ready to test."
