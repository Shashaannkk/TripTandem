import { PLACES_CATALOG } from './placesCatalog';
// TripTandem Curated Travel Dataset
// Real destinations, beautiful imagery, rich venue details, dietary tags, verified vs indicative price markers.

import { createUpiQrSvg } from '../utils/qrHelper';

export const USERS = [
  {
    id: 'user-1',
    name: 'Alex Morgan',
    email: 'alex@triptandem.travel',
    phone: '+91 98201 12345',
    role: 'Trip Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: '#FF6B45',
    status: 'online',
    currentLocation: 'Day 1 Itinerary',
    upiId: 'alex@okhdfcbank',
    upiQrCode: createUpiQrSvg('alex@okhdfcbank', 'Alex Morgan', '#0B2545'),
    emergencyContact: {
      name: 'Marcus Morgan',
      relationship: 'Father',
      phone: '+91 98200 99881',
      bloodGroup: 'O+',
      medicalNotes: 'No known allergies. Certified in First Aid.',
    },
  },
  {
    id: 'user-2',
    name: 'Priya Sharma',
    email: 'priya@triptandem.travel',
    phone: '+91 98765 43210',
    role: 'Foodie & Culture',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    color: '#2A9D8F',
    status: 'online',
    currentLocation: 'Voting on Dining',
    upiId: 'priya@okaxis',
    upiQrCode: createUpiQrSvg('priya@okaxis', 'Priya Sharma', '#5F259F'),
    emergencyContact: {
      name: 'Sunita Sharma',
      relationship: 'Mother',
      phone: '+91 98765 00112',
      bloodGroup: 'B+',
      medicalNotes: 'Mild asthma (inhaler carried in daypack).',
    },
  },
  {
    id: 'user-3',
    name: 'Rohan Mehta',
    email: 'rohan@triptandem.travel',
    phone: '+91 99112 33445',
    role: 'Adventure Scout',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: '#FFC857',
    status: 'online',
    currentLocation: 'Day 2 Activities',
    upiId: 'rohan@oksbi',
    upiQrCode: createUpiQrSvg('rohan@oksbi', 'Rohan Mehta', '#00BAF2'),
    emergencyContact: {
      name: 'Ananya Mehta',
      relationship: 'Sister',
      phone: '+91 99112 88776',
      bloodGroup: 'A+',
      medicalNotes: 'Penicillin allergy.',
    },
  },
  {
    id: 'user-4',
    name: 'Aisha Khan',
    email: 'aisha@triptandem.travel',
    phone: '+91 98334 55667',
    role: 'Budget Maven',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    color: '#8EC5E8',
    status: 'idle',
    currentLocation: 'Reviewing Budget',
    upiId: 'aisha@okicici',
    upiQrCode: createUpiQrSvg('aisha@okicici', 'Aisha Khan', '#0B2545'),
    emergencyContact: {
      name: 'Tariq Khan',
      relationship: 'Brother',
      phone: '+91 98334 11223',
      bloodGroup: 'AB+',
      medicalNotes: 'None.',
    },
  },
];

export const CATEGORIES = [
  { id: 'all', name: 'All Stays & Places', icon: 'Sparkles', count: 48 },
  { id: 'popular', name: 'Popular Destinations', icon: 'Flame', count: 24 },
  { id: 'beaches', name: 'Beaches', icon: 'Palmtree', count: 18 },
  { id: 'mountains', name: 'Mountains', icon: 'Mountain', count: 15 },
  { id: 'weekend', name: 'Weekend Getaways', icon: 'Compass', count: 20 },
  { id: 'city', name: 'City Breaks', icon: 'Building2', count: 12 },
  { id: 'nature', name: 'Nature & Trails', icon: 'Trees', count: 16 },
  { id: 'adventure', name: 'Adventure', icon: 'Footprints', count: 14 },
  { id: 'family', name: 'Family Trips', icon: 'Users', count: 19 },
  { id: 'food', name: 'Food & Culture', icon: 'UtensilsCrossed', count: 22 },
  { id: 'budget', name: 'Budget-Friendly', icon: 'Coins', count: 11 },
];

export const FEATURED_DESTINATIONS = [
  {
    id: 'dest-goa',
    name: 'Goa',
    country: 'India',
    region: 'Coastal West',
    tagline: 'Sun-drenched beaches, cliff sunsets & heritage shacks',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 15,
  },
  {
    id: 'dest-manali',
    name: 'Manali',
    country: 'India',
    region: 'Himachal Pradesh',
    tagline: 'Snow-capped peaks, pine forests & alpine cafes',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 12,
  },
  {
    id: 'dest-jaipur',
    name: 'Jaipur',
    country: 'India',
    region: 'Rajasthan',
    tagline: 'Pink City royal palaces, grand forts & vibrant bazaars',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&auto=format&fit=crop&q=80',
    trending: false,
    venuesCount: 14,
  },
  {
    id: 'dest-kerala',
    name: 'Kerala',
    country: 'India',
    region: 'South Coast',
    tagline: 'Tranquil Alleppey houseboats & coconut palm backwaters',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 14,
  },
  {
    id: 'dest-varanasi',
    name: 'Varanasi',
    country: 'India',
    region: 'Uttar Pradesh',
    tagline: 'Spiritual Ganga Aarti, sunrise boats & ancient ghats',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&auto=format&fit=crop&q=80',
    trending: false,
    venuesCount: 10,
  },
  {
    id: 'dest-ladakh',
    name: 'Leh Ladakh',
    country: 'India',
    region: 'Himalayas',
    tagline: 'Turquoise Pangong lake, mountain passes & monasteries',
    image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 11,
  },
  {
    id: 'dest-udupi',
    name: 'Udupi',
    country: 'India',
    region: 'Coastal Karnataka',
    tagline: 'St. Mary Island basalt columns, Malpe Sea Walk & dosas',
    image: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 6,
  },
  {
    id: 'dest-mangalore',
    name: 'Mangalore',
    country: 'India',
    region: 'Coastal Karnataka',
    tagline: 'Illuminated Kudroli temple, seafood ghee roast & beaches',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 5,
  },
  {
    id: 'dest-coorg',
    name: 'Coorg',
    country: 'India',
    region: 'Kodagu, Karnataka',
    tagline: 'Scotland of India, misty coffee hills & Abbey Falls',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 6,
  },
  {
    id: 'dest-gokarna',
    name: 'Gokarna',
    country: 'India',
    region: 'Coastal Karnataka',
    tagline: 'Om Beach natural curve, cliffhead trails & shacks',
    image: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 5,
  },
  {
    id: 'dest-ooty',
    name: 'Ooty',
    country: 'India',
    region: 'Nilgiris, Tamil Nadu',
    tagline: 'Blue Mountain Toy Train & emerald tea garden sweeps',
    image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    trending: false,
    venuesCount: 7,
  },
  {
    id: 'dest-munnar',
    name: 'Munnar',
    country: 'India',
    region: 'Western Ghats, Kerala',
    tagline: 'Rolling green tea carpets, cloud valleys & mist trails',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 8,
  },
  {
    id: 'dest-pondi',
    name: 'Pondicherry',
    country: 'India',
    region: 'Puducherry Coast',
    tagline: 'French quarter yellow villas, Rock Beach & artisanal cafes',
    image: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 7,
  },
  {
    id: 'dest-rishikesh',
    name: 'Rishikesh',
    country: 'India',
    region: 'Uttarakhand',
    tagline: 'Ganges white-water rafting, cliff yoga & Maha Aarti',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
    trending: false,
    venuesCount: 10,
  },
  {
    id: 'dest-udaipur',
    name: 'Udaipur',
    country: 'India',
    region: 'Rajasthan',
    tagline: 'City of Lakes, floating marble palaces & evening boats',
    image: 'https://images.unsplash.com/photo-1585123388867-3bfe6dd4bdbf?w=800&auto=format&fit=crop&q=80',
    trending: true,
    venuesCount: 10,
  },
  {
    id: 'dest-darjeeling',
    name: 'Darjeeling',
    country: 'India',
    region: 'West Bengal',
    tagline: 'Kanchenjunga sunrise view, heritage train & tea hills',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    trending: false,
    venuesCount: 6,
  },
];

export const VENUES = PLACES_CATALOG;

/**
 * Creates a clean, blank trip canvas with empty days and no pre-filled activities,
 * letting the user build their collaborative itinerary from scratch.
 */
export const createBlankTrip = (
  destination = 'Goa, India',
  title = '',
  daysCount = 3,
  budgetTotal = 30000,
  user = null
) => {
  const creator = user || {
    id: 'user-lead-1',
    name: 'Trip Lead',
    email: 'lead@triptandem.travel',
    role: 'Leader',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: '#FF6B45',
    status: 'online',
  };

  const cleanDest = destination || 'Goa, India';
  const cleanTitle = title || `${cleanDest.split(',')[0]} Collaborative Trip`;
  const count = Number(daysCount) || 3;
  const budget = Number(budgetTotal) || 30000;
  const tripId = `trip-${Date.now().toString(36)}`;
  const destTag = (cleanDest.split(',')[0] || 'TRIP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'TAN';
  const inviteCode = `TANDEM-${destTag}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const today = new Date();
  const startStr = today.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 86400000 * (count - 1));
  const endStr = endDate.toISOString().split('T')[0];

  return {
    id: tripId,
    title: cleanTitle,
    destination: cleanDest,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
    startDate: startStr,
    endDate: endStr,
    daysCount: count,
    budget: {
      totalTarget: budget,
      currency: 'INR',
      splitMode: 'equal',
      categories: {
        accommodation: Math.round(budget * 0.45),
        food: Math.round(budget * 0.25),
        transport: Math.round(budget * 0.15),
        activities: Math.round(budget * 0.10),
        other: Math.round(budget * 0.05),
      },
      expenses: [],
    },
    members: [{ ...creator, role: 'Leader' }],
    inviteCode,
    activeDayIndex: 0,
    days: Array.from({ length: count }, (_, i) => ({
      dayNumber: i + 1,
      dateFormatted: `Day ${i + 1}`,
      theme: i === 0 ? 'Arrival & Setup' : i === 1 ? 'Explore & Discover' : 'Leisure & Wrap-up',
      items: [], // Clean blank day canvas: user crafts their own tasks
    })),
    chat: [
      {
        id: `msg-sys-${Date.now()}`,
        tripId,
        senderId: 'system',
        senderName: 'Trip Concierge',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: `Welcome to "${cleanTitle}"! Your itinerary is blank and ready. Add activities, invite friends, and collaborate in real-time! ✨`,
        timestamp: 'Just now',
        isSystem: true,
      },
    ],
  };
};

export const BLANK_TRIP_TEMPLATE = createBlankTrip('Goa, India', 'My Collaborative Trip', 3, 30000);

// Default starting trip is completely blank so user builds from scratch
export const INITIAL_TRIP = BLANK_TRIP_TEMPLATE;

export const DEMO_GOA_TRIP = BLANK_TRIP_TEMPLATE;
