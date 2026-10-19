import { GeoapifyAdapter } from './GeoapifyAdapter.js';
import { OverpassAdapter } from './OverpassAdapter.js';
import { AmadeusAdapter } from './AmadeusAdapter.js';
import { GooglePlacesAdapter } from './GooglePlacesAdapter.js';
import { StayingApiAdapter } from './StayingApiAdapter.js';
import { VenueModel } from '../../models/VenueModel.js';
import { store } from '../../store.js';

export class ProviderRegistry {
  constructor() {
    this.adapters = {
      google_places: new GooglePlacesAdapter(),
      staying_api: new StayingApiAdapter(),
      geoapify: new GeoapifyAdapter(),
      openstreetmap: new OverpassAdapter(),
      amadeus: new AmadeusAdapter(),
    };
  }

  /**
   * Return configuration status of all providers without leaking secrets
   */
  getStatuses() {
    return Object.values(this.adapters).map((adapter) => adapter.getStatus());
  }

  /**
   * Preview candidate places from a provider with deduplication check against existing venues
   */
  async previewPlaces({ destination = 'Goa', category = 'hotel', provider = 'openstreetmap', radius = 5000, limit = 10 }) {
    const adapter = this.adapters[provider] || this.adapters.openstreetmap;
    const candidates = await adapter.searchPlaces({ destination, category, radius, limit });

    // Mark whether each candidate is already present in store.venues
    const candidatesWithDuplicateStatus = candidates.map((cand) => {
      const isAlreadyImported = store.venues.some((existing) =>
        VenueModel.isDuplicate(existing, cand)
      );

      return {
        ...cand,
        alreadyImported: isAlreadyImported,
      };
    });

    return {
      provider: adapter.name,
      destination,
      category,
      totalFound: candidatesWithDuplicateStatus.length,
      newCandidates: candidatesWithDuplicateStatus.filter((c) => !c.alreadyImported).length,
      data: candidatesWithDuplicateStatus,
    };
  }

  /**
   * Safe Admin Import of venues into the persistent store with deduplication
   */
  importVenues(venuesToImport = []) {
    let importedCount = 0;
    let skippedCount = 0;
    const addedVenues = [];

    for (const raw of venuesToImport) {
      try {
        const normalized = VenueModel.normalize(raw);

        // Deduplication check
        const isDuplicate = store.venues.some((existing) =>
          VenueModel.isDuplicate(existing, normalized)
        );

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        // Add to active database store
        store.venues.push(normalized);
        addedVenues.push(normalized);
        importedCount++;
      } catch (err) {
        console.warn('Venue validation error on import:', err.message);
        skippedCount++;
      }
    }

    return {
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      totalVenuesNow: store.venues.length,
      importedVenues: addedVenues,
    };
  }
}

export const providerRegistry = new ProviderRegistry();
