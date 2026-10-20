import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CinematicHero } from '../components/home/CinematicHero';
import { CategoryBar } from '../components/home/CategoryBar';
import { VenueCard } from '../components/home/VenueCard';
import { CollaborationBanner } from '../components/home/CollaborationBanner';
import { VenueDetailModal } from '../components/venue/VenueDetailModal';
import { PopularDestinationsCarousel } from '../components/home/PopularDestinationsCarousel';
import { VENUES } from '../data/mockData';
import { ArrowRight, Sparkles, MapPin, Star, Flame, Compass } from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState(null);

  const stays = VENUES.filter(v => v.type === 'stay');
  const diningAndExperiences = VENUES.filter(v => v.type !== 'stay');

  const filteredStays = selectedCategory === 'all'
    ? stays
    : stays.filter(s => s.category === selectedCategory);

  return (
    <div className="min-h-screen">
      
      {/* 1. Cinematic Video Hero & Quick Search */}
      <CinematicHero />

      {/* 2. Category Navigation */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          if (catId !== 'all') {
            navigate(`/explore?category=${catId}`);
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        
        {/* Section 1: Popular Destinations (Netflix-Style 1-Line Carousel with Left/Right Buttons) */}
        <PopularDestinationsCarousel />

        {/* Section 2: Stays Worth Exploring */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal uppercase tracking-wider mb-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Handpicked Rhythm</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-brand-navy">
                Stays Worth Exploring
              </h2>
            </div>
            <button
              onClick={() => navigate('/explore?type=stay')}
              className="text-xs sm:text-sm font-semibold text-brand-teal hover:text-brand-teal-hover flex items-center gap-1 group"
            >
              <span>View all stays</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStays.slice(0, 6).map((stay) => (
              <VenueCard
                key={stay.id}
                venue={stay}
                onSelectVenue={(v) => setSelectedVenue(v)}
              />
            ))}
          </div>
        </section>

        {/* Section 3: Prominent Collaborative Feature Banner */}
        <CollaborationBanner />

        {/* Section 4: Restaurants & Local Culinary Experiences */}
        <section className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Culinary & Adventure</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-brand-navy">
                Dining & Experiences
              </h2>
            </div>
            <button
              onClick={() => navigate('/explore?type=restaurant')}
              className="text-xs sm:text-sm font-semibold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {diningAndExperiences.slice(0, 6).map((exp) => (
              <VenueCard
                key={exp.id}
                venue={exp}
                onSelectVenue={(v) => setSelectedVenue(v)}
              />
            ))}
          </div>
        </section>

        {/* Section 5: Trips Planned with AI (Cloneable / Interactive Itineraries) */}
        <section className="bg-white rounded-3xl p-8 border border-brand-sand-border shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-teal uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Grounded AI Planning</span>
              </div>
              <h2 className="text-2xl font-semibold text-brand-navy">
                Community Trips Planned with AI
              </h2>
              <p className="text-xs text-brand-navy/60 mt-1">
                Structured itineraries tailored with budget ceilings, travel gaps, and group votes.
              </p>
            </div>

            <button
              onClick={() => navigate('/workspace/trip-goa-2026')}
              className="inline-flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-light text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-sm transition-all"
            >
              <span>Open Goa Master Trip</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div 
              onClick={() => navigate('/workspace/trip-goa-2026')}
              className="group cursor-pointer p-4 rounded-2xl bg-brand-sand/40 border border-brand-sand-border hover:border-brand-orange/40 transition-all space-y-3"
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-brand-sand">
                <img
                  src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format&fit=crop&q=80"
                  alt="Goa"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-brand-orange uppercase">3 Days · 4 Friends</span>
                <h4 className="font-semibold text-sm text-brand-navy mt-0.5">Goa Coastal Rhythm & Sunsets</h4>
                <p className="text-xs text-brand-navy/60 mt-1">Villa Solitude, Fort Aguada, and Gunpowder coastal dining under ₹10k/person.</p>
              </div>
            </div>

            <div 
              onClick={() => navigate('/workspace/trip-goa-2026')}
              className="group cursor-pointer p-4 rounded-2xl bg-brand-sand/40 border border-brand-sand-border hover:border-brand-teal/40 transition-all space-y-3"
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-brand-sand">
                <img
                  src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&auto=format&fit=crop&q=80"
                  alt="Manali"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-brand-teal uppercase">4 Days · Mountain Lovers</span>
                <h4 className="font-semibold text-sm text-brand-navy mt-0.5">Manali Alpine Pines & Solang High</h4>
                <p className="text-xs text-brand-navy/60 mt-1">Cedar wood chalets, tandem paragliding, and cozy fireside trout dinners.</p>
              </div>
            </div>

            <div 
              onClick={() => navigate('/workspace/trip-goa-2026')}
              className="group cursor-pointer p-4 rounded-2xl bg-brand-sand/40 border border-brand-sand-border hover:border-brand-yellow/60 transition-all space-y-3"
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-brand-sand">
                <img
                  src="https://images.unsplash.com/photo-1477587458883-47145ed94245?w=600&auto=format&fit=crop&q=80"
                  alt="Jaipur"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-600 uppercase">3 Days · Heritage & Food</span>
                <h4 className="font-semibold text-sm text-brand-navy mt-0.5">Pink City Royal Haveli Retreat</h4>
                <p className="text-xs text-brand-navy/60 mt-1">Samode Haveli courtyard pool, LMB Rajasthani feasts, and Amber Fort dawn walk.</p>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Reusable Venue Detail Modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
        />
      )}

    </div>
  );
};

export default HomePage;
