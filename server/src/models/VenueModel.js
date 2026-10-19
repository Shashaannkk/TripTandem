/**
 * TripTandem Normalized Venue Model & Schema Validator
 *
 * Provides a common normalized schema for places across all providers:
 * - Geoapify (places discovery)
 * - OpenStreetMap / Overpass (geographic POIs)
 * - Amadeus (hotel offers)
 * - Google Places (enrichment)
 * - Seeded local catalog
 */

export class VenueModel {
  /**
   * Validate and sanitize a venue object according to the normalized schema
   */
  static normalize(data) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('Venue name is required and must be a non-empty string');
    }

    const lat = Number(data.coordinates?.lat ?? data.lat ?? 0);
    const lng = Number(data.coordinates?.lng ?? data.lng ?? 0);

    const price = data.price !== undefined && data.price !== null && !isNaN(Number(data.price))
      ? Number(data.price)
      : null;

    const rating = data.rating !== undefined && data.rating !== null && !isNaN(Number(data.rating))
      ? Number(data.rating)
      : null;

    const reviewCount = data.reviewCount !== undefined && data.reviewCount !== null && !isNaN(Number(data.reviewCount))
      ? Number(data.reviewCount)
      : null;

    return {
      id: data.id || `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: data.name.trim(),
      description: data.description || 'Vetted travel venue in India.',
      destination: data.destination || 'India',
      region: data.region || data.destination || 'India',
      state: data.state || '',
      country: data.country || 'India',
      type: data.type || 'stay', // 'stay' | 'restaurant' | 'attraction' | 'experience'
      category: data.category || 'popular',
      coordinates: { lat, lng },
      lat,
      lng,
      address: data.address || '',
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      photos: Array.isArray(data.photos) && data.photos.length > 0
        ? data.photos
        : data.coverImage
          ? [data.coverImage]
          : ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80'],
      coverImage: data.coverImage || (Array.isArray(data.photos) && data.photos[0]) || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80',
      sourceProvider: data.sourceProvider || 'seeded', // 'seeded' | 'geoapify' | 'openstreetmap' | 'amadeus' | 'google_places'
      externalPlaceId: data.externalPlaceId || null,
      price: price,
      priceCurrency: data.priceCurrency || 'INR',
      priceUnit: data.priceUnit || (data.type === 'stay' ? 'night' : 'person'),
      priceType: data.priceType || (price ? 'indicative' : 'unknown'), // 'verified' | 'indicative' | 'unknown'
      rating: rating,
      reviewCount: reviewCount,
      ratingSource: data.ratingSource || (rating ? 'TripTandem' : null),
      openingHours: data.openingHours || null,
      dietary: Array.isArray(data.dietary) ? data.dietary : [],
      verificationStatus: data.verificationStatus || (data.sourceProvider === 'seeded' ? 'seeded' : 'imported_unverified'),
      badge: data.badge || null,
      lastFetched: data.lastFetched || new Date().toISOString(),
      lastVerified: data.lastVerified || new Date().toISOString(),
    };
  }

  /**
   * Distance between two coordinate points in meters using Haversine formula
   */
  static distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if two venues represent the same real-world location (Deduplication)
   */
  static isDuplicate(venueA, venueB) {
    // 1. Same external provider ID
    if (
      venueA.sourceProvider === venueB.sourceProvider &&
      venueA.externalPlaceId &&
      venueB.externalPlaceId &&
      venueA.externalPlaceId === venueB.externalPlaceId
    ) {
      return true;
    }

    // 2. Exact same ID
    if (venueA.id && venueB.id && venueA.id === venueB.id) {
      return true;
    }

    // 3. Proximity within 80 meters AND normalized name match
    if (
      venueA.coordinates?.lat &&
      venueA.coordinates?.lng &&
      venueB.coordinates?.lat &&
      venueB.coordinates?.lng
    ) {
      const dist = VenueModel.distanceMeters(
        venueA.coordinates.lat,
        venueA.coordinates.lng,
        venueB.coordinates.lat,
        venueB.coordinates.lng
      );

      const normNameA = venueA.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normNameB = venueB.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (dist < 80 && (normNameA.includes(normNameB) || normNameB.includes(normNameA))) {
        return true;
      }
    }

    return false;
  }
}
