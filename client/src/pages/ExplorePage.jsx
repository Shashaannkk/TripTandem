import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilterSidebar } from '../components/explore/FilterSidebar';
import { MapView } from '../components/explore/MapView';
import { VenueCard } from '../components/home/VenueCard';
import { VenueDetailModal } from '../components/venue/VenueDetailModal';
import { DataImportModal } from '../components/admin/DataImportModal';
import { DestinationAutocomplete } from '../components/common/DestinationAutocomplete';
import { ThemedDatePicker } from '../components/common/ThemedDatePicker';
import { GuestRoomSelector } from '../components/common/GuestRoomSelector';
import { VENUES } from '../data/mockData';
import { api } from '../services/api';
import { validateBookingDates, getDaysDifference } from '../utils/dateUtils';
import { 
  LayoutGrid, 
  List, 
  Map as MapIcon, 
  SlidersHorizontal, 
  Search, 
  MapPin, 
  RotateCcw,
  Sparkles,
  Database,
  Calendar,
  Users,
  X,
  AlertCircle,
  ExternalLink,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export const ExplorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse query params
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialDestination = queryParams.get('destination') || '';
  const initialCategory = queryParams.get('category') || 'all';
  const initialType = queryParams.get('type') || 'all';
  const initialCheckIn = queryParams.get('checkIn') || '';
  const initialCheckOut = queryParams.get('checkOut') || '';
  const initialGuests = parseInt(queryParams.get('guests'), 10) || 2;
  const initialRooms = parseInt(queryParams.get('rooms'), 10) || 1;

  const [searchQuery, setSearchQuery] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [rooms, setRooms] = useState(initialRooms);

  // Compute stay nights safely
  const nights = useMemo(() => {
    if (checkIn && checkOut) {
      const diff = getDaysDifference(checkIn, checkOut);
      return diff > 0 ? diff : 0;
    }
    return 0;
  }, [checkIn, checkOut]);

  const [hotelOffersData, setHotelOffersData] = useState(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [isGooglePlacesLoading, setIsGooglePlacesLoading] = useState(false);
  const [isOsmHotelsLoading, setIsOsmHotelsLoading] = useState(false);

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'map'
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'rating' | 'price_asc' | 'price_desc'
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Live Venues state loaded from backend / mockData
  const [venuesList, setVenuesList] = useState(VENUES);

  const loadVenues = async () => {
    try {
      const venues = await api.getVenues();
      if (venues && venues.length > 0) {
        // Blend backend catalog with rich client presets to guarantee 100% destination coverage
        const existingIds = new Set(venues.map(v => v.id));
        const missingPresets = VENUES.filter(v => !existingIds.has(v.id));
        setVenuesList([...venues, ...missingPresets]);
      } else {
        setVenuesList(VENUES);
      }
    } catch (e) {
      console.warn('Venues load notice:', e);
      setVenuesList(VENUES);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const [filters, setFilters] = useState({
    destination: initialDestination,
    category: initialCategory,
    type: initialType,
    maxPrice: 35000,
    minRating: 0,
    dietary: [],
    amenities: [],
  });

  // Keep query params synced with URL changes
  useEffect(() => {
    const dest = queryParams.get('destination') || '';
    const cat = queryParams.get('category') || 'all';
    const typ = queryParams.get('type') || 'all';
    const cIn = queryParams.get('checkIn') || '';
    const cOut = queryParams.get('checkOut') || '';
    const g = parseInt(queryParams.get('guests'), 10) || 2;
    const r = parseInt(queryParams.get('rooms'), 10) || 1;

    setSearchQuery(dest);
    setCheckIn(cIn);
    setCheckOut(cOut);
    setGuests(g);
    setRooms(r);
    setFilters(prev => ({
      ...prev,
      destination: dest,
      category: cat,
      type: typ,
    }));
  }, [location.search]);

  // Fetch live hotel offers and integrate them directly into actual search results
  useEffect(() => {
    if (searchQuery.trim() && checkIn && checkOut) {
      setIsLoadingOffers(true);
      api.getHotelOffers({
        destination: searchQuery.trim(),
        checkIn,
        checkOut,
        guests,
        rooms,
      })
        .then((res) => {
          setHotelOffersData(res);
          // If live hotel offers were returned, map and integrate directly into search results
          if (res && res.offers && res.offers.length > 0) {
            const liveHotelCards = res.offers.map((offer, idx) => ({
              id: `hotel-offer-${offer.id || idx}`,
              name: offer.name || `Hotel in ${searchQuery.trim()}`,
              destination: searchQuery.trim(),
              region: offer.location || searchQuery.trim(),
              type: 'stay',
              category: 'popular',
              rating: offer.rating || 4.8,
              reviewCount: offer.reviewCount || 140,
              price: offer.price || offer.totalRate || 4500,
              priceUnit: 'night',
              priceType: 'verified',
              coverImage: offer.image || offer.photo || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80',
              images: offer.images?.length ? offer.images : [offer.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80'],
              address: offer.address || `${searchQuery.trim()}, India`,
              lat: offer.lat || 0,
              lng: offer.lng || 0,
              contact: {
                phone: offer.phone || '+91 1800 200 4567',
                website: offer.bookingUrl || 'https://stayingapi.com',
              },
              amenities: offer.amenities || ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Room Service'],
              description: offer.description || `Live hotel rate queried for ${searchQuery.trim()} across booking channels.`,
              badge: 'Live Hotel Offer',
            }));

            setVenuesList((prev) => {
              const existingIds = new Set(prev.map((v) => v.id));
              const newItems = liveHotelCards.filter((p) => !existingIds.has(p.id));
              return [...newItems, ...prev];
            });
          }
        })
        .catch((err) => {
          console.warn('Hotel offers load notice:', err);
        })
        .finally(() => {
          setIsLoadingOffers(false);
        });
    } else {
      setHotelOffersData(null);
    }
  }, [searchQuery, checkIn, checkOut, guests, rooms]);

  // Discover real places via Google Places (New)
  const handleFetchGooglePlaces = async () => {
    if (!searchQuery.trim()) return;
    setIsGooglePlacesLoading(true);
    try {
      const places = await api.searchGooglePlaces({
        destination: searchQuery.trim(),
        category: 'hotel',
        limit: 10,
      });

      if (places && places.length > 0) {
        setVenuesList((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newItems = places.filter((p) => !existingIds.has(p.id));
          return [...newItems, ...prev];
        });
      }
    } catch (err) {
      console.warn('Google Places fetch notice:', err);
    } finally {
      setIsGooglePlacesLoading(false);
    }
  };

  // Discover real rooms & hotels via Free OpenStreetMap Public API (Zero Key Dependency)
  const handleFetchFreeOsmHotels = async () => {
    const targetDest = searchQuery.trim() || 'Goa';
    setIsOsmHotelsLoading(true);
    try {
      const osmPlaces = await api.getFreeOsmHotels(targetDest, 12);
      if (osmPlaces && osmPlaces.length > 0) {
        setVenuesList((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const newItems = osmPlaces.filter((p) => !existingIds.has(p.id));
          return [...newItems, ...prev];
        });
      }
    } catch (err) {
      console.warn('Free OSM hotels fetch error:', err);
    } finally {
      setIsOsmHotelsLoading(false);
    }
  };

  const updateSearchUrl = (dest, cIn, cOut, gCount, rCount) => {
    const params = new URLSearchParams(location.search);
    if (dest !== undefined) {
      if (dest) params.set('destination', dest);
      else params.delete('destination');
    }
    if (cIn !== undefined) {
      if (cIn) params.set('checkIn', cIn);
      else params.delete('checkIn');
    }
    if (cOut !== undefined) {
      if (cOut) params.set('checkOut', cOut);
      else params.delete('checkOut');
    }
    if (gCount !== undefined) {
      if (gCount > 1) params.set('guests', String(gCount));
      else params.delete('guests');
    }
    if (rCount !== undefined) {
      if (rCount > 1) params.set('rooms', String(rCount));
      else params.delete('rooms');
    }
    navigate(`/explore?${params.toString()}`, { replace: true });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      destination: '',
      category: 'all',
      type: 'all',
      maxPrice: 35000,
      minRating: 0,
      dietary: [],
      amenities: [],
    });
    setSearchQuery('');
    setCheckIn('');
    setCheckOut('');
    setGuests(2);
    setRooms(1);
    navigate('/explore');
  };

  // Filter and Sort Engine (Safe against null / undefined / unpriced venues)
  const filteredVenues = useMemo(() => {
    let list = [...venuesList];

    // Destination / Text Search (Resilient against null/undefined)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => {
        const dest = (v.destination || '').toLowerCase();
        const reg = (v.region || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const state = (v.state || '').toLowerCase();
        const desc = (v.description || '').toLowerCase();
        const addr = (v.address || '').toLowerCase();
        return (
          dest.includes(q) ||
          reg.includes(q) ||
          name.includes(q) ||
          state.includes(q) ||
          desc.includes(q) ||
          addr.includes(q)
        );
      });
    }

    // Category
    if (filters.category && filters.category !== 'all') {
      list = list.filter(v => v.category === filters.category);
    }

    // Type (stay / restaurant / experience)
    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'experience') {
        list = list.filter(v => v.type === 'experience' || v.type === 'attraction' || v.type === 'activity');
      } else {
        list = list.filter(v => v.type === filters.type);
      }
    }

    // Price (null-safe)
    if (filters.maxPrice) {
      list = list.filter(v => {
        if (v.price === null || v.price === undefined || isNaN(Number(v.price))) {
          return true; // Keep unpriced places so they aren't hidden
        }
        return Number(v.price) <= filters.maxPrice;
      });
    }

    // Rating
    if (filters.minRating > 0) {
      list = list.filter(v => Number(v.rating || 0) >= filters.minRating);
    }

    // Dietary
    if (filters.dietary && filters.dietary.length > 0) {
      list = list.filter(v => 
        v.dietary && filters.dietary.some(d => v.dietary.some(vd => (vd || '').toLowerCase().includes(d.toLowerCase())))
      );
    }

    // Amenities
    if (filters.amenities && filters.amenities.length > 0) {
      list = list.filter(v => 
        v.amenities && filters.amenities.every(a => v.amenities.includes(a))
      );
    }

    // Sort (null-safe)
    if (sortBy === 'rating') {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => {
        const pA = a.price !== null && a.price !== undefined ? Number(a.price) : Infinity;
        const pB = b.price !== null && b.price !== undefined ? Number(b.price) : Infinity;
        return pA - pB;
      });
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => {
        const pA = a.price !== null && a.price !== undefined ? Number(a.price) : -Infinity;
        const pB = b.price !== null && b.price !== undefined ? Number(b.price) : -Infinity;
        return pB - pA;
      });
    }

    return list;
  }, [filters, searchQuery, sortBy, venuesList]);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Top Search & Filter Console Bar */}
      <div className="bg-white border-b border-brand-sand-border sticky top-20 z-20 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Integrated Quick Search Console */}
            <div className="flex-1 bg-brand-sand/70 p-1.5 rounded-2xl sm:rounded-full border border-brand-sand-border flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-brand-sand-border gap-1 sm:gap-0">
              
              {/* 1. Destination Autocomplete */}
              <div className="px-3.5 py-1.5 flex-1 min-w-[200px] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-navy/60 leading-none">
                    Destination
                  </span>
                  <DestinationAutocomplete
                    value={searchQuery}
                    onChange={(val) => {
                      setSearchQuery(val);
                      updateSearchUrl(val, checkIn, checkOut, guests, rooms);
                    }}
                    onSelect={(item) => {
                      setSearchQuery(item.name);
                      updateSearchUrl(item.name, checkIn, checkOut, guests, rooms);
                    }}
                    placeholder="Search Indian destinations..."
                    inputClassName="text-xs font-bold pt-0.5"
                  />
                </div>
              </div>

              {/* 2. Check-In & Check-Out Date Range Picker */}
              <div className="px-3.5 py-1.5 flex-[1.4] min-w-[250px] sm:min-w-[280px] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-teal shrink-0" />
                <div className="flex-1 min-w-0">
                  <ThemedDatePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={({ checkIn: cIn, checkOut: cOut }) => {
                      setCheckIn(cIn || '');
                      setCheckOut(cOut || '');
                      updateSearchUrl(searchQuery, cIn, cOut, guests, rooms);
                    }}
                  />
                </div>
              </div>

              {/* 3. Guest & Room Selector */}
              <div className="px-3.5 py-1.5 min-w-[170px] flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-yellow shrink-0" />
                <div className="flex-1 min-w-0">
                  <GuestRoomSelector
                    guests={guests}
                    rooms={rooms}
                    onChange={({ guests: g, rooms: r }) => {
                      setGuests(g);
                      setRooms(r);
                      updateSearchUrl(searchQuery, checkIn, checkOut, g, r);
                    }}
                  />
                </div>
              </div>

            </div>

            {/* View Mode & Sort Controls */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              
              {/* Free OpenStreetMap Hotels Live Discovery Button (Free API) */}
              <button
                onClick={handleFetchFreeOsmHotels}
                disabled={isOsmHotelsLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-emerald-300 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all shadow-subtle group disabled:opacity-50 cursor-pointer"
                title="Discover real hotels and stays from OpenStreetMap free live public API (Zero API keys required)"
              >
                {isOsmHotelsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-bold">Free OSM Stays</span>
              </button>

              {/* Google Places Live Query Button */}
              {searchQuery && (
                <button
                  onClick={handleFetchGooglePlaces}
                  disabled={isGooglePlacesLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-brand-sand-border text-xs font-semibold bg-white text-brand-navy hover:bg-brand-sand transition-all shadow-subtle group disabled:opacity-50"
                  title="Discover verified places in this destination via Google Places API (New)"
                >
                  {isGooglePlacesLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-brand-orange animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-brand-orange group-hover:scale-110 transition-transform" />
                  )}
                  <span className="hidden sm:inline">Google Places</span>
                </button>
              )}

              {/* Travel Data & Providers Hub Button */}
              <button
                onClick={() => setIsDataModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-brand-sand-border text-xs font-semibold bg-white text-brand-navy hover:bg-brand-sand transition-all shadow-subtle group"
                title="Travel Data & Provider Hub (StayingAPI, Google Places, Geoapify)"
              >
                <Database className="w-3.5 h-3.5 text-brand-teal group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Providers</span>
              </button>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-full border border-brand-sand-border text-xs font-semibold bg-brand-sand text-brand-navy"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-orange" />
                <span>Filters</span>
              </button>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-full text-xs font-semibold bg-white border border-brand-sand-border text-brand-navy focus:outline-none cursor-pointer"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="price_asc">Sort: Price Low to High</option>
                <option value="price_desc">Sort: Price High to Low</option>
              </select>

              {/* View Switcher: Grid vs Map */}
              <div className="flex items-center p-1 rounded-full bg-brand-sand border border-brand-sand-border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand-navy shadow-sm'
                      : 'text-brand-navy/60 hover:text-brand-navy'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === 'map'
                      ? 'bg-white text-brand-navy shadow-sm'
                      : 'text-brand-navy/60 hover:text-brand-navy'
                  }`}
                  title="Interactive Map View"
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* Active Search Context Summary Strip */}
          {(searchQuery || checkIn || guests > 1 || rooms > 1) && (
            <div className="mt-2.5 pt-2 border-t border-brand-sand-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-brand-navy/50">Active Search:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange font-bold text-[11px]">
                    <MapPin className="w-3 h-3" />
                    {searchQuery}
                  </span>
                )}
                {checkIn && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-bold text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {checkIn}{checkOut ? ` → ${checkOut} (${nights} ${nights === 1 ? 'night' : 'nights'})` : ''}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-sand border border-brand-sand-border text-brand-navy font-bold text-[11px]">
                  <Users className="w-3 h-3 text-brand-orange" />
                  {guests} {guests === 1 ? 'Guest' : 'Guests'} · {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-brand-navy/50 hover:text-brand-orange font-semibold transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Reset all search criteria
              </button>
            </div>
          )}

          {/* StayingAPI Status Notification Banner */}
          {hotelOffersData && hotelOffersData.status === 'email_unverified' && (
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">StayingAPI Live Key Registered — Account Verification Pending</span>
                  <span className="text-[11px] text-amber-800 block mt-0.5">
                    StayingAPI requires verifying your account email to unlock live multi-OTA query credits. Place discovery via Google Places (New) and Geoapify remains active below.
                  </span>
                </div>
              </div>
              <a
                href={hotelOffersData.docUrl || 'https://stayingapi.com'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-brand-orange transition-colors shrink-0 underline"
              >
                <span>Verify Email</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* StayingAPI Live Offers Success Banner */}
          {hotelOffersData && hotelOffersData.offers && hotelOffersData.offers.length > 0 && (
            <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  Loaded {hotelOffersData.offers.length} Live Hotel Rates via StayingAPI
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                Cross-platform OTA rates
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-44">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                totalResults={filteredVenues.length}
              />
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Results Counter & Search Summary */}
            <div className="flex items-center justify-between text-xs text-brand-navy/70">
              <span className="font-semibold text-brand-navy">
                Showing {filteredVenues.length} results
                {searchQuery ? ` for "${searchQuery}"` : ''}
              </span>
              <span className="text-[11px] text-brand-teal font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified live inventory & community estimates</span>
              </span>
            </div>

            {/* View Mode: Map View vs Grid View */}
            {viewMode === 'map' ? (
              <MapView
                venues={filteredVenues}
                onSelectVenue={(v) => setSelectedVenue(v)}
              />
            ) : filteredVenues.length === 0 ? (
              /* Zero State */
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-brand-sand-border space-y-4">
                <div className="w-16 h-16 rounded-full bg-brand-sand text-brand-orange flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-brand-navy">No matching places found</h3>
                  <p className="text-xs text-brand-navy/60 mt-1">
                    Try broadening your budget slider or searching for a different destination.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-brand-navy text-white hover:bg-brand-navy-light shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              /* Grid View with guestCount passed to VenueCard */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVenues.map((venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    guestCount={guests}
                    onSelectVenue={(v) => setSelectedVenue(v)}
                  />
                ))}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-full max-w-xs bg-white h-full overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-brand-sand-border">
              <span className="font-semibold text-sm">Filters</span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs font-bold p-1"
              >
                ✕ Close
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              totalResults={filteredVenues.length}
            />
          </div>
        </div>
      )}

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
        />
      )}

      {/* Travel Data & Provider Hub Modal */}
      <DataImportModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onImportSuccess={() => {
          loadVenues();
        }}
      />

    </div>
  );
};

export default ExplorePage;
