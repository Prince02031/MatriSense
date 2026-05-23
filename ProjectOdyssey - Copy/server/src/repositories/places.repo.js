// src/repositories/places.repo.js
// Real hierarchical Supabase search for the RAG pipeline.
// Replaces the old mock that always returned [].

const supabase = require("../config/supabaseClient");

/**
 * Search places hierarchically across countries, cities, and pois tables.
 * If a country/city is matched, drills down to fetch child POIs.
 *
 * @param {object} keywords - Extracted search keywords from Gemini
 * @param {string[]} keywords.searchQueries - 1-4 search terms
 * @param {string|null} keywords.country - Country name
 * @param {string|null} keywords.city - City/district name
 * @param {string|null} keywords.category - Category filter
 * @returns {Promise<object[]>} Flat list of results tagged with type and source
 */
async function searchPlaces(keywords) {
  // Handle legacy calls where keywords might be a plain string
  if (typeof keywords === "string") {
    keywords = { searchQueries: [keywords], country: null, city: null, category: null };
  }

  const { searchQueries = [], country, city, category } = keywords;
  const results = [];
  const seenIds = new Set(); // Deduplicate

  const addResult = (item, type) => {
    const id = String(item.id || item.place_id);
    if (seenIds.has(id)) return;
    seenIds.add(id);
    results.push({ ...item, _type: type, source: "db" });
  };

  try {
    // --- 1. Search countries ---
    const matchedCountries = [];
    for (const q of searchQueries) {
      const { data: countries } = await supabase
        .from("countries")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(3);

      if (countries) {
        for (const c of countries) {
          addResult(c, "COUNTRY");
          matchedCountries.push(c);
        }
      }
    }

    // Also try explicit country param
    if (country) {
      const { data: countryMatch } = await supabase
        .from("countries")
        .select("*")
        .ilike("name", `%${country}%`)
        .limit(1);

      if (countryMatch) {
        for (const c of countryMatch) {
          addResult(c, "COUNTRY");
          matchedCountries.push(c);
        }
      }
    }

    // Drill down: country → top cities + top POIs
    for (const c of matchedCountries) {
      // Fetch top cities for this country
      const { data: cities } = await supabase
        .from("cities")
        .select("*")
        .eq("country_id", c.id)
        .order("popularity_score", { ascending: false })
        .limit(5);

      if (cities) {
        for (const city of cities) addResult(city, "CITY");
      }

      // Fetch top POIs in this country via top_places junction
      const { data: topPlaces } = await supabase
        .from("top_places")
        .select("*, pois(*)")
        .eq("parent_id", c.id)
        .eq("parent_type", "COUNTRY")
        .order("display_order", { ascending: true })
        .limit(8);

      if (topPlaces) {
        for (const tp of topPlaces) {
          if (tp.pois) addResult(tp.pois, "POI");
        }
      }

      // Fallback: direct POIs query if top_places is empty
      if (!topPlaces || topPlaces.length === 0) {
        const { data: pois } = await supabase
          .from("pois")
          .select("*")
          .eq("country_id", c.id)
          .order("popularity_score", { ascending: false })
          .limit(8);

        if (pois) {
          for (const p of pois) addResult(p, "POI");
        }
      }
    }

    // --- 2. Search cities ---
    const matchedCities = [];
    for (const q of searchQueries) {
      const { data: cities } = await supabase
        .from("cities")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(3);

      if (cities) {
        for (const c of cities) {
          addResult(c, "CITY");
          matchedCities.push(c);
        }
      }
    }

    // Also try explicit city param
    if (city) {
      const { data: cityMatch } = await supabase
        .from("cities")
        .select("*")
        .ilike("name", `%${city}%`)
        .limit(1);

      if (cityMatch) {
        for (const c of cityMatch) {
          addResult(c, "CITY");
          matchedCities.push(c);
        }
      }
    }

    // Drill down: city → POIs
    for (const c of matchedCities) {
      // Try top_places first
      const { data: topPlaces } = await supabase
        .from("top_places")
        .select("*, pois(*)")
        .eq("parent_id", c.id)
        .eq("parent_type", "CITY")
        .order("display_order", { ascending: true })
        .limit(8);

      if (topPlaces && topPlaces.length > 0) {
        for (const tp of topPlaces) {
          if (tp.pois) addResult(tp.pois, "POI");
        }
      } else {
        // Fallback: direct pois query
        const { data: pois } = await supabase
          .from("pois")
          .select("*")
          .eq("city_id", c.id)
          .order("popularity_score", { ascending: false })
          .limit(8);

        if (pois) {
          for (const p of pois) addResult(p, "POI");
        }
      }
    }

    // --- 3. Search POIs directly by name ---
    for (const q of searchQueries) {
      let query = supabase
        .from("pois")
        .select("*")
        .ilike("name", `%${q}%`);

      if (category) {
        query = query.eq("category", category);
      }

      const { data: pois } = await query.limit(5);
      if (pois) {
        for (const p of pois) addResult(p, "POI");
      }
    }

    // --- 4. Always search places table (primary populated table — not just fallback) ---
    // Previously this only ran when pois returned 0 results, meaning BD/regional data was never reached.
    const placesFetches = [];

    for (const q of searchQueries) {
      placesFetches.push(
        supabase.from("places").select("*")
          .ilike("name", `%${q}%`)
          .limit(6)
      );
    }

    // Also fetch all places for the destination country
    if (country) {
      placesFetches.push(
        supabase.from("places").select("*")
          .ilike("country", `%${country}%`)
          .limit(10)
      );
    }

    // City name maps to region column in places table
    if (city) {
      placesFetches.push(
        supabase.from("places").select("*")
          .ilike("region", `%${city}%`)
          .limit(6)
      );
    }

    if (placesFetches.length > 0) {
      const placesSettled = await Promise.all(placesFetches);
      for (const { data: places } of placesSettled) {
        if (places) {
          for (const p of places) addResult(p, "POI");
        }
      }
    }

  } catch (err) {
    console.error("RAG search error:", err);
  }

  console.log(`[RAG] Search for [${searchQueries.join(", ")}] → ${results.length} DB results`);
  return results;
}

/**
 * Check the place_search_cache for a cached result.
 * @param {string} cacheKey - The search query string to cache against
 * @returns {Promise<object[]|null>} Cached results or null
 */
async function getCachedSearch(cacheKey) {
  try {
    const { data } = await supabase
      .from("place_search_cache")
      .select("*")
      .eq("search_query", cacheKey.toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (data && data.place_data) {
      console.log(`[RAG] Cache HIT for "${cacheKey}"`);
      return data.place_data;
    }
  } catch {
    // No cache hit — that's fine
  }
  return null;
}

/**
 * Write search results to the cache.
 * @param {string} cacheKey
 * @param {object[]} results
 * @param {number} ttlHours - Cache TTL in hours (default 24)
 */
async function setCachedSearch(cacheKey, results, ttlHours = 24) {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    await supabase
      .from("place_search_cache")
      .upsert(
        {
          search_query: cacheKey.toLowerCase(),
          place_data: results,
          expires_at: expiresAt,
        },
        { onConflict: "search_query" }
      );
    console.log(`[RAG] Cache SET for "${cacheKey}" (TTL: ${ttlHours}h)`);
  } catch (err) {
    console.error("[RAG] Cache write error:", err.message);
  }
}

module.exports = { searchPlaces, getCachedSearch, setCachedSearch };
