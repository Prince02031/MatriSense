const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

// POST /api/hospitals/seed-demo - Seed demo hospital data if empty
router.post('/seed-demo', async (req, res) => {
  try {
    const count = await Hospital.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: `Database already has ${count} hospitals. Skipping seeding.` });
    }

    const demoHospitals = [
      {
        name: 'Maternal & Child Health Training Institute (Azimpur)',
        type: 'medical_college_hospital',
        division: 'Dhaka',
        district: 'Dhaka',
        upazilaOrThana: 'Lalbagh',
        address: 'Azimpur, Dhaka',
        latitude: 23.7275,
        longitude: 90.3848,
        phone: '01711223344',
        services: ['Antenatal Care', 'Postnatal Care', 'C-Section', 'NICU', 'Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Dhaka Medical College Hospital (Obs/Gynae Dept)',
        type: 'medical_college_hospital',
        division: 'Dhaka',
        district: 'Dhaka',
        upazilaOrThana: 'Shahbagh',
        address: 'Ramna, Dhaka',
        latitude: 23.7258,
        longitude: 90.3976,
        phone: '01711556677',
        services: ['High Risk Pregnancy', 'ICU', 'C-Section', 'NICU', 'Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Mirpur Maternal and Child Health Hospital',
        type: 'maternal_clinic',
        division: 'Dhaka',
        district: 'Dhaka',
        upazilaOrThana: 'Mirpur',
        address: 'Section 1, Mirpur, Dhaka',
        latitude: 23.8022,
        longitude: 90.3524,
        phone: '01711889900',
        services: ['Antenatal Care', 'Normal Delivery', 'C-Section', 'Postnatal Care'],
        isActive: true
      },
      {
        name: 'Sylhet MAG Osmani Medical College Hospital',
        type: 'medical_college_hospital',
        division: 'Sylhet',
        district: 'Sylhet',
        upazilaOrThana: 'Sylhet Sadar',
        address: 'Kajalshah, Sylhet',
        latitude: 24.8996,
        longitude: 91.8541,
        phone: '01811223344',
        services: ['High Risk Pregnancy', 'C-Section', 'NICU', 'Emergency Obstetric Care', 'ICU'],
        isActive: true
      },
      {
        name: 'Golapganj Upazila Health Complex',
        type: 'upazila_health_complex',
        division: 'Sylhet',
        district: 'Sylhet',
        upazilaOrThana: 'Golapganj',
        address: 'Golapganj, Sylhet',
        latitude: 24.8584,
        longitude: 91.9774,
        phone: '01811556677',
        services: ['Antenatal Care', 'Normal Delivery', 'Postnatal Care', 'Basic Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Chittagong Medical College Hospital',
        type: 'medical_college_hospital',
        division: 'Chittagong',
        district: 'Chittagong',
        upazilaOrThana: 'Panchlaish',
        address: 'K.B. Fazlul Kader Road, Chittagong',
        latitude: 22.3598,
        longitude: 91.8315,
        phone: '01911223344',
        services: ['High Risk Pregnancy', 'C-Section', 'NICU', 'ICU', 'Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Patiya Upazila Health Complex',
        type: 'upazila_health_complex',
        division: 'Chittagong',
        district: 'Chittagong',
        upazilaOrThana: 'Patiya',
        address: 'Patiya Sadar, Chittagong',
        latitude: 22.2989,
        longitude: 91.9765,
        phone: '01911556677',
        services: ['Antenatal Care', 'Normal Delivery', 'Postnatal Care', 'Basic Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Cox\'s Bazar District Hospital',
        type: 'district_hospital',
        division: 'Chittagong',
        district: 'Cox\'s Bazar',
        upazilaOrThana: 'Cox\'s Bazar Sadar',
        address: 'Hospital Road, Cox\'s Bazar',
        latitude: 21.4398,
        longitude: 91.9752,
        phone: '01911889900',
        services: ['Antenatal Care', 'Normal Delivery', 'C-Section', 'Postnatal Care', 'Maternal Emergency'],
        isActive: true
      },
      {
        name: 'Rangpur Medical College Hospital',
        type: 'medical_college_hospital',
        division: 'Rangpur',
        district: 'Rangpur',
        upazilaOrThana: 'Rangpur Sadar',
        address: 'Rangpur Sadar, Rangpur',
        latitude: 25.7592,
        longitude: 89.2435,
        phone: '01511223344',
        services: ['High Risk Pregnancy', 'C-Section', 'NICU', 'ICU', 'Emergency Obstetric Care'],
        isActive: true
      },
      {
        name: 'Mithapukur Upazila Health Complex',
        type: 'upazila_health_complex',
        division: 'Rangpur',
        district: 'Rangpur',
        upazilaOrThana: 'Mithapukur',
        address: 'Mithapukur, Rangpur',
        latitude: 25.5786,
        longitude: 89.2678,
        phone: '01511556677',
        services: ['Antenatal Care', 'Normal Delivery', 'Postnatal Care', 'Basic Emergency Obstetric Care'],
        isActive: true
      }
    ];

    await Hospital.insertMany(demoHospitals);
    res.json({ success: true, message: `Successfully seeded ${demoHospitals.length} demo hospitals.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/hospitals - Query hospitals with filters
router.get('/', async (req, res) => {
  try {
    const { district, upazilaOrThana, type, service, isActive } = req.query;
    const filter = {};

    if (district) {
      filter.district = new RegExp(district.trim(), 'i');
    }
    if (upazilaOrThana) {
      filter.upazilaOrThana = new RegExp(upazilaOrThana.trim(), 'i');
    }
    if (type) {
      filter.type = type;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true; // Default active
    }
    if (service) {
      filter.services = { $in: [service] };
    }

    const hospitals = await Hospital.find(filter).sort({ name: 1 });
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/hospitals/nearby - Find nearby hospitals using Haversine formula
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, district, maxDistanceKm = 50 } = req.query;

    let hospitals = await Hospital.find({ isActive: true });

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Calculate distances using Haversine formula
      const R = 6371; // Earth's radius in km

      hospitals = hospitals.map(hosp => {
        const dLat = (hosp.latitude - lat) * Math.PI / 180;
        const dLng = (hosp.longitude - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(hosp.latitude * Math.PI / 180) * 
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km

        return {
          ...hosp.toObject(),
          distance: parseFloat(distance.toFixed(2))
        };
      });

      // Filter by max distance and sort by closest
      hospitals = hospitals
        .filter(h => h.distance <= parseFloat(maxDistanceKm))
        .sort((a, b) => a.distance - b.distance);
    } else if (district) {
      // Fallback: Filter by district if GPS not provided
      hospitals = hospitals.filter(h => h.district.toLowerCase() === district.toLowerCase());
      hospitals = hospitals.map(h => ({ ...h.toObject(), distance: null }));
    } else {
      // Return empty list if neither coordinates nor district are provided
      hospitals = [];
    }

    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
