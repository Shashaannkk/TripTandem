/**
 * GeocodingService - Comprehensive Geographic Location & Coordinate Resolver
 * Provides instant verified coordinates for top Indian & global destinations
 * with automatic fallback to live Geoapify / Nominatim Geocoding APIs.
 */

// Curated verified coordinate registry for instant zero-latency lookups
const PRESET_COORDINATES = {
  // Karnataka Coast & Western Ghats
  'udupi': { lat: 13.3409, lng: 74.7421, state: 'Karnataka', region: 'Coastal Karnataka', country: 'India' },
  'mangalore': { lat: 12.9141, lng: 74.8560, state: 'Karnataka', region: 'Dakshina Kannada', country: 'India' },
  'mangaluru': { lat: 12.9141, lng: 74.8560, state: 'Karnataka', region: 'Dakshina Kannada', country: 'India' },
  'gokarna': { lat: 14.5479, lng: 74.3188, state: 'Karnataka', region: 'Uttara Kannada', country: 'India' },
  'coorg': { lat: 12.4244, lng: 75.7382, state: 'Karnataka', region: 'Kodagu', country: 'India' },
  'madikeri': { lat: 12.4244, lng: 75.7382, state: 'Karnataka', region: 'Kodagu', country: 'India' },
  'chikmagalur': { lat: 13.3161, lng: 75.7720, state: 'Karnataka', region: 'Western Ghats', country: 'India' },
  'hampi': { lat: 15.3350, lng: 76.4600, state: 'Karnataka', region: 'Vijayanagara', country: 'India' },
  'mysore': { lat: 12.2958, lng: 76.6394, state: 'Karnataka', region: 'Mysuru', country: 'India' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, state: 'Karnataka', region: 'Urban', country: 'India' },
  'bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka', region: 'Urban', country: 'India' },

  // Goa & Coastal Western India
  'goa': { lat: 15.4989, lng: 73.8278, state: 'Goa', region: 'North Goa', country: 'India' },
  'north goa': { lat: 15.5980, lng: 73.7430, state: 'Goa', region: 'North Goa', country: 'India' },
  'south goa': { lat: 15.0110, lng: 74.0200, state: 'Goa', region: 'South Goa', country: 'India' },
  'mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra', region: 'Konkan Coast', country: 'India' },

  // Tamil Nadu & Puducherry
  'pondicherry': { lat: 11.9416, lng: 79.8083, state: 'Puducherry', region: 'Coromandel Coast', country: 'India' },
  'puducherry': { lat: 11.9416, lng: 79.8083, state: 'Puducherry', region: 'Coromandel Coast', country: 'India' },
  'ooty': { lat: 11.4102, lng: 76.6950, state: 'Tamil Nadu', region: 'Nilgiris', country: 'India' },
  'kodaikanal': { lat: 10.2381, lng: 77.4892, state: 'Tamil Nadu', region: 'Dindigul', country: 'India' },

  // Kerala
  'kerala': { lat: 9.9312, lng: 76.2673, state: 'Kerala', region: 'Kochi & Backwaters', country: 'India' },
  'kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala', region: 'Ernakulam', country: 'India' },
  'munnar': { lat: 10.0889, lng: 77.0595, state: 'Kerala', region: 'Idukki', country: 'India' },
  'alleppey': { lat: 9.4981, lng: 76.3388, state: 'Kerala', region: 'Alappuzha', country: 'India' },
  'alappuzha': { lat: 9.4981, lng: 76.3388, state: 'Kerala', region: 'Alappuzha', country: 'India' },
  'wayanad': { lat: 11.6854, lng: 76.1320, state: 'Kerala', region: 'Malabar', country: 'India' },
  'varkala': { lat: 8.7379, lng: 76.7163, state: 'Kerala', region: 'Thiruvananthapuram', country: 'India' },

  // Rajasthan & Golden Triangle
  'jaipur': { lat: 26.9124, lng: 75.7873, state: 'Rajasthan', region: 'Pink City', country: 'India' },
  'udaipur': { lat: 24.5854, lng: 73.7125, state: 'Rajasthan', region: 'Mewar', country: 'India' },
  'jodhpur': { lat: 26.2389, lng: 73.0243, state: 'Rajasthan', region: 'Marwar', country: 'India' },
  'jaisalmer': { lat: 26.9157, lng: 70.9083, state: 'Rajasthan', region: 'Thar Desert', country: 'India' },
  'agra': { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh', region: 'Braj', country: 'India' },
  'new delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi NCR', region: 'Central Delhi', country: 'India' },
  'delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi NCR', region: 'Central Delhi', country: 'India' },
  'varanasi': { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh', region: 'Purvanchal', country: 'India' },

  // Himalayas & North India
  'manali': { lat: 32.2432, lng: 77.1892, state: 'Himachal Pradesh', region: 'Kullu Valley', country: 'India' },
  'shimla': { lat: 31.1048, lng: 77.1734, state: 'Himachal Pradesh', region: 'Shimla Hills', country: 'India' },
  'kasol': { lat: 32.0100, lng: 77.3150, state: 'Himachal Pradesh', region: 'Parvati Valley', country: 'India' },
  'rishikesh': { lat: 30.0869, lng: 78.2676, state: 'Uttarakhand', region: 'Garhwal', country: 'India' },
  'amritsar': { lat: 31.6340, lng: 74.8723, state: 'Punjab', region: 'Majha', country: 'India' },
  'leh ladakh': { lat: 34.1526, lng: 77.5771, state: 'Ladakh', region: 'Indus Valley', country: 'India' },
  'leh': { lat: 34.1526, lng: 77.5771, state: 'Ladakh', region: 'Indus Valley', country: 'India' },
  'srinagar': { lat: 34.0837, lng: 74.7973, state: 'Jammu & Kashmir', region: 'Kashmir Valley', country: 'India' },

  // East & North East India
  'darjeeling': { lat: 27.0410, lng: 88.2663, state: 'West Bengal', region: 'Eastern Himalayas', country: 'India' },
  'shillong': { lat: 25.5788, lng: 91.8933, state: 'Meghalaya', region: 'Khasi Hills', country: 'India' },
  'gangtok': { lat: 27.3314, lng: 88.6138, state: 'Sikkim', region: 'Eastern Himalayas', country: 'India' },
  'andaman islands': { lat: 11.6234, lng: 92.7265, state: 'Andaman & Nicobar', region: 'Bay of Bengal', country: 'India' },
  'andaman': { lat: 11.6234, lng: 92.7265, state: 'Andaman & Nicobar', region: 'Bay of Bengal', country: 'India' },

  // International Hubs
  'dubai': { lat: 25.2048, lng: 55.2708, state: 'Dubai', region: 'Middle East', country: 'United Arab Emirates' },
  'singapore': { lat: 1.3521, lng: 103.8198, state: 'Singapore', region: 'Southeast Asia', country: 'Singapore' },
  'bali': { lat: -8.4095, lng: 115.1889, state: 'Bali', region: 'Southeast Asia', country: 'Indonesia' },
  'bangkok': { lat: 13.7563, lng: 100.5018, state: 'Bangkok', region: 'Southeast Asia', country: 'Thailand' },
  'paris': { lat: 48.8566, lng: 2.3522, state: 'Île-de-France', region: 'Europe', country: 'France' },
  'tokyo': { lat: 35.6762, lng: 139.6503, state: 'Tokyo', region: 'East Asia', country: 'Japan' },
  'london': { lat: 51.5074, lng: -0.1278, state: 'Greater London', region: 'Europe', country: 'United Kingdom' },
};

class GeocodingService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Resolve accurate latitude and longitude for any destination name
   * @param {string} destination - City, town, or landmark name
   * @returns {Promise<{ lat: number, lng: number, state: string, region: string, country: string }>}
   */
  async resolveDestination(destination = 'Goa') {
    const raw = String(destination || 'Goa').trim();
    const key = raw.toLowerCase().replace(/,\s*india$/i, '').trim();

    // 1. Check in-memory preset registry
    if (PRESET_COORDINATES[key]) {
      return { ...PRESET_COORDINATES[key], source: 'preset' };
    }

    // Check partial preset match (e.g. "Pondicherry Beach" matches "pondicherry")
    for (const [presetKey, coords] of Object.entries(PRESET_COORDINATES)) {
      if (key.includes(presetKey) || presetKey.includes(key)) {
        return { ...coords, source: 'preset_partial' };
      }
    }

    // 2. Check dynamic cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // 3. Query Geoapify Geocoding API if key configured
    const geoapifyKey = process.env.GEOAPIFY_API_KEY;
    if (geoapifyKey) {
      try {
        const url = new URL('https://api.geoapify.com/v1/geocode/search');
        url.searchParams.set('text', raw);
        url.searchParams.set('limit', '1');
        url.searchParams.set('format', 'json');
        url.searchParams.set('apiKey', geoapifyKey);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const first = data.results?.[0];
          if (first && first.lat && first.lon) {
            const resolved = {
              lat: Number(first.lat),
              lng: Number(first.lon),
              state: first.state || first.county || 'India',
              region: first.city || first.suburb || raw,
              country: first.country || 'India',
              source: 'geoapify_live',
            };
            this.cache.set(key, resolved);
            return resolved;
          }
        }
      } catch (err) {
        console.warn('Geoapify live geocoding notice:', err.message);
      }
    }

    // 4. Query OpenStreetMap Nominatim Public Geocoding (Zero Keys Required)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(raw)}&format=json&limit=1`;
      const res = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'TripTandem-Platform/2.0 (travel@triptandem.org)',
        },
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          const resolved = {
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            state: first.display_name?.split(',').slice(-3, -2)[0]?.trim() || 'India',
            region: first.display_name?.split(',')[0]?.trim() || raw,
            country: first.display_name?.split(',').slice(-1)[0]?.trim() || 'India',
            source: 'nominatim_live',
          };
          this.cache.set(key, resolved);
          return resolved;
        }
      }
    } catch (nomErr) {
      console.warn('Nominatim live geocoding notice:', nomErr.message);
    }

    // Safe fallback to central India
    return {
      lat: 15.4989,
      lng: 73.8278,
      state: 'Goa',
      region: raw,
      country: 'India',
      source: 'fallback',
    };
  }
}

export const geocodingService = new GeocodingService();
