/**
 * Test script to create a sample trip update post
 * 
 * Usage:
 * 1. Make sure your backend server is running (npm run dev in server folder)
 * 2. Login to get your JWT token
 * 3. Replace YOUR_JWT_TOKEN with your actual token
 * 4. Run: node server/scripts/test-trip-update.js
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000/api';

// Sample trip update data
const sampleTripUpdate = {
  tripId: 'test-trip-123',
  tripName: 'Amazing Europe Adventure',
  tripProgress: {
    locations: [
      {
        name: 'Eiffel Tower',
        placeId: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
        visitedAt: new Date('2024-03-01T10:00:00Z'),
        photos: [
          'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f',
          'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'
        ],
        isCurrentLocation: false
      },
      {
        name: 'Louvre Museum',
        placeId: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
        visitedAt: new Date('2024-03-01T14:00:00Z'),
        photos: [
          'https://images.unsplash.com/photo-1499856871958-5b9627545d1a'
        ],
        isCurrentLocation: false
      },
      {
        name: 'Arc de Triomphe',
        placeId: 'ChIJjx37cOxv5kcRA-0cGGvOyC4',
        visitedAt: new Date('2024-03-02T09:00:00Z'),
        photos: [
          'https://images.unsplash.com/photo-1550340499-a6c60fc8287c'
        ],
        isCurrentLocation: true
      }
    ],
    currentLocationName: 'Arc de Triomphe',
    totalLocations: 5,
    completionPercentage: 60
  }
};

async function createTripUpdate(token) {
  try {
    console.log('🚀 Creating trip update post...\n');
    
    const response = await fetch(`${API_URL}/posts/trip-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sampleTripUpdate)
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Trip update post created successfully!\n');
      console.log('Post Details:');
      console.log('- ID:', data.data._id);
      console.log('- Type:', data.data.type);
      console.log('- Trip Name:', data.data.tripName);
      console.log('- Locations:', data.data.tripProgress.locations.length);
      console.log('- Current Location:', data.data.tripProgress.currentLocationName);
      console.log('- Completion:', data.data.tripProgress.completionPercentage + '%');
      console.log('\n🎉 You can now view this trip update in your feed!');
    } else {
      console.error('❌ Error creating trip update:', data.error);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Get token from command line argument or prompt
const token = process.argv[2];

if (!token) {
  console.log('⚠️  Usage: node test-trip-update.js YOUR_JWT_TOKEN\n');
  console.log('How to get your token:');
  console.log('1. Login to your app in the browser');
  console.log('2. Open DevTools > Application > Local Storage');
  console.log('3. Copy the "token" value');
  console.log('4. Run: node server/scripts/test-trip-update.js <your-token>\n');
} else {
  createTripUpdate(token);
}

module.exports = { createTripUpdate, sampleTripUpdate };
