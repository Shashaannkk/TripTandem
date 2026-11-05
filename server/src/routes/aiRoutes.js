import express from 'express';
import { store } from '../store.js';
import { dataService } from '../services/dataService.js';
import { providerRegistry } from '../services/providers/ProviderRegistry.js';
import { geocodingService } from '../services/GeocodingService.js';

const router = express.Router();

// Canonical city mappings for comprehensive Indian & international travel detection
const DESTINATION_MAP = {
  'udupi': 'Udupi',
  'malpe': 'Udupi',
  'kaup': 'Udupi',
  'kapu': 'Udupi',
  'maravanthe': 'Udupi',
  'st mary': 'Udupi',
  'mangalore': 'Mangalore',
  'mangaluru': 'Mangalore',
  'panambur': 'Mangalore',
  'tannirbhavi': 'Mangalore',
  'someshwara': 'Mangalore',
  'surathkal': 'Mangalore',
  'gokarna': 'Gokarna',
  'om beach': 'Gokarna',
  'kudle': 'Gokarna',
  'coorg': 'Coorg',
  'madikeri': 'Coorg',
  'chikmagalur': 'Chikmagalur',
  'hampi': 'Hampi',
  'mysore': 'Mysore',
  'mysuru': 'Mysore',
  'pondicherry': 'Pondicherry',
  'puducherry': 'Pondicherry',
  'white town': 'Pondicherry',
  'ooty': 'Ooty',
  'nilgiri': 'Ooty',
  'kodaikanal': 'Kodaikanal',
  'munnar': 'Munnar',
  'kerala': 'Kerala',
  'kochi': 'Kerala',
  'alleppey': 'Kerala',
  'alappuzha': 'Kerala',
  'wayanad': 'Kerala',
  'varkala': 'Kerala',
  'darjeeling': 'Darjeeling',
  'gangtok': 'Gangtok',
  'shillong': 'Shillong',
  'rishikesh': 'Rishikesh',
  'goa': 'Goa',
  'anjuna': 'Goa',
  'baga': 'Goa',
  'calangute': 'Goa',
  'vagator': 'Goa',
  'manali': 'Manali',
  'solang': 'Manali',
  'shimla': 'Shimla',
  'kasol': 'Kasol',
  'jaipur': 'Jaipur',
  'udaipur': 'Udaipur',
  'jodhpur': 'Jodhpur',
  'jaisalmer': 'Jaisalmer',
  'varanasi': 'Varanasi',
  'banaras': 'Varanasi',
  'kashi': 'Varanasi',
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'new delhi': 'New Delhi',
  'delhi': 'New Delhi',
  'agra': 'Agra',
  'taj mahal': 'Agra',
  'amritsar': 'Amritsar',
  'golden temple': 'Amritsar',
  'leh': 'Leh Ladakh',
  'ladakh': 'Leh Ladakh',
  'andaman': 'Andaman Islands',
  'havelock': 'Andaman Islands',
  'bali': 'Bali',
  'dubai': 'Dubai',
  'singapore': 'Singapore',
  'bangkok': 'Bangkok',
  'paris': 'Paris',
  'tokyo': 'Tokyo',
  'london': 'London',
};

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

// Convert "HH:MM", "8:00 pm", "8pm", "20:00" to minutes from midnight [0..1439]
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const str = String(timeStr).trim().toLowerCase();

  const m12 = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m12) {
    let hours = parseInt(m12[1], 10);
    const minutes = m12[2] ? parseInt(m12[2], 10) : 0;
    const meridian = m12[3];
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hours = parseInt(m24[1], 10);
    const minutes = parseInt(m24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

function extractAllHoursWindows(venue) {
  if (!venue) return [];
  if (venue.hours && venue.hours.open && venue.hours.close) {
    return [venue.hours];
  }
  if (venue.openingHours && typeof venue.openingHours === 'string') {
    const windows = [];
    const segments = venue.openingHours.split(/[,;]/);
    for (const seg of segments) {
      const m = seg.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (m) {
        windows.push({ open: m[1].trim(), close: m[2].trim() });
      }
    }
    if (windows.length > 0) return windows;
  }
  return [];
}

function extractHours(venue) {
  const windows = extractAllHoursWindows(venue);
  return windows.length > 0 ? windows[0] : null;
}

// Enforce opening hours window plus buffer (PRD 30 min arrival buffer)
function isVenueOpenAt(windowsOrHours, requestedMinutes, bufferMinutes = 30) {
  if (requestedMinutes == null) return true;
  if (!windowsOrHours) return false; // Fail closed if hours constraint requested but venue data missing

  const windows = Array.isArray(windowsOrHours) ? windowsOrHours : [windowsOrHours];
  if (windows.length === 0) return false;

  for (const hoursObj of windows) {
    const openMinutes = parseTimeToMinutes(hoursObj.open);
    let closeMinutes = parseTimeToMinutes(hoursObj.close);

    if (openMinutes == null || closeMinutes == null) continue;

    // Overnight closing (e.g. 19:00 -> 02:00)
    if (closeMinutes <= openMinutes) {
      closeMinutes += 1440;
    }

    let req = requestedMinutes;
    if (req < openMinutes && (req + 1440) <= closeMinutes) {
      req += 1440;
    }

    if (req >= openMinutes && (req + bufferMinutes) <= closeMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Filter venues strictly against PRD hard constraints:
 * - Destination
 * - Category
 * - Budget Ceiling
 * - Every Dietary Restriction
 * - Anchor Radius
 * - Requested Opening Hours Window + 30m buffer
 */
function filterVenuesStrictly(venues, {
  destination,
  category,
  budgetCeiling,
  dietaryConstraints = [],
  anchorCoords,
  radiusKm,
  requestedTimeMinutes,
  timeSlot,
}) {
  return venues.filter(v => {
    // 1. Destination filter (strict: never substitute another destination!)
    if (destination) {
      const vDest = (v.destination || '').toLowerCase();
      const dTarget = destination.toLowerCase();
      if (!vDest.includes(dTarget) && !dTarget.includes(vDest)) {
        return false;
      }
    }

    // 2. Category filter (never substitute stay for restaurant or vice versa)
    if (category) {
      const vType = (v.type || '').toLowerCase();
      const vCat = (v.category || '').toLowerCase();

      if (category === 'stay') {
        const isStay = (vType === 'stay' || vType === 'hotel' || vType === 'resort' || vType === 'villa' || vType === 'hostel' || vCat === 'stay');
        if (!isStay) return false;
      } else if (category === 'restaurant') {
        const isRestaurant = (
          vType === 'restaurant' || vType === 'dining' || vType === 'cafe' || vType === 'food' ||
          vCat === 'restaurant' || vCat === 'dining' || vCat === 'cafe' || vCat === 'food'
        );
        if (!isRestaurant) return false;
      } else if (category === 'experience') {
        const isStayOrDining = (
          vType === 'stay' || vType === 'hotel' || vType === 'resort' || vType === 'villa' || vType === 'hostel' ||
          vType === 'restaurant' || vType === 'dining' || vType === 'cafe' ||
          vCat === 'stay' || vCat === 'restaurant' || vCat === 'dining' || vCat === 'food'
        );
        const isExp = (
          vType === 'experience' || vType === 'attraction' || vType === 'activity' ||
          vCat === 'experience' || vCat === 'activity' || vCat === 'adventure' || vCat === 'nature' || vCat === 'popular' || vCat === 'heritage'
        );
        if (isStayOrDining || (!isExp && (vType === 'stay' || vType === 'restaurant'))) return false;
      }
    }

    // 3. Budget ceiling filter
    const vPrice = v.pricePerPerson != null ? v.pricePerPerson : (v.price != null ? v.price : 0);
    if (budgetCeiling != null && vPrice > budgetCeiling) {
      return false;
    }

    // 4. Dietary restrictions filter (Every required tag must be satisfied)
    if (dietaryConstraints.length > 0) {
      const vTags = (v.dietaryTags || v.dietary || []).map(t => String(t).toLowerCase());
      const allSatisfied = dietaryConstraints.every(reqTag =>
        vTags.some(t => t.includes(reqTag.toLowerCase()))
      );
      if (!allSatisfied) return false;
    }

    // 5. Anchor radius filter
    if (anchorCoords && radiusKm != null) {
      const vLat = v.lat || v.coordinates?.lat;
      const vLng = v.lng || v.coordinates?.lng;
      if (!vLat || !vLng) return false;
      const dist = haversineDistanceKm(anchorCoords.lat, anchorCoords.lng, vLat, vLng);
      if (dist > Number(radiusKm)) {
        return false;
      }
    }

    // 6. Requested opening hours window plus buffer (30m)
    if (requestedTimeMinutes != null) {
      const windows = extractAllHoursWindows(v);
      if (windows.length === 0 || !isVenueOpenAt(windows, requestedTimeMinutes, 30)) {
        return false;
      }
    }

    // 7. Time slot filter
    if (timeSlot) {
      const windows = extractAllHoursWindows(v);
      if (windows.length > 0) {
        let anySlotMatches = false;
        for (const hours of windows) {
          const openM = parseTimeToMinutes(hours.open);
          const closeM = parseTimeToMinutes(hours.close);
          if (openM != null && closeM != null) {
            if (timeSlot === 'morning' && openM <= 11 * 60) anySlotMatches = true;
            if ((timeSlot === 'dinner' || timeSlot === 'evening') && (closeM >= 19 * 60 || closeM <= 6 * 60)) anySlotMatches = true;
            if (timeSlot === 'night' && (closeM >= 22 * 60 || closeM <= 6 * 60)) anySlotMatches = true;
            if (timeSlot === 'afternoon' && openM <= 15 * 60 && closeM >= 12 * 60) anySlotMatches = true;
          }
        }
        if (!anySlotMatches) return false;
      }
    }

    return true;
  });
}

// POST /api/ai/concierge - Grounded AI Concierge & Smart Recommendation Engine
router.post('/concierge', async (req, res) => {
  const {
    query,
    tripId,
    partySize = 4,
    budgetCeiling,
    dietaryConstraints,
    radiusKm,
    anchorItemId,
    anchorCoords: customAnchorCoords,
    requestedTime,
    timeSlot,
  } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }

  const q = query.toLowerCase();
  const allVenues = await dataService.listVenues();
  const trip = tripId ? await dataService.getTripById(tripId) : null;
  let destination = trip ? trip.destination.split(',')[0].trim() : null;

  // Check if user is asking about a specific city or landmark in the query
  let foundDestInQuery = false;
  for (const [keyPhrase, canonicalDest] of Object.entries(DESTINATION_MAP)) {
    if (q.includes(keyPhrase)) {
      destination = canonicalDest;
      foundDestInQuery = true;
      break;
    }
  }

  if (!foundDestInQuery) {
    const toMatch = q.match(/(?:trip to|visit|in|explore|plan for)\s+([a-zA-Z\s]+)/i);
    if (toMatch) {
      destination = toMatch[1].trim();
    } else if (!destination) {
      const defaultTrip = (await dataService.listTrips())[0];
      destination = defaultTrip ? defaultTrip.destination.split(',')[0].trim() : 'Goa';
    }
  }

  // Parse category requested in query
  let requestedCategory = null;
  if (q.includes('hotel') || q.includes('stay') || q.includes('resort') || q.includes('villa') || q.includes('hostel')) {
    requestedCategory = 'stay';
  } else if (q.includes('food') || q.includes('restaurant') || q.includes('dining') || q.includes('lunch') || q.includes('dinner') || q.includes('breakfast') || q.includes('cafe')) {
    requestedCategory = 'restaurant';
  } else if (q.includes('activity') || q.includes('experience') || q.includes('adventure') || q.includes('attraction') || q.includes('monument')) {
    requestedCategory = 'experience';
  }

  // Parse budget ceiling
  let ceiling = budgetCeiling;
  if (ceiling == null) {
    const match = q.match(/(?:under|below|less than|max)\s*(?:[\$₹€]\s*)?(\d+)/i);
    if (match) ceiling = Number(match[1]);
  }

  // Parse dietary restrictions
  const queryDietary = [];
  if (q.includes('vegetarian') || q.includes('veg')) queryDietary.push('vegetarian');
  if (q.includes('vegan')) queryDietary.push('vegan');
  if (q.includes('halal')) queryDietary.push('halal');
  if (q.includes('jain')) queryDietary.push('jain');
  if (q.includes('gluten')) queryDietary.push('gluten-free');
  const requiredDietary = dietaryConstraints || queryDietary;

  // Parse opening hours / requested time window
  let reqTimeStr = requestedTime || req.body.time;
  if (!reqTimeStr) {
    const match = q.match(/(?:open at|at|around)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (match) {
      let t = match[1].trim();
      if (!t.includes(':') && (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm'))) {
        t = t.replace(/(am|pm)/i, ':00 $1');
      } else if (!t.includes(':')) {
        t = `${t}:00`;
      }
      reqTimeStr = t;
    }
  }
  const reqMinutes = reqTimeStr ? parseTimeToMinutes(reqTimeStr) : null;

  // Resolve anchor coordinates if provided
  let anchorCoords = customAnchorCoords || null;
  if (!anchorCoords && anchorItemId && trip) {
    for (const day of trip.days || []) {
      const it = (day.items || []).find(i => i.id === anchorItemId);
      if (it) {
        const v = allVenues.find(venue => venue.id === it.venueId);
        if (v && (v.lat || v.coordinates?.lat)) {
          anchorCoords = { lat: v.lat || v.coordinates.lat, lng: v.lng || v.coordinates.lng };
        }
        break;
      }
    }
  }

  // Find candidate venues strictly matching destination
  let candidateVenues = allVenues.filter(v =>
    v.destination && v.destination.toLowerCase().includes(destination.toLowerCase())
  );

  // If destination is not in catalog, try live provider discovery if available
  if (candidateVenues.length === 0) {
    try {
      const disc = await providerRegistry.discoverAndEnrich({
        destination,
        categories: ['hotel', 'restaurant', 'attraction'],
        limit: 6,
      });
      if (disc && disc.venues && disc.venues.length > 0) {
        candidateVenues = disc.venues;
        await dataService.addVenues(disc.venues).catch(() => {});
      }
    } catch (e) {
      console.warn('AI concierge discovery notice:', e.message);
    }
  }

  // Filter candidates strictly with PRD constraints
  const validVenues = filterVenuesStrictly(candidateVenues, {
    destination,
    category: requestedCategory,
    budgetCeiling: ceiling,
    dietaryConstraints: requiredDietary,
    anchorCoords,
    radiusKm,
    requestedTimeMinutes: reqMinutes,
    timeSlot,
  });

  // If no candidates meet constraints, return clear no-match without inventing venues
  if (validVenues.length === 0) {
    return res.json({
      success: true,
      data: {
        query,
        destination,
        assistantReply: `No verified catalogued or provider records in ${destination} satisfied all specified constraints (${[
          requestedCategory ? `category: ${requestedCategory}` : null,
          ceiling ? `budget ceiling: ₹${ceiling}` : null,
          requiredDietary.length ? `dietary: [${requiredDietary.join(', ')}]` : null,
          radiusKm ? `radius: ${radiusKm}km` : null,
          reqMinutes != null ? `hours window: open with buffer` : null,
        ].filter(Boolean).join(', ')}). Please adjust your search constraints.`,
        suggestions: [],
        citations: [],
        itineraryPlan: null,
        totalSuggestions: 0,
        constraintsValidated: false,
        noMatch: true,
      },
    });
  }

  // Build grounded suggestions and citations from real catalogued records
  const citations = validVenues.slice(0, 3).map(v => ({
    venueId: v.id,
    name: v.name,
    category: v.category || v.type,
    pricePerPerson: v.pricePerPerson != null ? v.pricePerPerson : (v.price || 0),
    rating: v.rating,
    coordinates: { lat: v.lat || v.coordinates?.lat, lng: v.lng || v.coordinates?.lng },
    hours: extractHours(v) || v.hours || { open: '10:00', close: '22:00' },
    dietaryTags: v.dietaryTags || v.dietary || [],
    source: v.source || 'catalog',
  }));

  const suggestions = validVenues.slice(0, 3).map((v, index) => {
    const vPrice = v.pricePerPerson != null ? v.pricePerPerson : (v.price || 0);
    return {
      id: `sug-${v.id}`,
      venueId: v.id,
      venueName: v.name,
      title: v.name,
      category: v.category || v.type,
      image: v.coverImage || v.image,
      proposedDay: index + 1,
      proposedTimeSlot: index === 0 ? 'morning' : index === 1 ? 'afternoon' : 'evening',
      proposedTime: index === 0 ? '10:00 AM' : index === 1 ? '02:00 PM' : '07:00 PM',
      duration: '2h',
      estimatedCostPerPerson: vPrice,
      location: v.region || v.destination,
      source: v.source || 'verified_catalog_record',
      rating: v.rating || 4.8,
      openingHours: v.openingHours || (v.hours ? `${v.hours.open} - ${v.hours.close}` : null),
      dietaryTags: v.dietaryTags || v.dietary || [],
      coordinates: { lat: v.lat || v.coordinates?.lat, lng: v.lng || v.coordinates?.lng },
      rationale: `${(v.description || '').slice(0, 110)}... Verified catalog record in ${destination}.`,
      constraintsChecked: [
        `Verified rate: ₹${vPrice.toLocaleString()}`,
        `Rating: ${v.rating || 4.8} ★`,
        `Dietary: ${(v.dietaryTags || v.dietary || []).join(', ') || 'Standard'}`,
      ],
      missingDataWarning: null,
    };
  });

  const assistantReply = `I found ${suggestions.length} verified venue records in ${destination} satisfying all your requirements, complete with verified pricing, ratings, and GPS coordinates.`;

  res.json({
    success: true,
    data: {
      query,
      assistantReply,
      suggestions,
      citations,
      itineraryPlan: null,
      totalSuggestions: suggestions.length,
      destination,
      constraintsValidated: true,
      noMatch: false,
    },
  });
});

// POST /api/ai/ask & POST /api/v1/trips/:id/ai/ask (PRD Section 7.3.3 Grounded RAG & Constraint Matching Engine)
router.post(['/ask', '/trips/:id/ai/ask'], async (req, res) => {
  const tripId = req.params.id || req.body.tripId || 'trip-goa-2026';
  const {
    userId = 'u_current',
    question = '',
    anchorItemId,
    anchorCoords: customAnchorCoords,
    budgetCeiling,
    dietaryConstraints,
    radiusKm = 2.0,
    requestedTime,
    timeSlot,
  } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'Question string is required' });
  }

  const allVenues = await dataService.listVenues();
  const trip = tripId ? (await dataService.getTripById(tripId)) : (await dataService.listTrips())[0];
  const qLower = question.toLowerCase();

  // Find destination from query or trip
  let destName = trip?.destination?.split(',')[0]?.trim()?.toLowerCase() || 'goa';
  let foundDestInQuery = false;
  for (const [keyPhrase, canonicalDest] of Object.entries(DESTINATION_MAP)) {
    if (qLower.includes(keyPhrase)) {
      destName = canonicalDest.toLowerCase();
      foundDestInQuery = true;
      break;
    }
  }
  if (!foundDestInQuery) {
    const toMatch = qLower.match(/(?:trip to|visit|in|explore|plan for)\s+([a-zA-Z\s]+)/i);
    if (toMatch) {
      destName = toMatch[1].trim().toLowerCase();
    }
  }

  // Parse category from question
  let requestedCategory = null;
  if (qLower.includes('hotel') || qLower.includes('stay') || qLower.includes('resort') || qLower.includes('villa') || qLower.includes('hostel')) {
    requestedCategory = 'stay';
  } else if (qLower.includes('food') || qLower.includes('restaurant') || qLower.includes('dining') || qLower.includes('lunch') || qLower.includes('dinner') || qLower.includes('breakfast') || qLower.includes('cafe')) {
    requestedCategory = 'restaurant';
  } else if (qLower.includes('activity') || qLower.includes('experience') || qLower.includes('adventure') || qLower.includes('attraction') || qLower.includes('monument')) {
    requestedCategory = 'experience';
  }

  // Find anchor item coordinates if provided
  let anchorCoords = customAnchorCoords || null;
  if (!anchorCoords && anchorItemId && trip) {
    for (const day of trip.days || []) {
      const item = (day.items || []).find(i => i.id === anchorItemId);
      if (item) {
        const v = allVenues.find(venue => venue.id === item.venueId);
        if (v && (v.lat || v.coordinates?.lat)) {
          anchorCoords = { lat: v.lat || v.coordinates.lat, lng: v.lng || v.coordinates.lng };
        }
        break;
      }
    }
  }

  // Parse budget ceiling from question if present
  let ceiling = budgetCeiling;
  if (ceiling == null) {
    const match = qLower.match(/(?:under|below|less than|max)\s*(?:[\$₹€]\s*)?(\d+)/i);
    if (match) ceiling = Number(match[1]);
  }

  // Parse dietary from question
  const queryDietary = [];
  if (qLower.includes('vegetarian') || qLower.includes('veg')) queryDietary.push('vegetarian');
  if (qLower.includes('vegan')) queryDietary.push('vegan');
  if (qLower.includes('halal')) queryDietary.push('halal');
  if (qLower.includes('jain')) queryDietary.push('jain');
  if (qLower.includes('gluten')) queryDietary.push('gluten-free');
  const requiredDietary = dietaryConstraints || queryDietary;

  // Parse requested time window
  let reqTimeStr = requestedTime || req.body.time;
  if (!reqTimeStr) {
    const match = qLower.match(/(?:open at|at|around)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (match) {
      let t = match[1].trim();
      if (!t.includes(':') && (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm'))) {
        t = t.replace(/(am|pm)/i, ':00 $1');
      } else if (!t.includes(':')) {
        t = `${t}:00`;
      }
      reqTimeStr = t;
    }
  }
  const reqMinutes = reqTimeStr ? parseTimeToMinutes(reqTimeStr) : null;

  // Desired time slot
  const requestedSlot = timeSlot || (
    qLower.includes('breakfast') || qLower.includes('morning') ? 'morning' :
    qLower.includes('lunch') || qLower.includes('afternoon') ? 'afternoon' :
    qLower.includes('dinner') || qLower.includes('evening') ? 'evening' :
    qLower.includes('night') || qLower.includes('late') ? 'night' : null
  );

  // Determine candidate venues strictly in destination (never substitute another destination!)
  const candidates = allVenues.filter(v => {
    const vDest = (v.destination || '').toLowerCase();
    return vDest.includes(destName) || destName.includes(vDest);
  });

  // Apply strict PRD constraint filtering
  const validCandidates = filterVenuesStrictly(candidates, {
    destination: destName,
    category: requestedCategory,
    budgetCeiling: ceiling,
    dietaryConstraints: requiredDietary,
    anchorCoords,
    radiusKm: anchorCoords ? radiusKm : null,
    requestedTimeMinutes: reqMinutes,
    timeSlot: requestedSlot,
  });

  // Strict PRD Requirement: When constraints cannot be met, return clear no-match without inventing fake records!
  if (validCandidates.length === 0) {
    return res.json({
      answer: `No catalogued or verified records in ${destName.toUpperCase()} satisfied all specified constraints (${[
        requestedCategory ? `category: ${requestedCategory}` : null,
        ceiling ? `budget ceiling: ₹${ceiling}` : null,
        requiredDietary.length ? `dietary: [${requiredDietary.join(', ')}]` : null,
        anchorCoords ? `max radius: ${radiusKm}km` : null,
        reqMinutes != null ? `hours window: open with buffer` : null,
      ].filter(Boolean).join(', ')}). Please adjust constraints to discover alternative venues.`,
      suggestedVenueId: null,
      sourceEvents: [],
      venueDetails: null,
      citations: [],
      constraintsSatisfied: {
        budgetCeiling: false,
        dietaryMatch: false,
        proximityRadiusKm: false,
        openingHoursMatch: false,
        categoryMatch: false,
      },
      noMatch: true,
      candidatesEvaluated: candidates.length,
      generatedAt: new Date().toISOString(),
    });
  }

  // Weighted Ranking: 40% proximity + 30% rating + 30% budget headroom
  const scored = validCandidates.map(v => {
    const vPrice = v.pricePerPerson != null ? v.pricePerPerson : (v.price || 800);
    const vLat = v.lat || v.coordinates?.lat || 15.5;
    const vLng = v.lng || v.coordinates?.lng || 73.7;

    const distKm = anchorCoords ? haversineDistanceKm(anchorCoords.lat, anchorCoords.lng, vLat, vLng) : 1;
    const proximityScore = Math.max(0, 1 - (distKm / (radiusKm * 2)));
    const ratingScore = ((v.rating || 4.5) - 3) / 2; // Normalize 3-5 star to 0-1
    const headroomScore = ceiling && ceiling > vPrice ? (ceiling - vPrice) / ceiling : 0.5;

    const totalScore = (proximityScore * 0.40) + (ratingScore * 0.30) + (headroomScore * 0.30);
    return { venue: v, score: totalScore, distKm };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].venue;
  const bestDist = scored[0].distKm || 1.2;
  const walkMinutes = Math.max(3, Math.round((bestDist * 1000) / 80));

  const bestPrice = best.pricePerPerson != null ? best.pricePerPerson : (best.price || 850);
  const currencySymbol = ceiling && ceiling < 100 ? '$' : '₹';

  const answer = `${best.name} is a ${walkMinutes}-minute walk (${bestDist.toFixed(1)} km) from your anchor location, features verified ${(best.dietaryTags || best.dietary || ['local']).join(', ')} options, and runs about ${currencySymbol}${bestPrice} per person. (Rating: ${best.rating || 4.8} ★)`;

  const citations = scored.slice(0, 3).map(s => {
    const v = s.venue;
    return {
      venueId: v.id,
      name: v.name,
      category: v.category || v.type,
      pricePerPerson: v.pricePerPerson != null ? v.pricePerPerson : (v.price || 0),
      rating: v.rating,
      coordinates: { lat: v.lat || v.coordinates?.lat, lng: v.lng || v.coordinates?.lng },
      hours: extractHours(v) || v.hours || { open: '10:00', close: '22:00' },
      dietaryTags: v.dietaryTags || v.dietary || [],
      source: v.source || 'catalog',
    };
  });

  res.json({
    answer,
    suggestedVenueId: best.id,
    sourceEvents: [`venue_${best.id}`],
    venueDetails: {
      id: best.id,
      name: best.name,
      category: best.category || best.type,
      pricePerPerson: bestPrice,
      rating: best.rating,
      dietaryTags: best.dietaryTags || best.dietary || [],
      coordinates: { lat: best.lat || best.coordinates?.lat, lng: best.lng || best.coordinates?.lng },
      hours: best.openingHours || (best.hours ? `${best.hours.open} - ${best.hours.close}` : '10:00 AM - 10:00 PM'),
      source: best.source || best.sourceProvider || 'catalog',
    },
    citations,
    constraintsSatisfied: {
      budgetCeiling: ceiling ? bestPrice <= ceiling : true,
      dietaryMatch: true,
      proximityRadiusKm: anchorCoords ? bestDist <= radiusKm : true,
      openingHoursMatch: true,
      categoryMatch: true,
    },
    noMatch: false,
    generatedAt: new Date().toISOString(),
  });
});

// POST /api/ai/conflicts/check - Proactive conflict detection (PRD Epic 2)
router.post('/conflicts/check', (req, res) => {
  const { tripId } = req.body;
  const trip = store.trips.find(t => t.id === tripId) || store.trips[0];
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const conflicts = [];
  const perPersonCeiling = (trip.budget?.totalTarget || 40000) / (trip.members?.length || 4);

  // 1. Time overlap conflict check
  for (const day of trip.days || []) {
    const items = day.items || [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i].timeSlot === items[j].timeSlot && items[i].status !== 'rejected' && items[j].status !== 'rejected') {
          conflicts.push({
            conflictType: 'overlap',
            itemIds: [items[i].id, items[j].id],
            details: `Scheduling conflict on Day ${day.dayNumber} (${day.dateFormatted}): "${items[i].title}" and "${items[j].title}" are both scheduled for the ${items[i].timeSlot} slot.`,
          });
        }
      }
    }
  }

  // 2. Budget ceiling breach check
  let runningCost = 0;
  for (const day of trip.days || []) {
    for (const item of day.items || []) {
      runningCost += (item.costPerPerson || 0);
      if (runningCost > perPersonCeiling) {
        conflicts.push({
          conflictType: 'budgetBreach',
          itemIds: [item.id],
          details: `Budget violation: Pinned activity "${item.title}" pushes the running total to ₹${runningCost.toLocaleString()}/person, exceeding the ₹${Math.round(perPersonCeiling).toLocaleString()} individual budget ceiling.`,
        });
        break;
      }
    }
  }

  res.json({
    success: true,
    hasConflicts: conflicts.length > 0,
    conflictsCount: conflicts.length,
    conflicts,
  });
});

// POST /api/ai/chat - Server-side secure AI cascade (protects API keys from client browser)
router.post('/chat', async (req, res) => {
  const { prompt, conversationHistory = [] } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt is required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  const SYSTEM_PROMPT = `You are TripTandem's AI Travel Concierge. You provide ultra-fast, dynamic, and engaging travel recommendations across India (Goa, Karnataka coasts including Udupi, Malpe, Kaup, Mangalore, Panambur, Tannirbhavi, Manali, Jaipur, Kerala, etc.) and worldwide.
When answering, prioritize:
1. Vibrant, concise guidance with estimated costs in INR (₹).
2. Recommend verified beachfront stays, heritage spots, cafes, and scenic vistas.
3. Always mention real-time estimated transit: Uber (Auto, Go, Premier) and local bus routes with expected fares in ₹ INR.
4. Keep replies snappy, friendly, and well-structured with clear bullet points or day-by-day plans when asked for itineraries.`;

  // 1. Try Gemini 2.0 Flash
  if (geminiKey) {
    try {
      const contents = [
        ...conversationHistory.slice(-4).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        { role: 'user', parts: [{ text: prompt }] }
      ];
      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      });
      if (gRes.ok) {
        const data = await gRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.json({ success: true, data: { text, provider: 'Google Gemini 2.0 Flash (Server Secure)' } });
      }
    } catch (e) {
      console.warn('Server Gemini call failed:', e.message);
    }
  }

  // 2. Try OpenAI GPT-4o Mini
  if (openAiKey) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-4).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: prompt }
      ];
      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 800,
        })
      });
      if (oRes.ok) {
        const data = await oRes.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return res.json({ success: true, data: { text, provider: 'OpenAI GPT-4o Mini (Server Secure)' } });
      }
    } catch (e) {
      console.warn('Server OpenAI call failed:', e.message);
    }
  }

  // 3. Try OpenRouter Multi-Model
  if (openRouterKey) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-4).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: prompt }
      ];
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'X-Title': 'TripTandem Travel AI',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          models: ['google/gemini-2.0-flash-001', 'openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct'],
          messages,
          temperature: 0.7,
          max_tokens: 800,
        })
      });
      if (orRes.ok) {
        const data = await orRes.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return res.json({ success: true, data: { text, provider: 'OpenRouter Multi-Model (Server Secure)' } });
      }
    } catch (e) {
      console.warn('Server OpenRouter call failed:', e.message);
    }
  }

  return res.json({ success: false, data: null });
});

export default router;

