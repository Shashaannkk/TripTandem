import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  ArrowRight, 
  ChevronDown, 
  Compass,
  AlertCircle,
  Ticket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { DestinationAutocomplete } from '../common/DestinationAutocomplete';
import { ThemedDatePicker } from '../common/ThemedDatePicker';
import { GuestRoomSelector } from '../common/GuestRoomSelector';
import { validateBookingDates } from '../../utils/dateUtils';

export const CinematicHero = () => {
  const navigate = useNavigate();
  const { formatPrice } = useAuth();
  const { createTripFromBooking, setIsJoinModalOpen } = useTrip();
  const videoRef = useRef(null);

  const [videoFailed, setVideoFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Search Panel State
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [validationError, setValidationError] = useState('');

  const popularDestinations = ['Goa', 'Manali', 'Jaipur', 'Varanasi', 'Kerala', 'Leh Ladakh'];

  // Check motion preferences
  useEffect(() => {
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionMediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    motionMediaQuery.addEventListener('change', handler);
    return () => motionMediaQuery.removeEventListener('change', handler);
  }, []);

  // Real-time validation computation
  const isSearchValid = useMemo(() => {
    if (!destination.trim()) return false;
    if (checkIn && checkOut) {
      const v = validateBookingDates(checkIn, checkOut);
      return v.valid;
    }
    return true; // Destination alone is searchable, dates are optional but validated if set
  }, [destination, checkIn, checkOut]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!destination.trim()) {
      setValidationError('Please choose a destination to search.');
      return;
    }

    if (checkIn || checkOut) {
      if (!checkIn) {
        setValidationError('Please select a check-in date.');
        return;
      }
      if (!checkOut) {
        setValidationError('Please select a check-out date.');
        return;
      }
      const v = validateBookingDates(checkIn, checkOut);
      if (!v.valid) {
        setValidationError(v.error);
        return;
      }
    }

    const params = new URLSearchParams();
    params.append('destination', destination.trim());
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);
    if (guests) params.append('guests', String(guests));
    if (rooms) params.append('rooms', String(rooms));

    navigate(`/explore?${params.toString()}`);
  };

  const handleCreateItinerary = (e) => {
    e.preventDefault();
    setValidationError('');
    if (!destination.trim()) {
      setValidationError('Please choose a destination to create your trip itinerary.');
      return;
    }
    const newTripId = createTripFromBooking({
      destination: destination.trim(),
      checkIn,
      checkOut,
      guests,
      rooms,
    });
    navigate(`/workspace/${newTripId}`);
  };

  const scrollToContent = () => {
    const el = document.getElementById('destinations-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full min-h-[90vh] lg:min-h-[92vh] flex flex-col justify-between overflow-hidden">
      
      {/* 1. Unaltered Cinematic Hero Video (NO dark tints, NO pause button) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        {!videoFailed && !prefersReducedMotion ? (
          <video
            ref={videoRef}
            src="/videos/landing-hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1800&auto=format&fit=crop&q=80"
            alt="India Travel Landscape"
            className="w-full h-full object-cover object-center"
          />
        )}
      </div>

      {/* 2. Top-Aligned Hero Area with Direct, Immediate Search Access */}
      <div className="relative z-20 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8 text-center space-y-6 sm:space-y-8">
        
        {/* Brand Tag Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-brand-yellow text-xs font-semibold uppercase tracking-wider border border-white/20 shadow-subtle animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
          <span>India is calling · Collaborative Travel Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] max-w-4xl mx-auto">
          India is waiting.{' '}
          <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-orange drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
            Let's go together.
          </span>
        </h1>

        {/* Supporting Tagline */}
        <p className="text-base sm:text-lg text-white/95 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
          Discover places, compare live accommodation rates, and bring your travel crew together with TripTandem.
        </p>

        {/* Priority 1: Unified, Cohesive TripTandem Search Panel (Immediate Upper Placement) */}
        <div className="max-w-5xl xl:max-w-6xl mx-auto pt-2">
          <div className="bg-[#F9F7F2]/95 backdrop-blur-xl rounded-3xl p-3 sm:p-2.5 shadow-floating border border-brand-sand-border/90 transition-all">
            <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center divide-y lg:divide-y-0 lg:divide-x divide-brand-sand-border gap-2 lg:gap-0">
              
              {/* Field 1: Destination Autocomplete */}
              <div className="flex-1 min-w-[200px] px-3 sm:px-4 py-2 text-left flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white border border-brand-sand-border shadow-subtle text-brand-orange shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-navy/60 leading-none">
                    Destination
                  </span>
                  <DestinationAutocomplete
                    value={destination}
                    onChange={(val) => {
                      setDestination(val);
                      if (validationError) setValidationError('');
                    }}
                    onSelect={(item) => {
                      setDestination(item.name);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Where to? (e.g. Goa, Manali)"
                    inputClassName="text-xs sm:text-sm font-bold pt-1 text-brand-navy placeholder:text-brand-navy/40"
                  />
                </div>
              </div>

              {/* Field 2: Check-In & Check-Out Date Range Picker */}
              <div className="flex-[1.4] min-w-[250px] sm:min-w-[280px] px-3 sm:px-4 py-2 text-left flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white border border-brand-sand-border shadow-subtle text-brand-teal shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <ThemedDatePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={({ checkIn: cIn, checkOut: cOut }) => {
                      setCheckIn(cIn || '');
                      setCheckOut(cOut || '');
                      if (validationError) setValidationError('');
                    }}
                  />
                </div>
              </div>

              {/* Field 3: Travellers & Rooms Selector */}
              <div className="w-auto min-w-[150px] px-3 sm:px-4 py-2 text-left flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white border border-brand-sand-border shadow-subtle text-brand-yellow shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <GuestRoomSelector
                    guests={guests}
                    rooms={rooms}
                    onChange={({ guests: g, rooms: r }) => {
                      setGuests(g);
                      setRooms(r);
                    }}
                  />
                </div>
              </div>

              {/* Actions: Instant Plan Itinerary & Search Buttons */}
              <div className="shrink-0 px-2.5 py-2 flex flex-col sm:flex-row items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCreateItinerary}
                  className="w-full sm:w-auto h-[46px] px-4 rounded-2xl font-bold text-xs sm:text-sm bg-brand-navy hover:bg-brand-navy-light text-white flex items-center justify-center gap-1.5 transition-all transform active:scale-95 shadow-subtle hover:shadow-card shrink-0 whitespace-nowrap cursor-pointer"
                  title="Generate collaborative trip itinerary with day & night tasks for your crew"
                >
                  <Sparkles className="w-4 h-4 text-brand-yellow" />
                  <span>Plan Itinerary ✨</span>
                </button>
                <button
                  type="submit"
                  className={`w-full sm:w-auto h-[46px] px-5 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all transform active:scale-95 shadow-card shrink-0 whitespace-nowrap cursor-pointer ${
                    isSearchValid
                      ? 'bg-brand-orange hover:bg-brand-orange-hover text-white hover:shadow-card-hover hover:-translate-y-0.5'
                      : 'bg-brand-orange/85 hover:bg-brand-orange text-white'
                  }`}
                  title={!destination ? 'Please enter a destination' : 'Search places & live hotel offers'}
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>

            </form>
          </div>

          {/* Validation Feedback Warning */}
          {validationError && (
            <div className="mt-2.5 p-2.5 rounded-2xl bg-rose-500/90 text-white backdrop-blur-md text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto shadow-card animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Trending Indian Hotspots Chips */}
          <div className="flex items-center justify-center flex-wrap gap-2 text-xs pt-3">
            <span className="text-white/90 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Trending in India:
            </span>
            {popularDestinations.map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => {
                  setDestination(dest);
                  navigate(`/explore?destination=${dest}`);
                }}
                className="px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/25 transition-all text-xs font-semibold shadow-sm"
              >
                {dest}
              </button>
            ))}
          </div>

        </div>

        {/* Secondary Action Shortcuts */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/workspace/trip-goa-2026')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-brand-orange-hover hover:to-amber-600 text-white font-bold px-6 py-2.5 rounded-full text-xs transition-all shadow-card hover:shadow-card-hover group cursor-pointer"
          >
            <span>🚀 Enter Live Goa Trip Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-teal/85 hover:bg-brand-teal text-white backdrop-blur-md border border-brand-teal/40 px-5 py-2.5 rounded-full text-xs font-semibold transition-all shadow-subtle group cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Join Crew with Code</span>
          </button>

          <button
            onClick={() => navigate('/explore')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/25 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-brand-teal" />
            <span>Browse Places</span>
          </button>
        </div>

      </div>

      {/* 3. Subtle Animated Scroll Cue */}
      <div className="relative z-10 flex flex-col items-center justify-center pb-6 text-center text-white">
        <button
          type="button"
          onClick={scrollToContent}
          className="flex flex-col items-center gap-1 hover:text-white transition-colors group"
        >
          <span className="text-[11px] uppercase tracking-widest font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 animate-bounce text-brand-yellow group-hover:translate-y-0.5 transition-transform drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]" />
        </button>
      </div>
    </section>
  );
};

export default CinematicHero;
