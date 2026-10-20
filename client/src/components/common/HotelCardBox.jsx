import React from 'react';
import { 
  MapPin, 
  Star, 
  ExternalLink, 
  Car, 
  Bus, 
  Bed, 
  Utensils, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * HotelCardBox - Standardized Fixed Structure Box for Accommodations & Venues
 * Accepts venue data from any API or catalog and uniformly formats it into a fixed,
 * structured, and responsive card with live photo, location, price, rating,
 * Uber & bus transit estimates, and direct booking actions.
 */
export const HotelCardBox = ({ venue, onBookAction, className = '' }) => {
  const { formatPrice } = useAuth();

  if (!venue) return null;

  const isStay = venue.category === 'stay' || venue.type === 'stay';
  const isFood = venue.category === 'dining' || venue.category === 'food' || venue.category === 'restaurant';
  const actionLabel = isStay ? 'Book Stay Directly' : (isFood ? 'Dine / Reserve' : 'View Details & Guide');
  const ActionIcon = isStay ? Bed : (isFood ? Utensils : MapPin);

  const fallbackCover = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&auto=format&fit=crop&q=80';
  const displayImage = venue.coverImage || venue.image || (venue.images && venue.images[0]) || fallbackCover;

  const displayLocation = [venue.region, venue.destination].filter(Boolean).join(', ') || venue.destination || 'India';

  const priceText = venue.price ? formatPrice(venue.price) : (venue.priceFormatted || 'Free Entry');
  const priceUnitText = venue.priceUnit ? ` / ${venue.priceUnit}` : (isStay ? ' / night' : '');

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-800 shadow-card hover:shadow-card-hover transition-all duration-300 text-brand-navy dark:text-slate-100 flex flex-col justify-between ${className}`}
    >
      {/* 1. Header Media Container */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-900">
        <img
          src={displayImage}
          alt={venue.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackCover;
          }}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/95 text-brand-navy uppercase tracking-wider shadow-xs backdrop-blur-xs">
            {isStay ? '🏨 Stay' : isFood ? '🍽️ Dining' : '🏛️ Attraction'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/90 text-white flex items-center gap-0.5 shadow-xs">
            <Star className="w-2.5 h-2.5 fill-white" />
            <span>{venue.rating || 4.8}</span>
          </span>
          {venue.wikiVerified && (
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-600/90 text-white shadow-xs">
              ✓ Real Photo
            </span>
          )}
        </div>

        {/* Bottom Image Strip */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
          <div className="min-w-0 pr-2">
            <h5 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
              {venue.name}
            </h5>
            <p className="text-[10px] text-slate-200 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-brand-orange shrink-0" />
              <span>{displayLocation}</span>
            </p>
          </div>
          <div className="text-right shrink-0 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
            <span className="text-xs font-bold text-emerald-300">
              {priceText}
            </span>
            <span className="text-[9px] text-slate-300 block leading-none">
              {priceUnitText}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Structured Content Body */}
      <div className="p-3 space-y-2.5">
        {/* Short Description */}
        {venue.description && (
          <p className="text-[11px] text-brand-navy/70 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {venue.description}
          </p>
        )}

        {/* 3. Real-Time Transit Box (Uber & Local Bus) */}
        {venue.transit && (
          <div className="grid grid-cols-1 gap-1.5 text-[9px]">
            {/* Uber Estimated Fare Strip */}
            <div className="p-2 rounded-xl bg-slate-900 text-white space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-[10px] text-amber-400">
                  <Car className="w-3.5 h-3.5" />
                  <span>Uber Rates (~{venue.transit.distanceKm} km from Hub)</span>
                </span>
                <a
                  href={venue.transit.uber?.deepLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-amber-300 hover:underline font-bold"
                >
                  Open Uber ↗
                </a>
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-300 border-t border-slate-800 pt-1">
                <span>Auto: <strong className="text-white">₹{venue.transit.uber?.autoFare}</strong></span>
                <span>Go: <strong className="text-white">₹{venue.transit.uber?.goFare}</strong></span>
                <span>Premier: <strong className="text-white">₹{venue.transit.uber?.premierFare}</strong></span>
              </div>
            </div>

            {/* Bus Transit Route Strip */}
            {venue.transit.bus && (
              <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-100 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-[10px] text-emerald-300">
                    <Bus className="w-3.5 h-3.5" />
                    <span>Local Bus Transit</span>
                  </span>
                  <span className="text-[8px] font-bold text-white bg-emerald-800/80 px-1.5 py-0.5 rounded">
                    {venue.transit.bus.fare}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-emerald-200">
                  <span className="truncate max-w-[200px]">{venue.transit.bus.line}</span>
                  <a
                    href={venue.transit.bus.directionsLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.name + ' ' + venue.destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-emerald-300 hover:underline shrink-0 font-bold"
                  >
                    Routes ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Action Buttons (Direct Booking & Google Maps) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-sand-border/50 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onBookAction?.(venue)}
            className="py-1.5 px-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <ActionIcon className="w-3.5 h-3.5" />
            <span className="truncate">{actionLabel}</span>
          </button>

          <a
            href={venue.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + (venue.region || venue.destination))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-2.5 rounded-xl bg-brand-sand dark:bg-slate-800 hover:bg-brand-sand-border dark:hover:bg-slate-700 text-brand-navy dark:text-white border border-brand-sand-border dark:border-slate-700 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
            <span>Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
};
