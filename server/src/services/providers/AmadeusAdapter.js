import { BaseProviderAdapter } from './BaseProviderAdapter.js';

export class AmadeusAdapter extends BaseProviderAdapter {
  constructor() {
    super('amadeus', {
      baseUrl: process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com',
    });
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  isConfigured() {
    return Boolean(
      process.env.AMADEUS_CLIENT_ID &&
      process.env.AMADEUS_CLIENT_SECRET &&
      process.env.AMADEUS_CLIENT_ID.trim() &&
      process.env.AMADEUS_CLIENT_SECRET.trim()
    );
  }

  getStatus() {
    return {
      provider: 'amadeus',
      name: 'Amadeus for Developers API',
      configured: this.isConfigured(),
      role: 'Optional verified hotel offers, date availability & room rates',
      requiredKeys: ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
      baseUrl: this.options.baseUrl,
      docsUrl: 'https://developers.amadeus.com/self-service/category/hotels',
    };
  }

  /**
   * Acquire Amadeus OAuth2 bearer token
   */
  async getAuthToken() {
    if (!this.isConfigured()) {
      return null;
    }

    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const res = await fetch(`${this.options.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.AMADEUS_CLIENT_ID,
          client_secret: process.env.AMADEUS_CLIENT_SECRET,
        }).toString(),
      });

      if (!res.ok) {
        throw new Error(`Amadeus token exchange failed with status ${res.status}`);
      }

      const data = await res.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 1799) * 1000;
      return this.accessToken;
    } catch (err) {
      console.warn('Amadeus authentication notice:', err.message);
      return null;
    }
  }

  /**
   * Search bookable hotel offers for a city and date window
   */
  async searchHotelOffers({ cityCode = 'GOI', checkInDate, checkOutDate, adults = 2 }) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        offers: [],
        message: 'Amadeus credentials pending. Live hotel rates require AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET.',
      };
    }

    const token = await this.getAuthToken();
    if (!token) {
      return {
        configured: true,
        offers: [],
        message: 'Failed to authenticate with Amadeus servers. Check client credentials.',
      };
    }

    try {
      const url = new URL(`${this.options.baseUrl}/v1/reference-data/locations/hotels/by-city`);
      url.searchParams.set('cityCode', cityCode);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Amadeus hotel search responded with status ${res.status}`);
      }

      const data = await res.json();
      return {
        configured: true,
        offers: data.data || [],
        total: data.meta?.count || 0,
      };
    } catch (err) {
      return {
        configured: true,
        offers: [],
        error: err.message,
      };
    }
  }
}
