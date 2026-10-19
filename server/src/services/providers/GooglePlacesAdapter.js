import { BaseProviderAdapter } from './BaseProviderAdapter.js';
import { VenueModel } from '../../models/VenueModel.js';

export class GooglePlacesAdapter extends BaseProviderAdapter {
  constructor() {
    super('google_places', {
      baseUrl: 'https://places.googleapis.com/v1',
    });
  }

  isConfigured() {
    return Boolean(process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY.trim());
  }

  getStatus() {
    return {
      provider: 'google_places',
      name: 'Google Places API (New)',
      configured: this.isConfigured(),
      role: 'Genuine place discovery, autocomplete, ratings & reviews',
      requiredKey: 'GOOGLE_MAPS_API_KEY',
      docsUrl: 'https://developers.google.com/maps/documentation/places/web-service',
      apiVersion: 'v1 (New Places API)',
    };
  }

  /**
   * Search real places (hotels, restaurants, attractions) using Places API (New) Text Search
   */
  async searchPlaces({ destination = 'Goa', category = 'hotel', limit = 10 }) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const query = category === 'hotel' 
        ? `hotels and stays in ${destination}, India`
        : category === 'restaurant'
        ? `popular restaurants in ${destination}, India`
        : `top tourist attractions in ${destination}, India`;

      const res = await fetch(`${this.options.baseUrl}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.photos',
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: Math.min(20, Math.max(1, Number(limit) || 10)),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Google Places (New) responded with status ${res.status}:`, errText);
        return [];
      }

      const data = await res.json();
      const places = data.places || [];

      return places.map((p) => {
        const placeName = p.displayName?.text || `Place in ${destination}`;
        const isStay = category === 'hotel' || p.primaryType?.includes('lodging') || p.primaryType?.includes('hotel');
        const isFood = category === 'restaurant' || p.primaryType?.includes('restaurant');

        // Extract photo reference if available
        let photoUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80';
        if (p.photos && p.photos.length > 0 && p.photos[0].name) {
          photoUrl = `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}`;
        }

        return VenueModel.normalize({
          id: `google-${p.id}`,
          name: placeName,
          description: `Discovered via Google Places API (New) in ${destination}.`,
          destination: destination,
          region: p.formattedAddress?.split(',')[1]?.trim() || destination,
          state: p.formattedAddress?.split(',').slice(-2, -1)[0]?.trim() || 'India',
          country: 'India',
          type: isStay ? 'stay' : isFood ? 'restaurant' : 'attraction',
          category: category,
          coordinates: {
            lat: p.location?.latitude || 0,
            lng: p.location?.longitude || 0,
          },
          address: p.formattedAddress || `${destination}, India`,
          rating: p.rating || null,
          reviewCount: p.userRatingCount || 0,
          photos: [photoUrl],
          coverImage: photoUrl,
          sourceProvider: 'google_places',
          externalPlaceId: p.id,
          price: null, // Transparently unpriced until live hotel offer is matched
          priceType: 'unknown',
          verificationStatus: 'verified',
        });
      });
    } catch (err) {
      console.warn('Google Places (New) search failed:', err.message);
      return [];
    }
  }

  /**
   * Real-time destination autocomplete using Places API (New)
   */
  async autocomplete({ input, sessionToken }) {
    if (!this.isConfigured() || !input || input.trim().length < 2) {
      return [];
    }

    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const body = {
        input: input.trim(),
        includedRegionCodes: ['in'],
      };
      if (sessionToken) {
        body.sessionToken = sessionToken;
      }

      const res = await fetch(`${this.options.baseUrl}/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const suggestions = data.suggestions || [];

      return suggestions.map((s) => {
        const pred = s.placePrediction || {};
        const text = pred.text?.text || '';
        const mainText = pred.structuredFormat?.mainText?.text || text.split(',')[0];
        const secondaryText = pred.structuredFormat?.secondaryText?.text || text.split(',').slice(1).join(',').trim();

        return {
          id: `google-${pred.placeId || mainText.toLowerCase().replace(/\s+/g, '-')}`,
          placeId: pred.placeId,
          name: mainText,
          subtext: secondaryText || 'India',
          highlight: 'Google Places Verified',
          type: 'geo_location',
          source: 'google_places',
        };
      });
    } catch (err) {
      console.warn('Google Places autocomplete error:', err.message);
      return [];
    }
  }

  /**
   * Enrich place with real Google ratings and reviews
   */
  async enrichPlace({ name }) {
    if (!this.isConfigured()) {
      return { configured: false, enriched: false };
    }

    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      const res = await fetch(`${this.options.baseUrl}/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
        },
        body: JSON.stringify({
          textQuery: name,
          pageSize: 1,
        }),
      });

      if (!res.ok) return { configured: true, enriched: false };

      const data = await res.json();
      const p = data.places?.[0];
      if (p) {
        return {
          configured: true,
          enriched: true,
          rating: p.rating,
          reviewCount: p.userRatingCount,
          externalPlaceId: p.id,
        };
      }
    } catch (e) {
      console.warn('Google Places enrichment notice:', e.message);
    }

    return { configured: true, enriched: false };
  }
}
