const express = require("express");
const supabase = require("../config/supabaseClient");
const { searchPlacesDynamic, insertPlaceFromAI, getTrendingPlaces } = require("../services/placeService.js");
const { getImagesForPlace } = require("../services/imageService");

const router = express.Router();

router.get("/places", async (req, res) => {
  try {
    // Merge query params and body for flexibility (though GET body is rare)
    const filters = { ...req.query, ...req.body };
    const places = await searchPlacesDynamic(filters);
    res.json({ source: "db", places });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/places/trending", async (req, res) => {
  try {
    const { country } = req.query; // Optional: user's country for localization
    const places = await getTrendingPlaces(country);
    res.json({ source: "db", places });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/places", async (req, res) => {
  try {
    const result = await insertPlaceFromAI(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Public GET Single Place — includes images
router.get("/places/:id", async (req, res) => {
  const { data, error } = await supabase.from('places').select('*, cities(name), countries(name)').eq('place_id', req.params.id).single();
  if (error) return res.status(404).json({ error: "Not Found" });

  // Fetch images if this place has a UUID-shaped id
  let images = [];
  try {
    // places table uses integer IDs, but we can still try fetching images 
    // if there's a linked pois record (same google_place_id) with UUID
    images = await getImagesForPlace(String(data.place_id));
  } catch (e) { /* no images */ }

  res.json({ ...data, images, img_url: images[0]?.url || null });
});

// Public GET Single City
router.get("/cities/:id", async (req, res) => {
  const { data, error } = await supabase.from('cities').select('*, countries(name)').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: "Not Found" });
  res.json(data);
});

// Public GET Single Country
router.get("/countries/:id", async (req, res) => {
  const { data, error } = await supabase.from('countries').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: "Not Found" });
  res.json(data);
});

// Relationships
router.get("/countries/:id/top-cities", async (req, res) => {
  try {
    const { getTopCities } = require("../services/placeService.js");
    const data = await getTopCities(req.params.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/countries/:id/top-pois", async (req, res) => {
  try {
    const { getTopPOIs } = require("../services/placeService.js");
    const data = await getTopPOIs(req.params.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/cities/:id/pois", async (req, res) => {
  try {
    const { getCityPOIs } = require("../services/placeService.js");
    const data = await getCityPOIs(req.params.id);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;