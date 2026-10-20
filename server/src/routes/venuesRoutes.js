import express from 'express';
import { store } from '../store.js';
import { providerRegistry } from '../services/providers/ProviderRegistry.js';
import { geocodingService } from '../services/GeocodingService.js';

const router = express.Router();

// Popular curated Indian travel destinations for instant zero-latency suggestions
const CURATED_DESTINATIONS = [
  { name: 'Udupi', state: 'Karnataka', tag: 'Beachfront Resorts & Temple Coast', count: 6, highlight: 'Malpe Beach, Kaup Lighthouse, St. Marys Island' },
  { name: 'Mangalore', state: 'Karnataka', tag: 'Arabian Sea Shoreline & Coastal Food', count: 5, highlight: 'Panambur Beach, Tannirbhavi, Someshwara' },
  { name: 'Goa', state: 'Goa', tag: 'Beaches & Heritage', count: 18, highlight: 'Baga, Anjuna, Palolem' },
  { name: 'Manali', state: 'Himachal Pradesh', tag: 'Snow Peaks & Valleys', count: 12, highlight: 'Solang Valley, Old Manali' },
  { name: 'Jaipur', state: 'Rajasthan', count: 14, highlight: 'Amber Fort, Hawa Mahal' },
  { name: 'Kerala', state: 'Kerala', tag: 'Backwaters & Spice Hills', count: 15, highlight: 'Alleppey, Munnar, Kochi' },
  { name: 'Udaipur', state: 'Rajasthan', tag: 'Lakes & Royal Palaces', count: 11, highlight: 'Lake Pichola, City Palace' },
  { name: 'Varanasi', state: 'Uttar Pradesh', tag: 'Ghats & Spiritual Culture', count: 10, highlight: 'Dashashwamedh Ghat, Sarnath' },
  { name: 'Leh Ladakh', state: 'Ladakh', tag: 'High Altitude & Monasteries', count: 8, highlight: 'Pangong Tso, Nubra Valley' },
  { name: 'Rishikesh', state: 'Uttarakhand', tag: 'Yoga & River Rafting', count: 9, highlight: 'Laxman Jhula, Ganga Aarti' },
  { name: 'Gokarna', state: 'Karnataka', tag: 'Secluded Beaches & Treks', count: 7, highlight: 'Om Beach, Kudle Beach' },
  { name: 'Ooty', state: 'Tamil Nadu', tag: 'Nilgiri Hills & Tea Gardens', count: 8, highlight: 'Nilgiri Toy Train, Doddabetta' },
  { name: 'Munnar', state: 'Kerala', tag: 'Cloud Forests & Waterfalls', count: 9, highlight: 'Tea Estates, Anamudi Peak' },
  { name: 'Darjeeling', state: 'West Bengal', tag: 'Himalayan Railway & Tea', count: 7, highlight: 'Tiger Hill, Batasia Loop' },
  { name: 'Coorg', state: 'Karnataka', tag: 'Coffee Plantations & Mist', count: 8, highlight: 'Abbey Falls, Raja Seat' },
  { name: 'Pondicherry', state: 'Puducherry', tag: 'French Colony & Seaside', count: 10, highlight: 'White Town, Promenade Beach' },
  { name: 'Agra', state: 'Uttar Pradesh', tag: 'Taj Mahal & Mughal Marvels', count: 9, highlight: 'Taj Mahal, Agra Fort' },
  { name: 'Mumbai', state: 'Maharashtra', tag: 'City of Dreams & Coastal Hub', count: 20, highlight: 'Marine Drive, Bandra' },
  { name: 'Bengaluru', state: 'Karnataka', tag: 'Garden City & Microbreweries', count: 16, highlight: 'Cubbon Park, Indiranagar' },
  { name: 'New Delhi', state: 'Delhi NCR', tag: 'Monuments, Bazaars & Food', count: 22, highlight: 'India Gate, Chandni Chowk' },
  { name: 'Shimla', state: 'Himachal Pradesh', tag: 'Colonial Architecture & Pines', count: 8, highlight: 'Mall Road, Jakhoo Temple' },
  { name: 'Amritsar', state: 'Punjab', tag: 'Golden Temple & Culinary Trail', count: 7, highlight: 'Harmandir Sahib, Wagah Border' },
  { name: 'Jodhpur', state: 'Rajasthan', tag: 'Blue City & Mehrangarh Fort', count: 8, highlight: 'Mehrangarh Fort, Clock Tower' },
  { name: 'Jaisalmer', state: 'Rajasthan', tag: 'Golden Sand Dunes & Safaris', count: 6, highlight: 'Sam Sand Dunes, Golden Fort' },
  { name: 'Shillong', state: 'Meghalaya', tag: 'Scotland of the East', count: 5, highlight: 'Elephant Falls, Umiam Lake' },
  { name: 'Andaman Islands', state: 'Andaman & Nicobar', tag: 'Coral Reefs & Blue Lagoons', count: 8, highlight: 'Havelock Island, Radhanagar Beach' },
];

// GET /api/venues/autocomplete - Typeahead place and destination recommendations
router.get('/autocomplete', async (req, res) => {
  const query = (req.query.query || req.query.text || '').trim().toLowerCase();

  // If no query, return top featured destinations
  if (!query) {
    const defaultSuggestions = CURATED_DESTINATIONS.slice(0, 8).map(dest => ({
      id: `dest-${dest.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: dest.name,
      subtext: `${dest.state}, India`,
      tag: dest.tag,
      highlight: dest.highlight,
      type: 'popular_destination',
      source: 'curated',
    }));

    return res.json({
      success: true,
      query: '',
      data: defaultSuggestions,
    });
  }

  const suggestions = [];
  const seenNames = new Set();

  // 1. Check curated Indian destinations first for rich contextual match
  const curatedMatches = CURATED_DESTINATIONS.filter(d => 
    d.name.toLowerCase().includes(query) ||
    d.state.toLowerCase().includes(query) ||
    d.tag.toLowerCase().includes(query) ||
    d.highlight.toLowerCase().includes(query)
  );

  for (const m of curatedMatches) {
    seenNames.add(m.name.toLowerCase());
    suggestions.push({
      id: `dest-${m.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: m.name,
      subtext: `${m.state}, India`,
      tag: m.tag,
      highlight: m.highlight,
      type: 'destination',
      source: 'curated',
    });
  }

  // 2. Query Google Places (New) Autocomplete if key is configured
  if (providerRegistry.adapters.google_places.isConfigured() && query.length >= 2) {
    try {
      const googleSuggestions = await providerRegistry.adapters.google_places.autocomplete({
        input: query,
      });
      for (const gs of googleSuggestions) {
        const key = gs.name.toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          suggestions.push(gs);
        }
      }
    } catch (gErr) {
      console.warn('Google Places autocomplete error:', gErr.message);
    }
  }

  // 3. Query Geoapify Places & Geocoding Autocomplete if key is configured
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyKey && query.length >= 2) {
    try {
      const geoUrl = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
      geoUrl.searchParams.set('text', query);
      geoUrl.searchParams.set('filter', 'countrycode:in');
      geoUrl.searchParams.set('limit', '6');
      geoUrl.searchParams.set('format', 'json');
      geoUrl.searchParams.set('apiKey', geoapifyKey);

      const geoRes = await fetch(geoUrl.toString());
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const results = geoData.results || [];

        for (const r of results) {
          const placeName = r.city || r.suburb || r.name || r.formatted?.split(',')[0];
          if (!placeName) continue;

          const key = placeName.toLowerCase();
          if (seenNames.has(key)) continue;
          seenNames.add(key);

          const statePart = r.state || r.country || 'India';
          const detailsPart = r.formatted || `${placeName}, ${statePart}`;

          suggestions.push({
            id: `geo-${r.place_id || key.replace(/\s+/g, '-')}`,
            name: placeName,
            subtext: detailsPart,
            tag: r.category || 'Discovered Location',
            highlight: r.county || r.district || statePart,
            type: 'geo_location',
            lat: r.lat,
            lon: r.lon,
            source: 'geoapify',
          });
        }
      }
    } catch (geoErr) {
      console.warn('Geoapify autocomplete error:', geoErr.message);
    }
  }

  // 4. Match venues in store catalog (matching hotel or experience names)
  const storeMatches = store.venues.filter(v => 
    v.name.toLowerCase().includes(query) ||
    v.destination.toLowerCase().includes(query)
  ).slice(0, 3);

  for (const v of storeMatches) {
    const key = v.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    suggestions.push({
      id: `venue-${v.id}`,
      name: v.name,
      subtext: `${v.destination}, ${v.state || 'India'}`,
      tag: v.category?.toUpperCase() || 'STAY',
      highlight: v.address || `${v.destination} spot`,
      type: 'venue',
      venueId: v.id,
      source: 'catalog',
    });
  }

  res.json({
    success: true,
    query,
    count: suggestions.length,
    data: suggestions.slice(0, 8),
  });
});

// Maximum advance booking window: 365 days (12 months)
const MAX_ADVANCE_BOOKING_DAYS = 365;

// GET /api/venues/hotels/offers - Search live hotel offers via StayingAPI with strict date validation
router.get('/hotels/offers', async (req, res) => {
  const { 
    destination = 'Goa', 
    checkIn, 
    checkOut, 
    guests = 2, 
    rooms = 1,
    currency = 'INR' 
  } = req.query;

  // Validate required parameters
  if (!checkIn || !checkOut || checkIn === 'undefined' || checkOut === 'undefined') {
    return res.status(400).json({
      success: false,
      message: 'Check-in and check-out dates are required to query hotel inventory.',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);

  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Expected YYYY-MM-DD.',
    });
  }

  if (checkInDate < today) {
    return res.status(400).json({
      success: false,
      message: 'Check-in date cannot be in the past.',
    });
  }

  if (checkOutDate <= checkInDate) {
    return res.status(400).json({
      success: false,
      message: 'Check-out date must be strictly later than check-in date.',
    });
  }

  // Check maximum advance booking window
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + MAX_ADVANCE_BOOKING_DAYS);

  if (checkInDate > maxDate) {
    return res.status(400).json({
      success: false,
      message: `Advance bookings are limited to ${MAX_ADVANCE_BOOKING_DAYS} days (12 months). Properties have not published rates beyond this window.`,
    });
  }

  // Query StayingAPI adapter
  const result = await providerRegistry.adapters.staying_api.searchHotelOffers({
    destination,
    checkIn,
    checkOut,
    guests: Number(guests) || 2,
    rooms: Number(rooms) || 1,
    currency,
    limit: 10,
  });

  res.json({
    success: true,
    destination,
    checkIn,
    checkOut,
    guests: Number(guests) || 2,
    rooms: Number(rooms) || 1,
    data: result,
  });
});

// POST /api/venues/google/places - Discover real places via Google Places (New)
router.post('/google/places', async (req, res) => {
  const { destination = 'Goa', category = 'hotel', limit = 10 } = req.body;

  try {
    const places = await providerRegistry.adapters.google_places.searchPlaces({
      destination,
      category,
      limit: Number(limit) || 10,
    });

    res.json({
      success: true,
      provider: 'google_places',
      totalFound: places.length,
      data: places,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to search Google Places',
    });
  }
});

// GET /api/venues/providers/status - Check configuration status of travel data adapters
router.get('/providers/status', (req, res) => {
  const statuses = providerRegistry.getStatuses();
  res.json({
    success: true,
    data: statuses,
  });
});

// POST /api/venues/admin/preview - Preview places from a travel provider with duplicate detection
router.post('/admin/preview', async (req, res) => {
  const { destination = 'Goa', category = 'hotel', provider = 'google_places', radius = 5000, limit = 8 } = req.body;

  try {
    const previewResult = await providerRegistry.previewPlaces({
      destination,
      category,
      provider,
      radius: Number(radius) || 5000,
      limit: Number(limit) || 8,
    });

    res.json({
      success: true,
      data: previewResult,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to preview provider places',
    });
  }
});

// POST /api/venues/admin/import - Safely import previewed places into persistent venue catalog
router.post('/admin/import', (req, res) => {
  const { venues } = req.body;

  if (!Array.isArray(venues) || venues.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'venues array is required for import',
    });
  }

  const result = providerRegistry.importVenues(venues);

  res.json({
    success: true,
    data: result,
  });
});

// POST /api/venues/discover - Real-time on-demand multi-provider discovery
router.post('/discover', async (req, res) => {
  const { destination = 'Pondicherry', categories = ['hotel', 'restaurant', 'attraction'], limit = 6 } = req.body;
  try {
    const result = await providerRegistry.discoverAndEnrich({
      destination,
      categories,
      limit: Number(limit) || 6,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to discover places',
    });
  }
});

// GET /api/venues/geocode - Revive geographic location & accurate coordinates
router.get('/geocode', async (req, res) => {
  const { destination = 'Goa' } = req.query;
  try {
    const coords = await geocodingService.resolveDestination(destination);
    res.json({
      success: true,
      destination,
      data: coords,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to geocode destination',
    });
  }
});

// GET /api/venues - Search & filter venues with automatic API discovery
router.get('/', async (req, res) => {
  const { 
    destination, 
    category, 
    minPrice, 
    maxPrice, 
    dietary, 
    amenities, 
    minRating, 
    search, 
    type,
    provider,
    verificationStatus 
  } = req.query;

  // Auto-enrich destination on-demand if catalog coverage is low
  const targetDest = (destination && destination !== 'all') ? destination : search;
  if (targetDest && targetDest.trim().length >= 3) {
    const dLower = targetDest.toLowerCase().trim();
    const existingMatches = store.venues.filter(v => 
      (v.destination && v.destination.toLowerCase().includes(dLower)) ||
      (v.region && v.region.toLowerCase().includes(dLower)) ||
      (v.state && v.state.toLowerCase().includes(dLower)) ||
      (v.name && v.name.toLowerCase().includes(dLower))
    );

    // If fewer than 4 places exist, invoke real-time discovery via live APIs
    if (existingMatches.length < 4) {
      try {
        const catList = category && category !== 'all' ? [category] : ['attraction', 'restaurant', 'hotel'];
        await providerRegistry.discoverAndEnrich({
          destination: targetDest.trim(),
          categories: catList,
          limit: 6,
        });
      } catch (discErr) {
        console.warn('Auto-discovery live notice:', discErr.message);
      }
    }
  }

  let results = [...store.venues];

  if (destination && destination !== 'all') {
    const dLower = destination.toLowerCase().trim();
    results = results.filter(v => 
      (v.destination && v.destination.toLowerCase().includes(dLower)) ||
      (v.region && v.region.toLowerCase().includes(dLower)) ||
      (v.state && v.state.toLowerCase().includes(dLower)) ||
      (v.name && v.name.toLowerCase().includes(dLower))
    );
  }

  if (category && category !== 'all') {
    results = results.filter(v => v.category === category);
  }

  if (type && type !== 'all') {
    results = results.filter(v => v.type === type);
  }

  if (provider && provider !== 'all') {
    results = results.filter(v => v.sourceProvider === provider);
  }

  if (verificationStatus && verificationStatus !== 'all') {
    results = results.filter(v => v.verificationStatus === verificationStatus);
  }

  if (minPrice) {
    results = results.filter(v => v.price !== null && v.price >= Number(minPrice));
  }

  if (maxPrice) {
    results = results.filter(v => v.price !== null && v.price <= Number(maxPrice));
  }

  if (minRating) {
    results = results.filter(v => v.rating !== null && v.rating >= Number(minRating));
  }

  if (dietary) {
    const dietaryList = Array.isArray(dietary) ? dietary : [dietary];
    results = results.filter(v => 
      v.dietary && dietaryList.some(d => v.dietary.some(vd => vd.toLowerCase().includes(d.toLowerCase())))
    );
  }

  if (amenities) {
    const amenitiesList = Array.isArray(amenities) ? amenities : [amenities];
    results = results.filter(v => 
      v.amenities && amenitiesList.every(a => v.amenities.some(va => va.toLowerCase().includes(a.toLowerCase())))
    );
  }

  if (search) {
    const q = search.toLowerCase().trim();
    results = results.filter(v => 
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.destination && v.destination.toLowerCase().includes(q)) ||
      (v.region && v.region.toLowerCase().includes(q)) ||
      (v.state && v.state.toLowerCase().includes(q)) ||
      (v.description && v.description.toLowerCase().includes(q)) ||
      (v.address && v.address.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    total: results.length,
    data: results,
  });
});

// Helper: Haversine distance in km
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/venues/free-hotels - Free OpenStreetMap Live Hotel Query (Free API with Zero Keys Required)
router.get('/free-hotels', async (req, res) => {
  const { destination = 'Goa', limit = 12 } = req.query;

  try {
    const osmPlaces = await providerRegistry.adapters.openstreetmap.searchPlaces({
      destination,
      category: 'hotel',
      limit: Number(limit) || 12,
    });

    res.json({
      success: true,
      provider: 'openstreetmap',
      destination,
      isFreePublicApi: true,
      totalFound: osmPlaces.length,
      data: osmPlaces,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch free OpenStreetMap hotel data',
    });
  }
});

// GET /api/v1/destinations/:destination/venues (PRD Section 7.3.2 Endpoint)
router.get(['/:destination/venues', '/destinations/:destination/venues'], (req, res) => {
  const dest = req.params.destination || 'Goa';
  const { near, radiusKm = 10 } = req.query;

  let nearCoords = null;
  if (near) {
    const parts = near.split(',').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      nearCoords = { lat: parts[0], lng: parts[1] };
    }
  }

  let venues = store.venues.filter(v =>
    (v.destination || '').toLowerCase().includes(dest.toLowerCase())
  );
  if (venues.length === 0) venues = store.venues;

  if (nearCoords) {
    venues = venues.filter(v => {
      const vLat = v.lat || v.coordinates?.lat;
      const vLng = v.lng || v.coordinates?.lng;
      if (!vLat || !vLng) return true;
      const d = haversineDistanceKm(nearCoords.lat, nearCoords.lng, vLat, vLng);
      return d <= Number(radiusKm);
    });
  }

  res.json({
    destination: dest,
    venues: venues.map(v => ({
      venueId: v.id,
      name: v.name,
      category: v.category || v.type,
      pricePerPerson: v.pricePerPerson != null ? v.pricePerPerson : (v.price || 850),
      dietaryTags: v.dietaryTags || v.dietary || ['vegetarian'],
      hours: v.hours || { open: '10:00', close: '22:00' },
      coordinates: { lat: v.lat || v.coordinates?.lat || 15.5, lng: v.lng || v.coordinates?.lng || 73.7 },
      description: v.description || '',
    })),
  });
});

// POST /api/venues/dataset/upload (PRD Section 6.3 & 10.1 Admin Dataset Ingestion)
router.post('/dataset/upload', (req, res) => {
  const { destination, venues } = req.body;

  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Destination name is required and must be a string.',
    });
  }

  if (!Array.isArray(venues) || venues.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Venues payload must be a non-empty array of venue objects.',
    });
  }

  const VALID_DIETARY_TAGS = new Set(['vegetarian', 'vegan', 'halal', 'jain', 'gluten-free', 'dairy-free']);
  const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const errors = [];
  const validVenues = [];

  venues.forEach((v, idx) => {
    const itemPrefix = `Venue #${idx + 1} ("${v.name || 'Unnamed'}"):`;

    // 1. Name validation
    if (!v.name || typeof v.name !== 'string') {
      errors.push(`${itemPrefix} Missing or invalid 'name'.`);
    }

    // 2. Price validation: strictly positive number
    const price = Number(v.pricePerPerson ?? v.price);
    if (isNaN(price) || price <= 0) {
      errors.push(`${itemPrefix} Price per person must be a strictly positive number (received: ${v.pricePerPerson ?? v.price}).`);
    }

    // 3. Coordinates validation: lat [-90, 90], lng [-180, 180]
    const lat = Number(v.coordinates?.lat ?? v.lat);
    const lng = Number(v.coordinates?.lng ?? v.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(`${itemPrefix} Invalid latitude ${lat}. Must be between -90 and 90.`);
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(`${itemPrefix} Invalid longitude ${lng}. Must be between -180 and 180.`);
    }

    // 4. Operating hours validation: valid HH:MM time ranges
    const openTime = v.hours?.open || v.hours_open;
    const closeTime = v.hours?.close || v.hours_close;
    if (!openTime || !TIME_REGEX.test(openTime)) {
      errors.push(`${itemPrefix} Invalid opening hour "${openTime}". Must match HH:MM (24h format).`);
    }
    if (!closeTime || !TIME_REGEX.test(closeTime)) {
      errors.push(`${itemPrefix} Invalid closing hour "${closeTime}". Must match HH:MM (24h format).`);
    }

    // 5. Dietary tags validation: must match documented tag vocabulary
    const tags = Array.isArray(v.dietaryTags) ? v.dietaryTags : Array.isArray(v.dietary) ? v.dietary : [];
    const invalidTags = tags.filter(t => !VALID_DIETARY_TAGS.has(String(t).toLowerCase()));
    if (invalidTags.length > 0) {
      errors.push(`${itemPrefix} Undocumented dietary tags: [${invalidTags.join(', ')}]. Allowed vocabulary: [${Array.from(VALID_DIETARY_TAGS).join(', ')}].`);
    }

    if (errors.length === 0) {
      validVenues.push({
        id: v.venueId || v.id || `v-${destination.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${idx}`,
        destination,
        name: v.name,
        category: v.category || 'dining',
        pricePerPerson: price,
        price,
        dietaryTags: tags.map(t => String(t).toLowerCase()),
        hours: { open: openTime, close: closeTime },
        lat,
        lng,
        coordinates: { lat, lng },
        description: v.description || `Verified venue in ${destination}`,
        source: 'admin_upload',
      });
    }
  });

  if (errors.length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Venue dataset validation failed against PRD constraints.',
      errors,
      totalSubmitted: venues.length,
      validCount: validVenues.length,
    });
  }

  // Ingest into store
  store.venues.push(...validVenues);

  res.status(201).json({
    success: true,
    message: `Successfully ingested ${validVenues.length} verified venues for ${destination}.`,
    destination,
    ingestedCount: validVenues.length,
    totalCatalogVenues: store.venues.length,
    data: validVenues,
  });
});

// GET /api/venues/:id - Get venue by ID
router.get('/:id', (req, res) => {
  const venue = store.venues.find(v => v.id === req.params.id);
  if (!venue) {
    return res.status(404).json({ success: false, message: 'Venue not found' });
  }
  res.json({ success: true, data: venue });
});

export default router;

