import React, { useState } from 'react';
import { Heart, Star, MapPin, ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { Badge } from '../common/Badge';

export const VenueCard = ({ venue, onSelectVenue, guestCount = 1 }) => {
  const { formatPrice, savedFavorites, toggleFavorite } = useAuth();
  const { addActivity, trip } = useTrip();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  const isFavorite = savedFavorites.includes(venue.id);
  const fallbackCover = 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80';
  const rawImages = (venue.images && venue.images.length > 0)
    ? venue.images.filter(Boolean)
    : [venue.coverImage || fallbackCover];
  const images = rawImages.length > 0 ? rawImages : [fallbackCover];

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    addActivity(1, 'afternoon', {
      title: venue.name,
      venueId: venue.id,
      venueName: venue.name,
      category: venue.type,
      image: venue.coverImage,
      costPerPerson: venue.price,
      location: venue.region || venue.destination,
      notes: `Quick added from Explore. Rated ${venue.rating} ★`,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div
      onClick={() => onSelectVenue && onSelectVenue(venue)}
      className="group cursor-pointer bg-white rounded-3xl p-3 border border-brand-sand-border/80 shadow-subtle hover:shadow-card-hover transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
    >
      {/* Image Container with Carousel Controls */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-brand-sand">
        <img
          src={images[currentImageIndex]}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Floating Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {venue.badge && (
            <span className="bg-white/90 backdrop-blur-md text-brand-navy px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm">
              {venue.badge}
            </span>
          )}
          {venue.priceType === 'verified' ? (
            <Badge type="verified" text="Verified" />
          ) : (
            <Badge type="indicative" text="Indicative" />
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(venue.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-md text-brand-navy hover:text-brand-orange hover:bg-white transition-all z-10 shadow-sm"
          title={isFavorite ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart
            className={`w-4 h-4 transition-transform active:scale-125 ${
              isFavorite ? 'fill-brand-orange text-brand-orange' : 'text-brand-navy'
            }`}
          />
        </button>

        {/* Carousel Arrows on Hover */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={prevImage}
              className="p-1.5 rounded-full bg-white/90 hover:bg-white text-brand-navy shadow-sm transition-transform hover:scale-110"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={nextImage}
              className="p-1.5 rounded-full bg-white/90 hover:bg-white text-brand-navy shadow-sm transition-transform hover:scale-110"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Carousel Pagination Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="pt-3.5 px-1 space-y-1.5">
        
        {/* Rating and Region */}
        <div className="flex items-center justify-between text-xs text-brand-navy/70">
          <span className="flex items-center gap-1 font-medium text-brand-navy">
            <MapPin className="w-3.5 h-3.5 text-brand-orange" />
            {venue.region}
          </span>
          <div className="flex items-center gap-1 font-semibold text-brand-navy">
            <Star className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
            <span>{venue.rating}</span>
            <span className="text-brand-navy/40 font-normal">({venue.reviewCount})</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-brand-navy line-clamp-1 group-hover:text-brand-orange transition-colors">
          {venue.name}
        </h3>

        {/* Distance or Highlight */}
        <p className="text-xs text-brand-navy/60 line-clamp-1">
          {venue.distance || venue.category}
        </p>

        {/* Price & Quick Add Button */}
        <div className="pt-2 flex items-center justify-between border-t border-brand-sand-border/60">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-brand-navy">
                {formatPrice(venue.price)}
              </span>
              {venue.price && (
                <span className="text-xs text-brand-navy/60">
                  /{venue.priceUnit || 'night'}
                </span>
              )}
            </div>
            {guestCount > 1 && venue.price && (
              <span className="text-[10px] text-brand-teal font-medium tracking-tight">
                ~{formatPrice(Math.round(venue.price / guestCount))}/person ({guestCount} split)
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            className={`p-2 rounded-full text-xs font-medium transition-all ${
              isAdded
                ? 'bg-brand-teal text-white'
                : 'bg-brand-sand hover:bg-brand-orange hover:text-white text-brand-navy'
            }`}
            title="Quick add as draft to active trip"
          >
            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default VenueCard;
