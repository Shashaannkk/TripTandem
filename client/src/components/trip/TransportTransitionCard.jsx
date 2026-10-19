import React, { useState } from 'react';
import { 
  Car, 
  Navigation, 
  Plus, 
  Check, 
  Clock, 
  ArrowRight, 
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';

export const TransportTransitionCard = ({ fromItem, toItem, dayNumber }) => {
  const { formatPrice, currentUser } = useAuth();
  const { addExpense, trip } = useTrip();

  const [addedMode, setAddedMode] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!fromItem || !toItem) return null;

  // Compute simulated distance and travel time between locations
  const fromLoc = fromItem.location || 'Current Spot';
  const toLoc = toItem.location || 'Next Destination';

  // Seeded realistic transit estimates
  const modes = [
    {
      id: 'cab',
      name: 'Cab / Private Taxi',
      tag: 'Most Convenient for Group',
      icon: '🚖',
      basePrice: 420,
      eta: '18 - 22 mins',
      distance: '6.8 km',
      perPerson: Math.round(420 / (trip?.members?.length || 4)),
      vibe: 'AC Comfort · Instant Pickup',
      serviceBadge: 'Uber / GoaMiles / Local Taxi',
    },
    {
      id: 'auto',
      name: 'Auto-Rickshaw',
      tag: 'Breezy City Hop',
      icon: '🛺',
      basePrice: 180,
      eta: '22 - 26 mins',
      distance: '6.8 km',
      perPerson: Math.round(180 / (trip?.members?.length || 4)),
      vibe: 'Open Air · Quick Through Traffic',
      serviceBadge: 'Meter / Prepaid Stand',
    },
    {
      id: 'scooter',
      name: 'Scooter / Bike Rental',
      tag: 'Scenic Coastal Freedom',
      icon: '🛵',
      basePrice: 120, // per person daily share
      eta: '15 - 18 mins',
      distance: '6.8 km',
      perPerson: 120,
      vibe: 'Wind in Hair · Coastal Roads',
      serviceBadge: 'Self-Drive Rental',
    },
    {
      id: 'bus',
      name: 'Local Bus / Shuttle',
      tag: 'Super Budget & Scenic',
      icon: '🚌',
      basePrice: 40 * (trip?.members?.length || 4),
      eta: '30 - 38 mins',
      distance: '7.4 km',
      perPerson: 40,
      vibe: 'Cultural Experience · Coastal Route',
      serviceBadge: 'Kadamba Transport / City Bus',
    },
  ];

  const handleAddTransitSplit = (mode) => {
    addExpense({
      title: `${mode.icon} Transit (${mode.name}): ${fromItem.title} ➔ ${toItem.title}`,
      amount: mode.basePrice,
      category: 'transport',
      paidBy: currentUser?.name || 'Traveler',
      splitWith: trip?.members?.map(m => m.name) || [currentUser?.name || 'Traveler'],
      type: 'actual',
      notes: `Suggested transit gap for Day ${dayNumber}. ${mode.distance} · ${mode.eta}`,
    });

    setAddedMode(mode.id);
    setTimeout(() => {
      setAddedMode(null);
    }, 2800);
  };

  return (
    <div className="relative my-4 group">
      
      {/* Connecting Timeline Cable Line */}
      <div className="absolute left-6 sm:left-8 -top-4 -bottom-4 w-0.5 bg-gradient-to-b from-brand-orange/40 via-brand-teal/40 to-brand-orange/40 pointer-events-none" />

      {/* Main Transit Card Container */}
      <div className="relative ml-4 sm:ml-6 bg-gradient-to-r from-amber-50/70 via-white to-teal-50/70 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-brand-sand-border dark:border-slate-800 shadow-subtle hover:shadow-card transition-all">
        
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-brand-sand-border/70 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange text-xs font-bold flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/60 dark:text-slate-400">
                What After Next · Suggested In-Between Transit
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy dark:text-slate-200">
                <span className="truncate max-w-[140px] sm:max-w-[200px]" title={fromItem.title}>{fromItem.title}</span>
                <ArrowRight className="w-3 h-3 text-brand-orange shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]" title={toItem.title}>{toItem.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 text-brand-teal border border-brand-teal/30">
              <Clock className="w-3 h-3" />
              <span>~20m gap</span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-semibold text-brand-orange hover:text-brand-orange-hover flex items-center gap-0.5"
            >
              <span>{isExpanded ? 'Hide Options' : 'Compare 4 Modes'}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Suggested Modes Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 transition-all ${isExpanded ? 'block' : 'grid'}`}>
          {modes.map((mode) => {
            const isAdded = addedMode === mode.id;

            return (
              <div
                key={mode.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  isAdded
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                    : 'bg-white/90 dark:bg-slate-800/90 border-brand-sand-border dark:border-slate-700 hover:border-brand-orange/40 hover:shadow-subtle'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xl" role="img" aria-label={mode.name}>
                      {mode.icon}
                    </span>
                    <span className="text-[10px] font-bold text-brand-navy/60 dark:text-slate-400 bg-brand-sand/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md">
                      {mode.eta}
                    </span>
                  </div>

                  <div className="mt-1.5">
                    <h4 className="text-xs font-bold text-brand-navy dark:text-slate-100 leading-tight">
                      {mode.name}
                    </h4>
                    <p className="text-[10px] text-brand-navy/60 dark:text-slate-400 mt-0.5">
                      {mode.vibe}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-brand-sand-border/60 dark:border-slate-700 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold text-brand-navy dark:text-slate-100">
                        {formatPrice(mode.basePrice)}
                      </span>
                      <span className="text-[9px] text-brand-navy/50 dark:text-slate-400 block">
                        {formatPrice(mode.perPerson)}/person
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-brand-teal font-medium">
                      {mode.distance}
                    </span>
                  </div>
                </div>

                {/* Direct Action: Add Transit to Split */}
                <button
                  type="button"
                  onClick={() => handleAddTransitSplit(mode)}
                  className={`mt-2.5 w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isAdded
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-brand-orange dark:hover:text-white'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Added to Split!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Add to Split 💳</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick hint */}
        <div className="mt-2 pt-2 border-t border-brand-sand-border/40 dark:border-slate-800 flex items-center justify-between text-[10px] text-brand-navy/50 dark:text-slate-400">
          <span>💡 1-click transit split divides fare equally across all {trip?.members?.length || 4} travel crew members</span>
          <span className="font-medium text-brand-teal">Live Matrix Sync</span>
        </div>

      </div>

    </div>
  );
};

export default TransportTransitionCard;
