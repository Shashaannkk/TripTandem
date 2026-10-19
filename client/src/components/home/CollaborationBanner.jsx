import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Vote, Lock, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { USERS } from '../../data/mockData';

export const CollaborationBanner = () => {
  return (
    <section className="py-20 bg-brand-navy text-white rounded-3xl md:rounded-[3rem] my-16 mx-4 sm:mx-6 lg:mx-8 px-6 sm:px-12 lg:px-16 overflow-hidden relative shadow-card-hover">
      
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-teal/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Brand Story & Values */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-brand-yellow text-xs font-semibold uppercase tracking-wider border border-white/10">
            <Users className="w-3.5 h-3.5 text-brand-teal" />
            <span>The TripTandem Difference</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
            No more fragmented group chats.{' '}
            <span className="text-brand-orange">
              Find your collective rhythm.
            </span>
          </h2>

          <p className="text-brand-sand-muted text-base sm:text-lg leading-relaxed font-normal">
            Planning a trip with friends shouldn't mean endless WhatsApp polls and lost links. TripTandem brings your group into a unified workspace with live presence, shared voting, conflict alerts, and fair budget splitting.
          </p>

          {/* Pillars List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <Vote className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Group Voting & Locking</h4>
                <p className="text-xs text-brand-sand-muted/80 mt-0.5">Activities transition from Draft to Locked when friends approve.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <ShieldCheck className="w-5 h-5 text-brand-teal flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Conflict Safeguards</h4>
                <p className="text-xs text-brand-sand-muted/80 mt-0.5">Detects overlapping times, tight transit gaps, and budget ceilings.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              to="/workspace/trip-goa-2026"
              className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-card transition-all transform hover:scale-105 active:scale-95"
            >
              <span>Explore Live Collaborative Trip</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: Interactive Visual Workspace Preview Card */}
        <div className="relative">
          <div className="bg-white rounded-3xl p-6 text-brand-navy shadow-floating border border-brand-sand-border space-y-4">
            
            {/* Simulated Live Workspace Header */}
            <div className="flex items-center justify-between border-b border-brand-sand-border pb-4">
              <div>
                <div className="text-xs text-brand-navy/60 font-medium">Collaborative Itinerary · Day 2</div>
                <h4 className="font-semibold text-lg text-brand-navy">Goa Coastal Rhythm</h4>
              </div>

              {/* Real-time active avatars */}
              <div className="flex items-center -space-x-2">
                {USERS.map((user, idx) => (
                  <div key={user.id} className="relative group">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover ring-1 ring-brand-teal"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  </div>
                ))}
                <span className="pl-3 text-xs font-semibold text-brand-teal">
                  4 active now
                </span>
              </div>
            </div>

            {/* Simulated Activity Card in Voting State */}
            <div className="bg-brand-sand rounded-2xl p-4 border border-brand-orange/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-orange-light text-brand-orange">
                    <Vote className="w-3.5 h-3.5" />
                    <span>3 of 4 votes · 1 needed to lock</span>
                  </span>
                  <h5 className="font-semibold text-sm mt-1.5">
                    Sunset Catamaran Sailing & Dolphin Spotting
                  </h5>
                  <p className="text-xs text-brand-navy/60">05:00 PM · Mandovi Bay · ₹2,400/person</p>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&auto=format&fit=crop&q=80"
                  alt="Catamaran"
                  className="w-14 h-14 rounded-xl object-cover ml-3"
                />
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-brand-sand-border rounded-full h-2">
                  <div className="bg-brand-orange h-2 rounded-full w-3/4 transition-all" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-brand-navy/60">
                  <span>Voted: Alex, Priya, Rohan</span>
                  <span className="font-semibold text-brand-orange">Aisha reviewing budget</span>
                </div>
              </div>
            </div>

            {/* Simulated Conflict Alert */}
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold">⚠️ Warning</span>
                <span>Travel gap tight between Sinquerim & Anjuna.</span>
              </div>
              <span className="font-semibold text-brand-teal cursor-pointer">
                Auto-adjust +20m
              </span>
            </div>

            {/* AI Assistant Grounded Hint */}
            <div className="bg-purple-50 rounded-2xl p-3 border border-purple-200 flex items-center gap-2.5 text-xs text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span>
                <strong>TripTandem AI:</strong> Verified vegetarian dinner alternatives ready nearby within your ₹1,200/person budget.
              </span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default CollaborationBanner;
