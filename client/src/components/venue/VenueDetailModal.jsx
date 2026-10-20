import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Heart, 
  Star, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Check, 
  Share2, 
  Sparkles, 
  Info,
  Calendar,
  Phone,
  Globe,
  ExternalLink,
  Navigation,
  Users,
  Compass,
  ArrowRight,
  BedDouble,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { Badge } from '../common/Badge';

export const VenueDetailModal = ({ venue, onClose }) => {
  const navigate = useNavigate();
  const { formatPrice, savedFavorites, toggleFavorite, currentUser } = useAuth();
  const { trip, addActivity, createTripFromBooking } = useTrip();

  // Mode: 'book_itinerary' (Generate new trip with stay) vs 'add_existing' (Add to active trip day)
  const isStay = venue?.type === 'stay';
  const [actionMode, setActionMode] = useState(isStay ? 'book_itinerary' : 'add_existing');

  // Booking details
  const [bookingGuests, setBookingGuests] = useState(4);
  const [bookingNights, setBookingNights] = useState(3);
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [isBooking, setIsBooking] = useState(false);

  // Existing trip addition state
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('afternoon');
  const [isAdded, setIsAdded] = useState(false);

  if (!venue) return null;

  const isFavorite = savedFavorites.includes(venue.id);
  const fallbackCover = 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80';
  const rawImages = (venue.images && venue.images.length > 0)
    ? venue.images.filter(Boolean)
    : [venue.coverImage || venue.image || fallbackCover];
  const images = rawImages.length > 0 ? rawImages : [fallbackCover];

  // Total Stay Amount computation
  const totalStayCost = (venue.price || 0) * bookingNights;
  const costPerPerson = Math.round(totalStayCost / Math.max(1, bookingGuests));

  // Handler 1: Book stay and generate trip itinerary workspace
  const handleBookStayAndLaunchItinerary = () => {
    setIsBooking(true);
    const checkOut = new Date(new Date(checkInDate).getTime() + bookingNights * 86400000)
      .toISOString()
      .split('T')[0];

    setTimeout(() => {
      const newTripId = createTripFromBooking({
        venue,
        destination: venue.destination,
        checkIn: checkInDate,
        checkOut,
        guests: bookingGuests,
        totalAmount: totalStayCost,
      });
      setIsBooking(false);
      onClose();
      navigate(`/workspace/${newTripId}`);
    }, 600);
  };

  // Handler 2: Add activity to existing active trip
  const handleAddToItinerary = () => {
    addActivity(Number(selectedDay), selectedSlot, {
      title: venue.name,
      venueId: venue.id,
      venueName: venue.name,
      category: venue.type,
      image: venue.coverImage,
      costPerPerson: venue.price,
      location: venue.region || venue.destination,
      notes: `Added from venue explorer. ${venue.rating} ★`,
    });
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-floating border border-brand-sand-border relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Close & Top Controls */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-brand-sand-border flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            {venue.priceType === 'verified' ? (
              <Badge type="verified" text="Verified Live Partner" />
            ) : (
              <Badge type="indicative" text="Indicative Community Price" />
            )}
            {venue.badge && (
              <span className="text-xs bg-brand-orange-light text-brand-orange px-2.5 py-0.5 rounded-full font-semibold">
                {venue.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(venue.id)}
              className="p-2 rounded-full hover:bg-brand-sand text-brand-navy transition-colors"
              title="Save to Wishlist"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? 'fill-brand-orange text-brand-orange' : 'text-brand-navy'
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-brand-sand text-brand-navy transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Header Title & Rating */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-brand-navy">
              {venue.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-navy/70">
              <span className="flex items-center gap-1 font-semibold text-brand-navy">
                <Star className="w-4 h-4 fill-brand-yellow text-brand-yellow" />
                <span>{venue.rating}</span>
                <span className="text-brand-navy/50 font-normal">({venue.reviewCount} reviews)</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <span>{venue.region}, {venue.destination}</span>
              </span>
              {venue.distance && (
                <>
                  <span>·</span>
                  <span className="text-xs text-brand-navy/60">{venue.distance}</span>
                </>
              )}
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9]">
            <div className="sm:col-span-2 h-full">
              <img
                src={images[0] || fallbackCover}
                alt={venue.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackCover;
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:grid grid-rows-2 gap-3 h-full">
              <img
                src={images[1] || images[0] || fallbackCover}
                alt={`${venue.name} 2`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackCover;
                }}
                className="w-full h-full object-cover"
              />
              <img
                src={images[2] || images[0] || fallbackCover}
                alt={`${venue.name} 3`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackCover;
                }}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Transparent Rate Notice */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
            venue.priceType === 'verified'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>{venue.priceType === 'verified' ? 'Verified Pricing Guarantee:' : 'Indicative Pricing Notice:'}</strong>{' '}
              {venue.priceType === 'verified'
                ? `Current pricing of ${formatPrice(venue.price)} is certified directly with the property operator. Taxes & service charges included.`
                : `Pricing of ${formatPrice(venue.price)} is an indicative estimate based on recent guest bills and seasonal averages.`}
            </div>
          </div>

          {/* Details & Facilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Description & Amenities */}
            <div className="md:col-span-2 space-y-6">
              
              <div>
                <h3 className="font-semibold text-lg text-brand-navy mb-2">
                  About this {venue.type}
                </h3>
                <p className="text-sm text-brand-navy/70 leading-relaxed">
                  {venue.description}
                </p>
              </div>

              {/* Dietary Highlights for Restaurants */}
              {venue.dietary && venue.dietary.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-brand-navy mb-2">
                    Dietary & Culinary Suitability
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {venue.dietary.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-brand-teal-light text-brand-teal border border-brand-teal/20"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Amenities / Facilities */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-brand-navy mb-2">
                    Amenities & Facilities
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {venue.amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-brand-navy/80">
                        <Check className="w-3.5 h-3.5 text-brand-teal flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Property Contact & Verified Map Location */}
              <div className="bg-brand-sand/60 p-4 rounded-2xl border border-brand-sand-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Property Contact & Exact Location</span>
                  </h4>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      venue.address || `${venue.name}, ${venue.destination}, India`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange hover:underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {venue.address && (
                  <p className="text-xs text-brand-navy/70 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                    <span>{venue.address}</span>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {venue.contact?.phone && (
                    <a
                      href={`tel:${venue.contact.phone}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white border border-brand-sand-border text-brand-navy hover:text-brand-orange transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                      <span className="font-medium truncate">{venue.contact.phone}</span>
                    </a>
                  )}

                  {venue.contact?.website && (
                    <a
                      href={venue.contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 rounded-xl bg-white border border-brand-sand-border text-brand-navy hover:text-brand-orange transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                      <span className="font-medium truncate">Official Website</span>
                      <ExternalLink className="w-3 h-3 text-brand-navy/40 ml-auto shrink-0" />
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Right Col: Booking & Collaborative Itinerary Connection Box */}
            <div className="bg-brand-sand p-5 sm:p-6 rounded-3xl border border-brand-sand-border space-y-4 h-fit">
              
              {/* Rate Header */}
              <div className="flex items-baseline justify-between pb-3 border-b border-brand-sand-border">
                <div>
                  <div className="text-xs text-brand-navy/60 font-medium">Rate per {venue.priceUnit}</div>
                  <div className="text-2xl font-bold text-brand-navy">
                    {formatPrice(venue.price)}
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal bg-brand-teal-light px-2 py-0.5 rounded-full">
                  Instant Itinerary
                </span>
              </div>

              {/* Action Mode Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 p-1 gap-1 rounded-2xl bg-white border border-brand-sand-border text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActionMode('book_itinerary')}
                  className={`py-2 px-2 rounded-xl transition-all ${
                    actionMode === 'book_itinerary'
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-brand-navy/70 hover:text-brand-navy'
                  }`}
                >
                  🚀 Book & Create Itinerary
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode('add_existing')}
                  className={`py-2 px-2 rounded-xl transition-all ${
                    actionMode === 'add_existing'
                      ? 'bg-brand-navy text-white shadow-sm'
                      : 'text-brand-navy/70 hover:text-brand-navy'
                  }`}
                >
                  ➕ Add to Current Trip
                </button>
              </div>

              {/* FLOW 1: Book Villa & Create Trip Itinerary */}
              {actionMode === 'book_itinerary' ? (
                <div className="space-y-3.5 pt-1 animate-fadeIn">
                  
                  {/* Number of Guests / People Stepper */}
                  <div>
                    <label className="block text-xs font-semibold text-brand-navy mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-orange" />
                        <span>Number of People / Travellers:</span>
                      </span>
                      <span className="font-bold text-brand-orange">{bookingGuests} Guests</span>
                    </label>
                    <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-brand-sand-border">
                      <button
                        type="button"
                        onClick={() => setBookingGuests(Math.max(1, bookingGuests - 1))}
                        className="w-8 h-8 rounded-xl bg-brand-sand hover:bg-brand-sand-border text-brand-navy font-bold text-sm flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-brand-navy">
                        {bookingGuests} {bookingGuests === 1 ? 'person' : 'people'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBookingGuests(bookingGuests + 1)}
                        className="w-8 h-8 rounded-xl bg-brand-sand hover:bg-brand-sand-border text-brand-navy font-bold text-sm flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Nights & Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-brand-navy/70 mb-1">
                        Trip Duration
                      </label>
                      <select
                        value={bookingNights}
                        onChange={(e) => setBookingNights(Number(e.target.value))}
                        className="w-full text-xs font-semibold bg-white border border-brand-sand-border rounded-xl p-2.5 text-brand-navy focus:outline-none"
                      >
                        <option value={2}>2 Nights (Weekend)</option>
                        <option value={3}>3 Nights (Recommended)</option>
                        <option value={4}>4 Nights (Extended)</option>
                        <option value={5}>5 Nights (Full Vacation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-brand-navy/70 mb-1">
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-brand-sand-border rounded-xl p-2.5 text-brand-navy focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Amount Breakdown Summary */}
                  <div className="p-3 rounded-2xl bg-white border border-brand-sand-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-brand-navy/70">
                      <span>Stay Cost ({bookingNights} nights):</span>
                      <span className="font-semibold text-brand-navy">{formatPrice(totalStayCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-brand-navy/70">
                      <span>Shared Split per Person:</span>
                      <span className="font-bold text-brand-teal">{formatPrice(costPerPerson)}/person</span>
                    </div>
                    <div className="pt-1 border-t border-brand-sand-border flex items-center justify-between text-[11px] text-brand-navy/60">
                      <span>Total Trip Budget Target:</span>
                      <span className="font-mono font-bold text-brand-navy">{formatPrice(totalStayCost * 2)}</span>
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <button
                    type="button"
                    disabled={isBooking}
                    onClick={handleBookStayAndLaunchItinerary}
                    className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-brand-orange hover:bg-brand-orange-hover text-white shadow-card transition-all transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isBooking ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating Itinerary...</span>
                      </>
                    ) : (
                      <>
                        <BedDouble className="w-4 h-4" />
                        <span>Book & Launch Trip Itinerary</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-brand-navy/60 leading-tight">
                    ✨ Automatically creates day & night tasks, inserts smart transit cards, and prepares shared bill split for {bookingGuests} members!
                  </p>

                </div>
              ) : (
                /* FLOW 2: Add to Active Trip */
                <div className="space-y-3 pt-1 animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-semibold text-brand-navy/70 mb-1">
                      Target Day
                    </label>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-brand-sand-border rounded-xl p-2.5 text-brand-navy focus:outline-none"
                    >
                      {(trip?.days || [{ dayNumber: 1 }, { dayNumber: 2 }, { dayNumber: 3 }]).map((d) => (
                        <option key={d.dayNumber} value={d.dayNumber}>
                          Day {d.dayNumber} ({d.dateFormatted || `Day ${d.dayNumber}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-brand-navy/70 mb-1">
                      Time Slot
                    </label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-brand-sand-border rounded-xl p-2.5 text-brand-navy focus:outline-none"
                    >
                      <option value="morning">Morning (Daytime ☀️)</option>
                      <option value="afternoon">Afternoon (Daytime ☀️)</option>
                      <option value="evening">Evening (Golden Hour 🌇)</option>
                      <option value="night">Night (Nightlife & Starlight 🌙)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToItinerary}
                    className={`w-full py-3 px-4 rounded-2xl font-semibold text-xs sm:text-sm transition-all shadow-card flex items-center justify-center gap-2 ${
                      isAdded
                        ? 'bg-brand-teal text-white'
                        : 'bg-brand-navy hover:bg-brand-navy-light text-white active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Day {selectedDay}!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add to Current Itinerary</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-brand-navy/60">
                    Enters itinerary as <strong>Draft</strong> so your crew can vote on it!
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default VenueDetailModal;
