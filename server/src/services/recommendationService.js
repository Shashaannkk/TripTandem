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
    const tripObj = typeof trip === 'string' ? await dataService.getTripById(trip) : trip;
    const allVenues = await dataService.listVenues();
    const allInteractions = await dataService.getAllInteractions();

    if (!tripObj || !Array.isArray(allVenues) || allVenues.length === 0) {
      return [];
    }

    const destination = (tripObj.destination || '').toLowerCase();
    const destCity = destination.split(',')[0].trim();

    // Collect all venue IDs already pinned in any day of the trip
    const pinnedVenueIds = new Set();
    (tripObj.days || []).forEach(day => {
      (day.items || []).forEach(item => {
        if (item.venueId) pinnedVenueIds.add(String(item.venueId));
      });
    });

    // Extract trip members
    const memberIds = new Set((tripObj.members || []).map(m => m.id));
    const memberNames = new Set((tripObj.members || []).map(m => (m.name || '').toLowerCase()));

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

    (tripObj.days || []).forEach(day => {
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
          const m = (tripObj.members || []).find(mem => mem.id === act.userId);
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
      // STEP 4: Multi-Member Group Fit Consensus & Itinerary Integration
      // ---------------------------------------------------------------
      const members = tripObj.members || [];
      const perPersonBudget = Math.round((tripObj.budget?.totalTarget || 40000) / Math.max(members.length, 1));

      const memberBreakdown = members.map(mem => {
        const memInteractions = allInteractions.filter(act => act.userId === mem.id);
        const hasDirectAction = memInteractions.some(act => String(act.venueId) === vId);
        const hasCategoryAction = memInteractions.some(act => act.category === cat);
        const prefScore = hasDirectAction ? 1.0 : hasCategoryAction ? 0.88 : 0.65;

        let bScore = 1.0;
        if (price > perPersonBudget * 0.4) {
          bScore = 0.6;
        } else if (price > perPersonBudget * 0.25) {
          bScore = 0.8;
        }

        const venueDiet = (venue.dietaryTags || venue.dietary || []).map(t => String(t).toLowerCase());
        const dietScore = venueDiet.length > 0 ? 1.0 : 0.85;

        const memberFit = 0.5 * prefScore + 0.3 * bScore + 0.2 * dietScore;
        const alignment = memberFit >= 0.82 ? 'High' : memberFit >= 0.68 ? 'Moderate' : 'Neutral';

        return {
          memberId: mem.id,
          name: mem.name,
          fitScore: Math.round(memberFit * 100),
          alignment,
        };
      });

      const avgMemberFit = memberBreakdown.length > 0
        ? memberBreakdown.reduce((acc, m) => acc + m.fitScore, 0) / memberBreakdown.length
        : 75;
      const minMemberFit = memberBreakdown.length > 0
        ? Math.min(...memberBreakdown.map(m => m.fitScore))
        : 70;
      const groupFitScore = Math.round(0.75 * avgMemberFit + 0.25 * minMemberFit);

      // Balanced Day Scheduling: Suggest day with lightest activity count
      let suggestedDay = 1;
      let minDayItems = Infinity;
      (tripObj.days || []).forEach(d => {
        const count = (d.items || []).length;
        if (count < minDayItems) {
          minDayItems = count;
          suggestedDay = d.dayNumber;
        }
      });

      // Map venue category to natural time slot and recommended time
      let suggestedTimeSlot = 'afternoon';
      let proposedTime = '02:00 PM';
      let duration = '2 hours';
      const lowerCat = String(cat).toLowerCase();
      const lowerName = String(venue.name || '').toLowerCase();

      if (lowerCat.includes('food') || lowerCat.includes('dining') || lowerCat.includes('restaurant') || lowerCat.includes('cafe')) {
        if (lowerName.includes('cafe') || lowerName.includes('breakfast') || lowerName.includes('bakery')) {
          suggestedTimeSlot = 'morning';
          proposedTime = '09:30 AM';
          duration = '1 hour';
        } else if (lowerName.includes('bistro') || lowerName.includes('lunch') || lowerName.includes('beach shack')) {
          suggestedTimeSlot = 'afternoon';
          proposedTime = '01:30 PM';
          duration = '90 mins';
        } else {
          suggestedTimeSlot = 'evening';
          proposedTime = '08:00 PM';
          duration = '2 hours';
        }
      } else if (lowerCat.includes('night') || lowerCat.includes('pub') || lowerCat.includes('bar') || lowerCat.includes('club')) {
        suggestedTimeSlot = 'night';
        proposedTime = '10:00 PM';
        duration = '3 hours';
      } else if (lowerCat.includes('hotel') || lowerCat.includes('resort') || lowerCat.includes('villa') || lowerCat.includes('stay')) {
        suggestedTimeSlot = 'morning';
        proposedTime = '11:00 AM';
        duration = 'Check-in';
      } else {
        suggestedTimeSlot = 'afternoon';
        proposedTime = '03:30 PM';
        duration = '2.5 hours';
      }

      // ---------------------------------------------------------------
      // STEP 5: Hybrid Score & Explanation Generation
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
        const destSuffix = destCity ? ` in ${destCity}` : '';
        explanation = `Exceptional ${rating}★ rating from verified travelers${destSuffix}`;
      } else {
        explanation = `Handpicked ${cat} venue fitting your group itinerary & budget`;
      }

      const percentage = Math.min(100, Math.max(10, Math.round(finalScore * 100)));

      return {
        ...venue,
        id: vId,
        matchScore: Number(finalScore.toFixed(3)),
        matchPercentage: percentage,
        finalScore: Number(finalScore.toFixed(3)),
        contentScore: Number(contentScore.toFixed(3)),
        collabScore: Number(collabScore.toFixed(3)),
        groupFitScore,
        groupFitPercentage: groupFitScore,
        groupFitBreakdown: memberBreakdown,
        itinerarySlot: {
          suggestedDay,
          suggestedTimeSlot,
          proposedTime,
          duration,
          estimatedCostPerPerson: price,
        },
        explanation,
      };
    });

    // Sort descending by match score
    scoredVenues.sort((a, b) => b.matchScore - a.matchScore);

    return scoredVenues.slice(0, limit);
  }
}

