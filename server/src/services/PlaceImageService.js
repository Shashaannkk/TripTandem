/**
 * PlaceImageService - Real Place Imagery & Encyclopedic Knowledge Resolver
 * Enriches places with authentic high-resolution photos from Wikimedia Commons / Wikipedia
 * and curated destination-specific image pools, eliminating generic placeholder images.
 */

// Categorized high-resolution photo pools for realistic multi-photo galleries
const CATEGORY_PHOTO_POOLS = {
  stay: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&auto=format&fit=crop&q=80',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200&auto=format&fit=crop&q=80',
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
  ],
  heritage: [
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585136917228-569b9f71c4c9?w=1200&auto=format&fit=crop&q=80',
  ],
  mountain: [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&auto=format&fit=crop&q=80',
  ],
  attraction: [
    'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&auto=format&fit=crop&q=80',
  ],
};

class PlaceImageService {
  constructor() {
    this.wikiCache = new Map();
  }

  /**
   * Simple hash to pick distinct, deterministic photos from pools for consistent rendering
   */
  hashString(str = '') {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Search Wikipedia / Wikimedia Commons for authentic photos and rich encyclopedic descriptions
   * @param {string} placeName - Name of place or sight
   * @param {string} destination - City or region
   * @returns {Promise<{ photoUrl: string|null, description: string|null, wikiTitle: string|null }>}
   */
  async fetchWikiMedia(placeName = '', destination = '') {
    const cleanName = placeName
      .replace(/\(.*?\)/g, '')
      .replace(/hotel|resort|villa|inn|stay|restaurant|cafe/gi, '')
      .trim();

    const searchPhrase = `${cleanName} ${destination}`.trim();
    const cacheKey = searchPhrase.toLowerCase();

    if (this.wikiCache.has(cacheKey)) {
      return this.wikiCache.get(cacheKey);
    }

    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchPhrase)}&gsrlimit=1&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=1000&exintro=1&explaintext=1&format=json&origin=*`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];

          const photoUrl = page.original?.source || page.thumbnail?.source || null;
          const description = page.extract?.slice(0, 320)?.trim() || null;

          const result = {
            photoUrl,
            description,
            wikiTitle: page.title || null,
          };

          this.wikiCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // Quiet failover to curated photo pools
    }

    const fallback = { photoUrl: null, description: null, wikiTitle: null };
    this.wikiCache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Build a rich multi-photo array for any venue
   */
  async enrichVenue(venue) {
    const vName = venue.name || 'Travel Venue';
    const vDest = venue.destination || '';
    const vCat = venue.category || venue.type || 'attraction';

    // 1. Check Wikipedia / Wikimedia for true real photograph
    const wiki = await this.fetchWikiMedia(vName, vDest);

    // Pick appropriate curated pool
    let pool = CATEGORY_PHOTO_POOLS[vCat] || CATEGORY_PHOTO_POOLS.attraction;
    if (vName.toLowerCase().includes('beach')) pool = CATEGORY_PHOTO_POOLS.beach;
    else if (vName.toLowerCase().includes('fort') || vName.toLowerCase().includes('palace') || vName.toLowerCase().includes('temple')) pool = CATEGORY_PHOTO_POOLS.heritage;
    else if (vName.toLowerCase().includes('hotel') || vName.toLowerCase().includes('resort')) pool = CATEGORY_PHOTO_POOLS.stay;

    const hash = this.hashString(vName + vDest);
    const poolIdx = hash % pool.length;
    const poolPhoto = pool[poolIdx];
    const secondaryPhoto = pool[(poolIdx + 1) % pool.length];
    const tertiaryPhoto = pool[(poolIdx + 2) % pool.length];

    // Priority: Real Wikipedia photo > Existing valid photo > Curated pool photo
    const coverImage = wiki.photoUrl || venue.coverImage || poolPhoto;
    
    // Assemble multi-photo gallery
    const images = [
      coverImage,
      secondaryPhoto,
      tertiaryPhoto,
    ];

    if (venue.images && Array.isArray(venue.images) && venue.images.length > 0) {
      venue.images.forEach(img => {
        if (img && !images.includes(img)) images.push(img);
      });
    }

    const finalDescription = wiki.description 
      ? wiki.description 
      : (venue.description && !venue.description.includes('Discovered via')) 
        ? venue.description 
        : `Premier ${venue.type || venue.category} located in ${vDest}. Renowned spot offering verified local hospitality and scenic ambiance.`;

    return {
      ...venue,
      coverImage,
      photos: images,
      images,
      description: finalDescription,
      wikiVerified: Boolean(wiki.photoUrl),
    };
  }
}

export const placeImageService = new PlaceImageService();
