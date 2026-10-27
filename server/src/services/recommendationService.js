import { dataService } from './dataService.js';

export class RecommendationService {
  /**
   * Produce hybrid recommendations combining:
   * 1. Content-based similarity (category, price suitability, rating, tags)
   * 2. Collaborative filtering signals (member likes, saves, co-traveler interactions)
   * 3. Hard constraints (budget ceiling, dietary requirements, destination, deduplication)
   *
   * @param {Object} trip - Current trip context
   * @param {Object} [options={}]
   * @param {number} [options.limit=8]
   * @param {string[]} [options.dietaryTags=[]]
   * @param {number} [options.maxPrice=null]
   * @returns {Promise<Array>} Ranked venues with explanations
   */
  static async getRecommendationsForGroup(trip, options = {}) {
    const { limit = 8, dietaryTags = [], maxPrice = null } = options;
    const allVenues = await dataService.listVenues();
    const allInteractions = await dataService.getAllInteractions();

    if (!trip || !Array.isArray(allVenues) || allVenues.length === 0) {
      return [];
    }

    const destination = (trip.destination || '').toLowerCase();
    const destCity = destination.split(',')[0].trim();

    // Collect all venue IDs already pinned in any day of the trip
    const pinnedVenueIds = new Set();
    (trip.days || []).forEach(day => {
      (day.items || []).forEach(item => {
        if (item.venueId) pinnedVenueIds.add(String(item.venueId));
      });
    });

    // Extract trip members
    const memberIds = new Set((trip.members || []).map(m => m.id));
    const memberNames = new Set((trip.members || []).map(m => (m.name || '').toLowerCase()));

    // Group interaction profile
    const groupInteractions = allInteractions.filter(
      act => memberIds.has(act.userId) || memberNames.has((act.userName || '').toLowerCase())
    );

    // Count category affinity from group past interactions and pinned items
    const categoryAffinity = {};
    groupInteractions.forEach(act => {
      const cat = act.category || 'attraction';
      const weight = act.interactionType === 'pin' ? 3 : act.interactionType === 'save' ? 2 : 1;
      categoryAffinity[cat] = (categoryAffinity[cat] || 0) + weight;
    });

    (trip.days || []).forEach(day => {
      (day.items || []).forEach(item => {
        const cat = item.category || 'attraction';
        categoryAffinity[cat] = (categoryAffinity[cat] || 0) + 1.5;
      });
    });

    // -----------------------------------------------------------------
    // STEP 1: Hard Constraints Filtering (Strict Filters)
    // -----------------------------------------------------------------
    const eligibleVenues = allVenues.filter(venue => {
      const vId = String(venue.id || venue.venueId);

      // Rule 1: Exclude already pinned venues (Deduplication)
      if (pinnedVenueIds.has(vId)) return false;

      // Rule 2: Destination matching
      const vDest = (venue.destination || venue.region || venue.address || '').toLowerCase();
      const matchesDest =
        vDest.includes(destCity) ||
        destination.includes(vDest) ||
        (destCity === 'goa' && (vDest.includes('goa') || vDest.includes('anjuna') || vDest.includes('vagator')));
      if (!matchesDest && allVenues.some(v => (v.destination || '').toLowerCase().includes(destCity))) {
        return false;
      }

      // Rule 3: Budget Ceiling Hard Constraint
      const price = venue.pricePerPerson != null ? venue.pricePerPerson : venue.price;
      if (maxPrice != null && price != null && price > maxPrice) {
        return false;
      }

      // Rule 4: Dietary Requirements Hard Constraint
      if (dietaryTags && dietaryTags.length > 0) {
        const venueDiet = (venue.dietaryTags || venue.dietary || []).map(t => String(t).toLowerCase());
        const satisfiesAll = dietaryTags.every(requiredTag =>
          venueDiet.some(vd => vd.includes(requiredTag.toLowerCase()))
        );
        if (!satisfiesAll) return false;
      }

      return true;
    });

    // If zero venues match hard destination filter, relax destination filter slightly
    const candidates = eligibleVenues.length > 0 ? eligibleVenues : allVenues.filter(v => !pinnedVenueIds.has(String(v.id)));

    // -----------------------------------------------------------------
    // STEP 2: Content-Based Similarity Scoring
    // -----------------------------------------------------------------
    const scoredVenues = candidates.map(venue => {
      const vId = String(venue.id || venue.venueId);

      // 1. Rating component [0 - 1]
      const rating = Number(venue.rating) || 4.2;
      const ratingScore = Math.min(Math.max((rating - 3.5) / 1.5, 0), 1);

      // 2. Category affinity component [0 - 1]
      const cat = venue.category || venue.type || 'attraction';
      const catCount = categoryAffinity[cat] || 0;
      const maxAffinity = Math.max(...Object.values(categoryAffinity), 1);
      const catScore = Math.min(catCount / maxAffinity, 1);

      // 3. Price suitability score (moderate prices score higher for group consensus)
      const price = Number(venue.pricePerPerson ?? venue.price ?? 800);
      let priceScore = 0.8;
      if (price <= 500) priceScore = 0.95;
      else if (price <= 1500) priceScore = 1.0;
      else if (price <= 3000) priceScore = 0.85;
      else priceScore = 0.7;

      const contentScore = 0.45 * catScore + 0.35 * ratingScore + 0.20 * priceScore;

      // ---------------------------------------------------------------
      // STEP 3: Collaborative Filtering Signals
      // ---------------------------------------------------------------
      // Direct member interaction with this venue
      const memberDirectInteractions = groupInteractions.filter(
        act => String(act.venueId) === vId
      );
      let collabScore = 0;
      const matchedMembers = [];

      if (memberDirectInteractions.length > 0) {
        collabScore = 0.7 + Math.min(memberDirectInteractions.length * 0.15, 0.3);
        memberDirectInteractions.forEach(act => {
          const m = (trip.members || []).find(mem => mem.id === act.userId);
          if (m && !matchedMembers.includes(m.name)) matchedMembers.push(m.name);
        });
      } else {
        // Co-traveler interactions across the network
        const coTravelInteractions = allInteractions.filter(act => {
          if (String(act.venueId) !== vId) return false;
          const coTraveled = act.coTraveledWith || [];
          return coTraveled.some(id => memberIds.has(id));
        });

        if (coTravelInteractions.length > 0) {
          collabScore = Math.min(0.4 + coTravelInteractions.length * 0.1, 0.75);
        }
      }

      // ---------------------------------------------------------------
      // STEP 4: Hybrid Score & Explanation Generation
      // ---------------------------------------------------------------
      const isColdStart = groupInteractions.length === 0;
      const finalScore = isColdStart
        ? contentScore
        : 0.55 * contentScore + 0.45 * collabScore;

      let explanation = '';
      if (matchedMembers.length > 0) {
        explanation = `Saved by ${matchedMembers.join(' & ')} · Top match for your group's tastes`;
      } else if (catCount > 2) {
        explanation = `Popular ${cat} pick matching your group's interest in ${cat}`;
      } else if (rating >= 4.7) {
        explanation = `Exceptional ${rating}★ rating from verified travelers in ${destCity}`;
      } else {
        explanation = `Handpicked ${cat} venue fitting your group itinerary & budget`;
      }

      return {
        ...venue,
        id: vId,
        matchScore: Number(finalScore.toFixed(3)),
        contentScore: Number(contentScore.toFixed(3)),
        collabScore: Number(collabScore.toFixed(3)),
        explanation,
      };
    });

    // Sort descending by match score
    scoredVenues.sort((a, b) => b.matchScore - a.matchScore);

    return scoredVenues.slice(0, limit);
  }
}

