import { BaseProviderAdapter } from './BaseProviderAdapter.js';

export class StayingApiAdapter extends BaseProviderAdapter {
  constructor() {
    super('staying_api', {
      baseUrl: process.env.STAYING_API_BASE_URL || 'https://api.stayingapi.com/v1',
    });
    this.lastCheckStatus = null;
  }

  isConfigured() {
    return Boolean(process.env.STAYING_API_KEY && process.env.STAYING_API_KEY.trim());
  }

  getStatus() {
    return {
      provider: 'staying_api',
      name: 'StayingAPI Unified Hotel Offers',
      configured: this.isConfigured(),
      role: 'Live multi-OTA hotel offers, room availability & rate comparison',
      requiredKey: 'STAYING_API_KEY',
      docsUrl: 'https://stayingapi.com',
      lastStatus: this.lastCheckStatus,
    };
  }

  /**
   * Search real-time hotel offers via StayingAPI
   * @param {Object} params
   * @param {string} params.destination - City / Destination name
   * @param {string} params.checkIn - Check-in date (YYYY-MM-DD)
   * @param {string} params.checkOut - Check-out date (YYYY-MM-DD)
   * @param {number} params.guests - Number of adult guests
   * @param {number} params.rooms - Number of rooms
   * @param {string} params.currency - Currency code (e.g. INR)
   * @param {number} params.limit - Max properties to fetch
   */
  async searchHotelOffers({
    destination = 'Goa',
    checkIn,
    checkOut,
    guests = 2,
    rooms = 1,
    currency = 'INR',
    limit = 10,
  }) {
    if (!this.isConfigured()) {
      return {
        provider: 'StayingAPI',
        configured: false,
        totalFound: 0,
        offers: [],
        message: 'StayingAPI key not configured in backend environment.',
      };
    }

    try {
      const url = new URL(`${this.options.baseUrl}/search`);
      url.searchParams.set('location', destination);
      if (checkIn) url.searchParams.set('checkIn', checkIn);
      if (checkOut) url.searchParams.set('checkOut', checkOut);
      url.searchParams.set('guests', String(guests));
      url.searchParams.set('rooms', String(rooms));
      url.searchParams.set('currency', currency);
      url.searchParams.set('limit', String(limit));

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.STAYING_API_KEY}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      // Handle specific StayingAPI error cases
      if (!response.ok) {
        const errorInfo = data.error || {};
        this.lastCheckStatus = {
          code: errorInfo.code || response.status,
          message: errorInfo.message || response.statusText,
          checkedAt: new Date().toISOString(),
        };

        if (errorInfo.code === 'email_unverified') {
          return {
            provider: 'StayingAPI',
            configured: true,
            status: 'email_unverified',
            totalFound: 0,
            offers: [],
            message:
              'StayingAPI live key verified! Account email confirmation is required at stayingapi.com to unlock live query credits.',
            docUrl: errorInfo.docUrl || 'https://stayingapi.com/docs/errors/email_unverified',
            retrievedAt: new Date().toISOString(),
          };
        }

        return {
          provider: 'StayingAPI',
          configured: true,
          status: 'error',
          totalFound: 0,
          offers: [],
          message: errorInfo.message || `StayingAPI returned status ${response.status}`,
          retrievedAt: new Date().toISOString(),
        };
      }

      this.lastCheckStatus = {
        code: 200,
        message: 'Active',
        checkedAt: new Date().toISOString(),
      };

      // Normalize valid StayingAPI properties
      const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.results) ? data.results : [];
      const normalizedOffers = rawList.map((item, idx) => {
        return {
          id: item.id || `staying-${idx + 1}`,
          name: item.name || item.title || `Hotel in ${destination}`,
          platform: item.platform || 'Booking.com',
          price: item.price?.total || item.price || item.totalPrice || null,
          currency: item.price?.currency || item.currency || currency,
          pricePerNight: item.price?.perNight || Math.round(Number(item.price || 0) / 1) || null,
          rating: item.rating || item.reviewScore || null,
          reviewCount: item.reviewsCount || item.reviewCount || 0,
          image: item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
          location: item.location || destination,
          address: item.address || `${destination}, India`,
          bookingUrl: item.url || item.bookingUrl || null,
          provider: 'staying_api',
          retrievedAt: new Date().toISOString(),
        };
      });

      return {
        provider: 'StayingAPI',
        configured: true,
        status: 'success',
        totalFound: normalizedOffers.length,
        offers: normalizedOffers,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('StayingAPI request error:', err.message);
      return {
        provider: 'StayingAPI',
        configured: true,
        status: 'network_error',
        totalFound: 0,
        offers: [],
        message: `Network error connecting to StayingAPI: ${err.message}`,
        retrievedAt: new Date().toISOString(),
      };
    }
  }
}
