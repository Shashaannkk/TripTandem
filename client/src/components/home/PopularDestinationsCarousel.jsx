import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { FEATURED_DESTINATIONS } from '../../data/mockData';

/**
 * PopularDestinationsCarousel
 * Netflix-style single-line horizontal scroll carousel with floating left/right navigation controls,
 * edge fade gradients, responsive poster cards, and authentic destination imagery.
 */
export const PopularDestinationsCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollLimits = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScrollLimits();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollLimits, { passive: true });
      window.addEventListener('resize', checkScrollLimits);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollLimits);
      window.removeEventListener('resize', checkScrollLimits);
    };
  }, []);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -520 : 520;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section 
      id="destinations-section" 
      className="space-y-4 scroll-mt-24 relative select-none"
    >
      {/* Header with Title and View All Link */}
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-1">
            <Flame className="w-3.5 h-3.5 fill-brand-orange" />
            <span>Travel Discovery · Netflix Row</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-brand-navy dark:text-white">
            Popular Destinations
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs text-brand-navy/60 dark:text-slate-400">
            Scroll horizontally to discover
          </span>
          <button
            onClick={() => navigate('/explore')}
            className="text-xs sm:text-sm font-semibold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1 group cursor-pointer"
          >
            <span>Explore all ({FEATURED_DESTINATIONS.length})</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Netflix-Style Carousel Container */}
      <div className="relative group/carousel">
        {/* Left Navigation Chevron Button (Netflix Style) */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
          className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
            canScrollLeft
              ? 'bg-black/75 hover:bg-black/95 text-white backdrop-blur-md hover:scale-110 active:scale-95 border border-white/20 opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Right Navigation Chevron Button (Netflix Style) */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label="Scroll right"
          className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
            canScrollRight
              ? 'bg-black/75 hover:bg-black/95 text-white backdrop-blur-md hover:scale-110 active:scale-95 border border-white/20 opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Left Gradient Mask for smooth fade */}
        <div 
          className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-brand-sand dark:from-[#0A111E] to-transparent z-10 transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`} 
        />

        {/* Right Gradient Mask for smooth fade */}
        <div 
          className={`pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-brand-sand dark:from-[#0A111E] to-transparent z-10 transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`} 
        />

        {/* The 1-Line Horizontal Scroll Track */}
        <div
          ref={scrollRef}
          className="flex flex-nowrap gap-4 overflow-x-auto scroll-smooth scrollbar-none py-2 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FEATURED_DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              onClick={() => navigate(`/explore?destination=${encodeURIComponent(dest.name)}`)}
              className="group/card relative w-52 sm:w-60 h-72 sm:h-80 shrink-0 rounded-3xl overflow-hidden cursor-pointer shadow-card hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1.5 snap-start border border-brand-sand-border dark:border-slate-800 bg-slate-900"
            >
              {/* Full-bleed authentic destination photo */}
              <img
                src={dest.image}
                alt={dest.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80';
                }}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
              />

              {/* Cinematic Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-opacity group-hover/card:via-black/25" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 z-10">
                {dest.trending ? (
                  <span className="bg-brand-orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-xs">
                    <Flame className="w-3 h-3 fill-white" />
                    <span>Trending</span>
                  </span>
                ) : (
                  <span className="bg-black/55 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15">
                    ✨ Featured
                  </span>
                )}
                {dest.venuesCount && (
                  <span className="bg-white/90 text-brand-navy text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {dest.venuesCount}+ Spots
                  </span>
                )}
              </div>

              {/* Bottom Information Details */}
              <div className="absolute bottom-3 left-3 right-3 z-10 space-y-1">
                <p className="text-[11px] font-medium text-amber-300 flex items-center gap-1 tracking-wide">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{dest.region || dest.country}</span>
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight drop-shadow-md group-hover/card:text-amber-200 transition-colors">
                  {dest.name}
                </h3>
                {dest.tagline && (
                  <p className="text-[11px] text-slate-300 line-clamp-1 opacity-90">
                    {dest.tagline}
                  </p>
                )}

                {/* Hover action prompt */}
                <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-orange group-hover/card:translate-x-1 transition-transform">
                  <span>Explore Hotels & Places</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularDestinationsCarousel;
