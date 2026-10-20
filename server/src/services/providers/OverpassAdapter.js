import { BaseProviderAdapter } from './BaseProviderAdapter.js';
import { VenueModel } from '../../models/VenueModel.js';
import { geocodingService } from '../GeocodingService.js';
import { placeImageService } from '../PlaceImageService.js';

export class OverpassAdapter extends BaseProviderAdapter {
  constructor() {
    super('openstreetmap', {
      baseUrl: 'https://overpass-api.de/api/interpreter',
    });
  }

  isConfigured() {
    return true; // OpenStreetMap Overpass is an open public API
  }

  getStatus() {
    return {
      provider: 'openstreetmap',
      name: 'OpenStreetMap / Overpass API',
      configured: true,
      role: 'Supplementary geographic POI discovery (hotels, restaurants, viewpoints)',
      requiredKey: 'None (Public OpenStreetMap)',
      docsUrl: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
    };
  }

  async searchPlaces({ destination = 'Goa', category = 'hotel', lat, lng, radius = 5000, limit = 8 }) {
    // 1. Dynamically resolve real coordinates for any destination
    const destInfo = await geocodingService.resolveDestination(destination);
    const centerLat = lat != null ? Number(lat) : destInfo.lat;
    const centerLng = lng != null ? Number(lng) : destInfo.lng;

    // Overpass query construction based on category
    let osmTagFilter = '["tourism"="hotel"]';
    if (category === 'restaurant') osmTagFilter = '["amenity"="restaurant"]';
    else if (category === 'cafe') osmTagFilter = '["amenity"="cafe"]';
    else if (category === 'attraction' || category === 'beaches' || category === 'mountains') osmTagFilter = '["tourism"~"attraction|viewpoint|museum|artwork"]';

    const overpassQuery = `
      [out:json][timeout:10];
      (
        node${osmTagFilter}(around:${radius},${centerLat},${centerLng});
      );
      out body ${Math.min(20, Math.max(1, Number(limit) || 8))};
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(this.options.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const elements = (data.elements || []).filter((el) => el.tags && el.tags.name);

        if (elements.length > 0) {
          const venues = [];
          for (const el of elements) {
            const tags = el.tags || {};
            const isFood = tags.amenity === 'restaurant' || tags.amenity === 'cafe';

            const rawVenue = VenueModel.normalize({
              id: `osm-${el.id}`,
              name: tags.name,
              description: `Community-mapped ${tags.cuisine ? tags.cuisine + ' ' : ''}spot in ${destination}. Tagged in OpenStreetMap.`,
              destination,
              region: tags['addr:suburb'] || tags['addr:city'] || destination,
              state: tags['addr:state'] || destInfo.state,
              country: 'India',
              type: isFood ? 'restaurant' : category === 'attraction' ? 'attraction' : 'stay',
              category,
              coordinates: { lat: el.lat, lng: el.lon },
              lat: el.lat,
              lng: el.lon,
              address: [tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', ') || `${destination}, India`,
              amenities: [
                tags.wheelchair === 'yes' ? 'Wheelchair Accessible' : null,
                tags.internet_access ? 'Internet Access' : null,
                tags.outdoor_seating === 'yes' ? 'Outdoor Seating' : null,
              ].filter(Boolean),
              sourceProvider: 'openstreetmap',
              externalPlaceId: `osm-node-${el.id}`,
              price: isFood ? 500 : 3500,
              priceFormatted: isFood ? '₹500' : '₹3,500',
              priceType: 'indicative',
              verificationStatus: 'community',
              badge: 'OpenStreetMap',
            });

            const enriched = await placeImageService.enrichVenue(rawVenue);
            venues.push(enriched);
          }
          return venues;
        }
      }
    } catch (err) {
      console.warn('Overpass OSM query notice:', err.message);
    }

    return [];
  }
}
