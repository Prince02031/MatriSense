# ODYSSEY - PLACES DATA STRUCTURE DOCUMENTATION
**Version 1.0 | Last Updated: January 2026**

---

## 📋 TABLE OF CONTENTS
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Database Schema](#database-schema)
5. [Key Features](#key-features)
6. [API Endpoints](#api-endpoints)
7. [Search Implementation](#search-implementation)
8. [Performance Optimization](#performance-optimization)

---

## 🎯 OVERVIEW

The Places system in Odyssey is a hierarchical data structure designed to store and manage geographic locations and points of interest. The system supports three levels of geographic data:

```
Country (Japan)
  └── City (Tokyo)
      └── POI (Sensō-ji Temple)
```

### Design Principles
- **Hierarchical Structure**: Country → City → POI
- **Polymorphic Relationships**: Reviews and images can belong to any place type
- **Geospatial Capabilities**: PostGIS for location-based queries
- **Search Optimized**: Full-text search across all place types
- **Categorization**: POIs organized into Urban, Nature, and History categories
- **Statistics Caching**: Automatic statistics updates via database triggers

---

## 🏗️ ARCHITECTURE

### Class Hierarchy (OOP)

```typescript
IPlace (Base Interface)
  ├── ICountry → Country Class
  ├── ICity → City Class
  └── IPOI → POI Class

Supporting Classes:
  ├── Review
  ├── PlaceImage
  ├── OpeningHours
  ├── EntryFee
  └── AccessibilityInfo
```

### Database Tables

**Core Tables:**
- `countries` - Country-level data
- `cities` - City-level data  
- `pois` - Point of Interest data
- `place_images` - Images for all place types
- `reviews` - Reviews for all place types
- `review_images` - Review photo attachments

**Relationship Tables:**
- `nearby_pois` - POI proximity relationships
- `top_places` - Featured places for countries/cities

**Optimization:**
- `popular_places` - Materialized view for trending places

---

## 📊 DATA MODELS

### 1. COUNTRY

**Purpose**: Represents a country with basic information and travel details

**Key Fields:**
```typescript
{
  id: UUID
  name: "Japan"
  slug: "japan"
  description: "Full country description..."
  shortDescription: "Brief overview..."
  
  // Location
  googlePlaceId: "ChIJLxl_1w9OZzQRRFJmfNR1QvU"
  latitude: 36.2048
  longitude: 138.2529
  
  // Country-specific
  countryCode: "JP"          // ISO 3166-1 alpha-2
  continent: "Asia"
  capital: "Tokyo"
  currency: "JPY"
  languages: ["Japanese"]
  population: 125800000
  area: 377975.0            // sq km
  
  // Travel Info
  visaRequired: true
  bestTimeToVisit: "March to May"
  
  // Statistics (auto-calculated)
  totalReviews: 245
  averageRating: 4.7
  totalVisitors: 5890
  popularityScore: 8750
  
  // Relations
  cities: [cityId1, cityId2, ...]
  topPOIs: [poiId1, poiId2, ...]
}
```

**Use Cases:**
- Browse destinations by country
- Display country overview pages
- Filter cities by country
- Show country-level statistics

---

### 2. CITY

**Purpose**: Represents a city with places of interest

**Key Fields:**
```typescript
{
  id: UUID
  name: "Tokyo"
  slug: "tokyo"
  description: "Full city description..."
  shortDescription: "Brief overview..."
  
  // Location
  googlePlaceId: "ChIJ51cu8IcbXWARiRtXIothAS4"
  latitude: 35.6762
  longitude: 139.6503
  
  // City-specific
  countryId: UUID                    // Parent country
  countryName: "Japan"               // Denormalized for display
  stateProvince: "Tokyo Prefecture"
  population: 14000000
  area: 2194.0                       // sq km
  
  // Travel Info
  bestTimeToVisit: "March to May, September to November"
  averageTemperature: "15-25°C"
  famousFor: ["Technology", "Anime", "Sushi", "Temples"]
  
  // POI Breakdown (auto-calculated)
  poiBreakdown: {
    urban: 234,
    nature: 67,
    history: 145
  }
  
  // Statistics
  totalReviews: 892
  averageRating: 4.8
  totalVisitors: 12340
  popularityScore: 9200
  
  // Relations
  pois: [poiId1, poiId2, ...]
  topPOIs: [poiId1, poiId2, ...]  // Featured POIs
}
```

**Use Cases:**
- City detail pages
- Browse POIs by city
- Show city statistics
- Filter POIs by category within a city

---

### 3. POI (Point of Interest)

**Purpose**: Represents a specific place/attraction within a city

**Key Fields:**
```typescript
{
  id: UUID
  name: "Sensō-ji Temple"
  slug: "senso-ji-temple"
  description: "Detailed attraction description..."
  shortDescription: "Tokyo's oldest Buddhist temple..."
  
  // Location
  googlePlaceId: "ChIJ8T1GpMGOGGARIcz6d_gDkSE"
  latitude: 35.7148
  longitude: 139.7967
  
  // Hierarchy
  cityId: UUID
  cityName: "Tokyo"
  countryId: UUID
  countryName: "Japan"
  
  // Categorization
  category: "HISTORY"                      // URBAN | NATURE | HISTORY
  subCategory: "TEMPLE"                    // More specific type
  tags: ["cultural", "photography", "family-friendly"]
  
  // Location Details
  address: "2-3-1 Asakusa, Taito City, Tokyo 111-0032"
  neighborhood: "Asakusa"
  
  // Visit Information
  openingHours: {
    monday: { isOpen: true, openTime: "06:00", closeTime: "17:00" },
    // ... other days
    specialHours: "Extended hours during festivals"
  }
  
  entryFee: {
    isFree: true,
    adultPrice: null,
    childPrice: null,
    currency: "JPY",
    notes: "Free admission"
  }
  
  estimatedDuration: "1-2 hours"
  
  // Accessibility
  accessibility: {
    wheelchairAccessible: true,
    publicTransportNearby: true,
    parkingAvailable: false,
    accessibilityNotes: "Wheelchair ramps available at main entrance"
  }
  
  // Contact
  website: "https://www.senso-ji.jp"
  phoneNumber: "+81-3-3842-0181"
  email: null
  
  // Features
  amenities: ["restroom", "gift-shop", "food-nearby", "wifi"]
  features: ["photography", "guided-tours", "religious-site"]
  
  // Best Time
  bestTimeOfDay: "Early morning"
  bestSeason: "Spring"
  crowdLevel: "High"
  
  // Statistics
  totalReviews: 1234
  averageRating: 4.8
  totalVisitors: 5670
  popularityScore: 9500
  
  // Relations
  reviews: [reviewId1, reviewId2, ...]
  nearbyPOIs: [poiId1, poiId2, ...]
}
```

**POI Categories:**

**URBAN:**
- RESTAURANT
- SHOPPING
- ENTERTAINMENT
- NIGHTLIFE

**NATURE:**
- BEACH
- MOUNTAIN
- PARK
- WILDLIFE
- SCENIC_VIEW

**HISTORY:**
- MUSEUM
- MONUMENT
- TEMPLE
- PALACE
- ARCHAEOLOGICAL
- CULTURAL_CENTER

**Use Cases:**
- POI detail pages
- Search by category
- Add to trip itineraries
- Display nearby attractions
- Show on map

---

### 4. REVIEW

**Purpose**: User reviews for any place (Country/City/POI)

**Key Fields:**
```typescript
{
  id: UUID
  placeId: UUID                      // Can reference country, city, or POI
  placeType: "POI"                   // COUNTRY | CITY | POI
  placeName: "Sensō-ji Temple"
  
  // User Info
  userId: UUID
  userName: "Alex Rivera"
  userAvatar: "https://..."
  
  // Review Content
  rating: 5                          // 1-5 stars
  title: "Breathtaking temple experience!"
  comment: "Tokyo's oldest temple is a must-visit..."
  visitDate: "2024-03-15"
  
  // Media
  images: [
    {
      id: UUID,
      url: "https://...",
      caption: "Main hall at sunset",
      uploadedAt: Date
    }
  ]
  
  // Metadata
  helpfulCount: 42
  isVerified: true
  wasEdited: false
  
  createdAt: Date
  updatedAt: Date
}
```

**Use Cases:**
- Display reviews on place detail pages
- Calculate average ratings
- Show user's travel history
- Community validation

---

### 5. PLACE IMAGE

**Purpose**: Photos for countries, cities, and POIs

**Key Fields:**
```typescript
{
  id: UUID
  url: "https://..."
  caption: "Cherry blossoms at peak bloom"
  altText: "Pink cherry blossom trees"
  displayOrder: 1
  
  // Polymorphic relationship
  placeId: UUID
  placeType: "CITY"
  
  // Upload info
  uploadedBy: UUID
  isVerified: true
  uploadedAt: Date
}
```

---

## 🗄️ DATABASE SCHEMA

### PostGIS Configuration

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Key Schema Features

**1. Geospatial Columns:**
```sql
location GEOGRAPHY(POINT, 4326) NOT NULL
latitude DECIMAL(10, 8) NOT NULL
longitude DECIMAL(11, 8) NOT NULL
```

**2. Full-Text Search Indexes:**
```sql
CREATE INDEX idx_pois_name_search ON pois 
  USING GIN(to_tsvector('english', name));
```

**3. Spatial Indexes:**
```sql
CREATE INDEX idx_pois_location ON pois 
  USING GIST(location);
```

**4. Statistics Auto-Update Triggers:**
```sql
-- Automatically updates place statistics when reviews change
CREATE TRIGGER trg_update_place_statistics
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_place_statistics();
```

**5. Category Count Triggers:**
```sql
-- Automatically updates city POI counts by category
CREATE TRIGGER trg_update_city_poi_counts
AFTER INSERT OR UPDATE OR DELETE ON pois
FOR EACH ROW
EXECUTE FUNCTION update_city_poi_counts();
```

---

## 🔑 KEY FEATURES

### 1. **Hierarchical Navigation**

Users can browse in multiple ways:

```
Option 1: Country → Cities → POIs
Example: Japan → Tokyo → Sensō-ji Temple

Option 2: Direct POI Search
Example: Search "Disneyland California" → Direct to POI page

Option 3: City Search
Example: Search "New York" → City page with POI list below
```

### 2. **Smart Categorization**

POIs are organized into three main categories:

- **Urban**: Shopping, dining, entertainment, nightlife
- **Nature**: Parks, beaches, mountains, natural landmarks
- **History**: Museums, monuments, temples, cultural sites

Each category has sub-categories for more specific filtering.

### 3. **Geospatial Queries**

Using PostGIS for location-based features:

```sql
-- Find POIs within 5km radius
SELECT * FROM find_pois_within_radius(35.6762, 139.6503, 5.0);

-- Calculate distance between two points
SELECT calculate_distance(35.6762, 139.6503, 35.7148, 139.7967);

-- Find nearby POIs automatically
SELECT * FROM pois 
WHERE ST_DWithin(
  location, 
  ST_SetSRID(ST_MakePoint(139.6503, 35.6762), 4326)::geography,
  5000
);
```

### 4. **Polymorphic Relationships**

Reviews and images can belong to any place type:

```typescript
// Same review structure works for all places
const countryReview: Review = {
  placeId: "japan-id",
  placeType: "COUNTRY",
  rating: 5,
  comment: "Amazing country!"
};

const poiReview: Review = {
  placeId: "temple-id",
  placeType: "POI",
  rating: 5,
  comment: "Beautiful temple!"
};
```

### 5. **Automatic Statistics**

Statistics update automatically via database triggers:
- Total reviews
- Average rating
- Total visitors
- Popularity score

No manual calculation needed!

### 6. **Performance Optimization**

**Materialized View for Popular Places:**
```sql
-- Pre-computed popular places (refresh daily)
REFRESH MATERIALIZED VIEW popular_places;

-- Fast retrieval
SELECT * FROM popular_places LIMIT 20;
```

**Denormalized Fields:**
- `countryName` in cities table (avoid joins)
- `cityName` and `countryName` in POIs table
- POI category counts in cities table

---

## 🔍 SEARCH IMPLEMENTATION

### Multi-Type Search

Users can search across all place types simultaneously:

```typescript
// Example search for "Disneyland"
interface SearchResult {
  type: 'COUNTRY' | 'CITY' | 'POI';
  id: string;
  name: string;
  location: string;
  rating: number;
  image: string;
}

// Search query (SQL)
SELECT 'POI' as type, id, name, city_name as location, average_rating, cover_image
FROM pois
WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', 'disneyland')

UNION ALL

SELECT 'CITY' as type, id, name, country_name as location, average_rating, cover_image
FROM cities
WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', 'disneyland')

ORDER BY average_rating DESC, popularity_score DESC;
```

### Autocomplete Implementation

```typescript
// Fast autocomplete using indexed searches
const autocomplete = async (query: string) => {
  const results = await db.query(`
    SELECT name, slug, 'POI' as type 
    FROM pois 
    WHERE name ILIKE $1 
    LIMIT 5
    
    UNION ALL
    
    SELECT name, slug, 'CITY' as type 
    FROM cities 
    WHERE name ILIKE $1 
    LIMIT 5
  `, [`${query}%`]);
  
  return results;
};
```

### Filter by Category

```typescript
// Filter POIs by category in a city
const getUrbanPOIs = async (cityId: string) => {
  return await db.query(`
    SELECT * FROM pois
    WHERE city_id = $1 AND category = 'URBAN'
    ORDER BY popularity_score DESC
  `, [cityId]);
};
```

---

## 🚀 API ENDPOINTS

### Suggested REST API Structure

```typescript
// COUNTRIES
GET    /api/countries                    // List all countries
GET    /api/countries/:slug              // Get country details
GET    /api/countries/:id/cities         // Get cities in country
GET    /api/countries/:id/top-pois       // Get featured POIs

// CITIES
GET    /api/cities                       // List all cities
GET    /api/cities/:slug                 // Get city details
GET    /api/cities/:id/pois              // Get all POIs in city
GET    /api/cities/:id/pois/:category    // Get POIs by category
GET    /api/cities/:id/top-pois          // Get featured POIs

// POIS
GET    /api/pois                         // List POIs (with filters)
GET    /api/pois/:slug                   // Get POI details
GET    /api/pois/:id/nearby              // Get nearby POIs
GET    /api/pois/:id/reviews             // Get POI reviews

// SEARCH
GET    /api/search?q=disneyland          // Multi-type search
GET    /api/search/autocomplete?q=tokyo  // Autocomplete suggestions

// REVIEWS
GET    /api/places/:id/reviews           // Get reviews for any place
POST   /api/places/:id/reviews           // Add review
PUT    /api/reviews/:id                  // Update review
DELETE /api/reviews/:id                  // Delete review
POST   /api/reviews/:id/helpful          // Mark review as helpful

// IMAGES
GET    /api/places/:id/images            // Get place images
POST   /api/places/:id/images            // Upload image
DELETE /api/images/:id                   // Delete image
```

### Example API Response

```json
// GET /api/pois/senso-ji-temple
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Sensō-ji Temple",
  "slug": "senso-ji-temple",
  "description": "Tokyo's oldest and most significant Buddhist temple...",
  "shortDescription": "Ancient Buddhist temple in Asakusa",
  "location": {
    "latitude": 35.7148,
    "longitude": 139.7967,
    "address": "2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan",
    "neighborhood": "Asakusa"
  },
  "city": {
    "id": "...",
    "name": "Tokyo",
    "slug": "tokyo"
  },
  "country": {
    "id": "...",
    "name": "Japan",
    "slug": "japan"
  },
  "category": "HISTORY",
  "subCategory": "TEMPLE",
  "tags": ["cultural", "photography", "family-friendly"],
  "coverImage": "https://...",
  "images": [
    {
      "url": "https://...",
      "caption": "Main hall",
      "altText": "Red temple building"
    }
  ],
  "visitInfo": {
    "openingHours": {
      "monday": { "isOpen": true, "open": "06:00", "close": "17:00" }
    },
    "entryFee": {
      "isFree": true
    },
    "estimatedDuration": "1-2 hours",
    "bestTimeOfDay": "Early morning",
    "crowdLevel": "High"
  },
  "stats": {
    "averageRating": 4.8,
    "totalReviews": 1234,
    "totalVisitors": 5670,
    "popularityScore": 9500
  },
  "amenities": ["restroom", "gift-shop", "wifi"],
  "accessibility": {
    "wheelchairAccessible": true,
    "publicTransportNearby": true
  },
  "nearby": [
    {
      "id": "...",
      "name": "Tokyo Skytree",
      "distance": 2.3,
      "category": "URBAN"
    }
  ]
}
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### 1. **Indexing Strategy**

```sql
-- Spatial indexes for location queries
CREATE INDEX idx_pois_location ON pois USING GIST(location);

-- Full-text search indexes
CREATE INDEX idx_pois_name_search ON pois 
  USING GIN(to_tsvector('english', name));

-- Filter indexes
CREATE INDEX idx_pois_category ON pois(category);
CREATE INDEX idx_pois_city_id ON pois(city_id);

-- Sort indexes
CREATE INDEX idx_pois_popularity ON pois(popularity_score DESC);
CREATE INDEX idx_pois_rating ON pois(average_rating DESC);
```

### 2. **Denormalization**

Store frequently accessed data redundantly:

```typescript
// POI stores parent names to avoid joins
interface IPOI {
  cityId: string;
  cityName: string;      // Denormalized
  countryId: string;
  countryName: string;   // Denormalized
}

// City stores POI counts
interface ICity {
  poiBreakdown: {
    urban: number;       // Pre-calculated
    nature: number;
    history: number;
  }
}
```

### 3. **Materialized Views**

Pre-compute expensive queries:

```sql
-- Popular places view (refresh daily)
CREATE MATERIALIZED VIEW popular_places AS
SELECT /* ... expensive query ... */;

-- Refresh at 2 AM daily (cron job)
REFRESH MATERIALIZED VIEW popular_places;
```

### 4. **Caching Strategy**

```typescript
// Cache frequently accessed data
const cache = {
  // Cache for 1 hour
  popularPlaces: { ttl: 3600 },
  
  // Cache for 24 hours
  countryList: { ttl: 86400 },
  
  // Cache for 5 minutes
  poiDetails: { ttl: 300 }
};

// Implementation
const getPopularPlaces = async () => {
  const cached = await redis.get('popular_places');
  if (cached) return JSON.parse(cached);
  
  const data = await db.query('SELECT * FROM popular_places');
  await redis.setex('popular_places', 3600, JSON.stringify(data));
  
  return data;
};
```

### 5. **Pagination**

Always paginate large result sets:

```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

// Example: GET /api/pois?page=2&limit=20&sortBy=rating&sortOrder=DESC
const getPOIs = async (params: PaginationParams) => {
  const offset = (params.page - 1) * params.limit;
  
  return await db.query(`
    SELECT * FROM pois
    ORDER BY ${params.sortBy} ${params.sortOrder}
    LIMIT $1 OFFSET $2
  `, [params.limit, offset]);
};
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Core Structure
- [ ] Set up PostgreSQL with PostGIS
- [ ] Create database tables
- [ ] Implement triggers for auto-statistics
- [ ] Set up spatial indexes
- [ ] Create TypeScript models/classes

### Phase 2: Data Population
- [ ] Import country data
- [ ] Import city data
- [ ] Import POI data from Google Places API
- [ ] Generate slugs for all places
- [ ] Set up default images

### Phase 3: Search & Discovery
- [ ] Implement full-text search
- [ ] Build autocomplete functionality
- [ ] Create category filters
- [ ] Build geospatial "nearby" queries
- [ ] Implement popularity scoring algorithm

### Phase 4: User Features
- [ ] Review submission system
- [ ] Image upload functionality
- [ ] "Add to collection" feature
- [ ] "Add to itinerary" feature
- [ ] User visit tracking

### Phase 5: Optimization
- [ ] Create materialized views
- [ ] Set up Redis caching
- [ ] Implement CDN for images
- [ ] Set up database replication
- [ ] Add monitoring and alerts

---

## 🎨 FRONTEND INTEGRATION

### Place Detail Page Component

```typescript
// components/PlaceDetail.tsx
interface PlaceDetailProps {
  place: IPOI | ICity | ICountry;
  placeType: 'POI' | 'CITY' | 'COUNTRY';
}

const PlaceDetail = ({ place, placeType }) => {
  return (
    <div className="bg-[#FFF5E9] min-h-screen">
      {/* Hero Section with Image */}
      <div className="h-96 relative">
        <img src={place.coverImage} className="w-full h-full object-cover" />
        <div className="absolute bottom-8 left-8">
          <h1 className="text-5xl font-bold text-white">{place.name}</h1>
          <p className="text-white text-lg">{place.shortDescription}</p>
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 -mt-8 px-8">
        <StatCard icon="⭐" value={place.stats.averageRating} label="Rating" />
        <StatCard icon="📝" value={place.stats.totalReviews} label="Reviews" />
        <StatCard icon="👥" value={place.stats.totalVisitors} label="Visitors" />
        <StatCard icon="🔥" value={place.stats.popularityScore} label="Popularity" />
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Description */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4">About</h2>
          <p className="text-gray-700">{place.description}</p>
        </section>
        
        {/* POI-specific: Visit Info */}
        {placeType === 'POI' && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4">Visit Information</h2>
            <VisitInfo poi={place as IPOI} />
          </section>
        )}
        
        {/* City-specific: POI Categories */}
        {placeType === 'CITY' && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4">Explore</h2>
            <CategoryTabs city={place as ICity} />
          </section>
        )}
        
        {/* Reviews Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Reviews</h2>
          <ReviewsList placeId={place.id} />
        </section>
        
        {/* Image Gallery */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Photos</h2>
          <ImageGallery images={place.images} />
        </section>
      </div>
    </div>
  );
};
```

---

## 📚 ADDITIONAL RESOURCES

### Google Places API Integration

```typescript
// Sync POI data from Google Places
const syncFromGooglePlaces = async (googlePlaceId: string) => {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&key=${API_KEY}`
  );
  
  const data = await response.json();
  
  return {
    name: data.result.name,
    latitude: data.result.geometry.location.lat,
    longitude: data.result.geometry.location.lng,
    address: data.result.formatted_address,
    phoneNumber: data.result.formatted_phone_number,
    website: data.result.website,
    rating: data.result.rating,
    photos: data.result.photos?.map(p => p.photo_reference)
  };
};
```

### Seeding Script Example

```typescript
// scripts/seed-places.ts
const seedDatabase = async () => {
  // 1. Import countries from CSV
  const countries = await importCountries('data/countries.csv');
  
  // 2. Import cities from CSV
  const cities = await importCities('data/cities.csv');
  
  // 3. Import POIs from Google Places
  for (const city of cities) {
    const pois = await fetchPOIsFromGoogle(city.latitude, city.longitude);
    await insertPOIs(pois, city.id);
  }
  
  // 4. Calculate nearby POIs
  await calculateNearbyPOIs();
  
  // 5. Generate popularity scores
  await generatePopularityScores();
};
```

---

**END OF DOCUMENTATION**

For questions or contributions, contact the Odyssey development team.