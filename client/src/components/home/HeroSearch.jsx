import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, MapPin, Calendar, Users, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const HeroSearch = () => {
  const navigate = useNavigate();
  const { formatPrice } = useAuth();

  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('4');
  const [budget, setBudget] = useState('35000');
  const [activeTab, setActiveTab] = useState('stays'); // 'stays' | 'ai'

  const popularDestinations = ['Goa', 'Manali', 'Jaipur', 'Bali', 'Kyoto', 'Amalfi Coast'];

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.append('destination', destination);
    if (guests) params.append('guests', guests);
    if (budget) params.append('budget', budget);
    navigate(`/explore?${params.toString()}`);
  };

  const handlePlanWithAi = () => {
    navigate(`/ai-concierge?destination=${destination || 'Goa'}&guests=${guests}&budget=${budget}`);
  };

  return (
    <div className="relative pt-6 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-orange-light/40 via-brand-sand to-transparent pointer-events-none rounded-b-[4rem]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Brand Tagline & Headline */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-orange-light text-brand-orange text-xs font-semibold uppercase tracking-wider mb-6 border border-brand-orange/20 shadow-subtle">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Plan your trip. Find your rhythm.</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-brand-navy tracking-tight max-w-4xl mx-auto leading-[1.15]">
          Travel discovery meets{' '}
          <span className="text-brand-orange underline decoration-brand-yellow/60 decoration-wavy decoration-2">
            collaborative harmony
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-brand-navy/70 max-w-2xl mx-auto font-normal">
          Explore stunning stays and verified venues, invite friends to vote in real-time, balance shared budgets, and let grounded AI curate the journey.
        </p>

        {/* Search & AI Switcher Pill Tabs */}
        <div className="mt-10 inline-flex p-1 rounded-full bg-brand-sand-muted border border-brand-sand-border shadow-inner">
          <button
            onClick={() => setActiveTab('stays')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'stays'
                ? 'bg-white text-brand-navy shadow-sm'
                : 'text-brand-navy/70 hover:text-brand-navy'
            }`}
          >
            Explore Stays & Places
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-brand-navy/70 hover:text-brand-navy'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
            <span>Plan with AI Concierge</span>
          </button>
        </div>

        {/* Main Floating Search Console */}
        <div className="mt-4 max-w-5xl mx-auto bg-white rounded-3xl sm:rounded-full shadow-search border border-brand-sand-border p-3 sm:p-2.5 transition-all">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-brand-sand-border">
            
            {/* Field 1: Destination */}
            <div className="w-full sm:w-1/3 px-5 py-3 text-left group">
              <label className="block text-[11px] font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                <span>Where to?</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Goa, Manali, Jaipur, Bali..."
                className="w-full text-sm font-medium text-brand-navy placeholder:text-brand-navy/40 focus:outline-none bg-transparent pt-0.5"
              />
            </div>

            {/* Field 2: Dates */}
            <div className="w-full sm:w-1/4 px-5 py-3 text-left">
              <label className="block text-[11px] font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-teal" />
                <span>When</span>
              </label>
              <input
                type="text"
                placeholder="Nov 14 - Nov 17"
                className="w-full text-sm font-medium text-brand-navy placeholder:text-brand-navy/40 focus:outline-none bg-transparent pt-0.5"
              />
            </div>

            {/* Field 3: Travellers & Budget */}
            <div className="w-full sm:w-1/3 px-5 py-3 text-left flex items-center justify-between">
              <div className="flex-1 pr-3">
                <label className="block text-[11px] font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-yellow" />
                  <span>Travellers & Budget</span>
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="text-xs font-semibold text-brand-navy bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="1">1 Solo</option>
                    <option value="2">2 Couple</option>
                    <option value="4">4 Friends</option>
                    <option value="6">6 Group</option>
                  </select>
                  <span className="text-brand-navy/30">·</span>
                  <span className="text-xs text-brand-teal font-semibold">
                    Max {formatPrice(Number(budget))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'ai' ? (
                  <button
                    type="button"
                    onClick={handlePlanWithAi}
                    className="flex items-center gap-2 bg-brand-navy hover:bg-brand-navy-light text-white px-6 py-3.5 rounded-full font-medium text-sm shadow-card transition-all transform hover:scale-[1.02] active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-brand-yellow" />
                    <span>Plan with AI</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center justify-center bg-brand-orange hover:bg-brand-orange-hover text-white p-3.5 sm:px-6 sm:py-3.5 rounded-full font-medium text-sm shadow-card transition-all transform hover:scale-[1.02] active:scale-95"
                  >
                    <Search className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                )}
              </div>

            </div>

          </form>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 flex items-center justify-center flex-wrap gap-2 text-xs text-brand-navy/70">
          <span className="font-medium text-brand-navy/80">Trending right now:</span>
          {popularDestinations.map((dest) => (
            <button
              key={dest}
              onClick={() => {
                setDestination(dest);
                navigate(`/explore?destination=${dest}`);
              }}
              className="px-3 py-1 rounded-full bg-white/80 hover:bg-white text-brand-navy border border-brand-sand-border hover:border-brand-orange/40 transition-all font-medium"
            >
              {dest}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default HeroSearch;
