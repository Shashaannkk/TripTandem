/**
 * Base Abstract Provider Adapter
 */

export class BaseProviderAdapter {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  isConfigured() {
    return false;
  }

  getStatus() {
    return {
      provider: this.name,
      configured: this.isConfigured(),
      description: 'Abstract provider',
    };
  }

  async searchPlaces(params = {}) {
    throw new Error(`searchPlaces not implemented for ${this.name}`);
  }
}
