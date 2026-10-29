import mongoose from 'mongoose';

const venueMetadataSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, index: true },
    region: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    type: {
      type: String,
      enum: ['stay', 'restaurant', 'attraction', 'experience'],
      default: 'attraction',
    },
    category: { type: String, default: 'popular', index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    coordinates: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
    },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: { type: String, default: '' },
    amenities: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    images: { type: [String], default: [] },
    coverImage: { type: String, default: '' },
    sourceProvider: { type: String, default: 'seeded' },
    externalPlaceId: { type: String, default: null },
    price: { type: Number, default: null },
    pricePerPerson: { type: Number, default: null },
    priceCurrency: { type: String, default: 'INR' },
    priceUnit: { type: String, default: 'person' },
    priceType: { type: String, default: 'indicative' },
    rating: { type: Number, default: null },
    reviewCount: { type: Number, default: null },
    ratingSource: { type: String, default: 'TripTandem' },
    hours: {
      open: { type: String, default: '10:00' },
      close: { type: String, default: '22:00' },
    },
    openingHours: { type: String, default: '' },
    dietary: { type: [String], default: [] },
    dietaryTags: { type: [String], default: [] },
    verificationStatus: { type: String, default: 'verified' },
    badge: { type: String, default: null },
    description: { type: String, default: '' },
    source: { type: String, default: 'seeded' },
  },
  {
    timestamps: true,
  }
);

venueMetadataSchema.index({ location: '2dsphere' });
venueMetadataSchema.index({ destination: 1, category: 1 });
venueMetadataSchema.index({ destination: 1, pricePerPerson: 1 });
venueMetadataSchema.index({ dietaryTags: 1 });

export const VenueMetadata =
  mongoose.models.VenueMetadata || mongoose.model('VenueMetadata', venueMetadataSchema);

