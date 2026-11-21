import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Plus, 
  MapPin, 
  Calendar, 
  Wallet, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Compass,
  FileSpreadsheet
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

const POPULAR_DESTINATIONS = [
  { name: 'Goa', state: 'India', tag: 'Beaches & Shacks' },
  { name: 'Manali', state: 'Himachal', tag: 'Snow & Pines' },
  { name: 'Jaipur', state: 'Rajasthan', tag: 'Havelis & Palaces' },
  { name: 'Kerala', state: 'India', tag: 'Backwaters & Hills' },
  { name: 'Udupi', state: 'Karnataka', tag: 'Coastal Temples' },
  { name: 'Udaipur', state: 'Rajasthan', tag: 'Lakes & Heritage' },
];

const BUDGET_PRESETS = [15000, 30000, 50000, 75000];

export const CreateTripModal = () => {
  const navigate = useNavigate();
  const { 
    isCreateTripModalOpen, 
    setIsCreateTripModalOpen, 
    createNewBlankTrip, 
    trip: activeTrip 
  } = useTrip();
  const { showToast, formatPrice } = useAuth();

  const [destination, setDestination] = useState('Goa, India');
  const [title, setTitle] = useState('');
  const [daysCount, setDaysCount] = useState(3);
  const [budgetTotal, setBudgetTotal] = useState(30000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateTripModalOpen) return null;

  const handleSelectDest = (destName, state) => {
    const full = `${destName}, ${state}`;
    setDestination(full);
    if (!title || title.includes('Trip Itinerary') || title.includes('Escape')) {
      setTitle(`${destName} Collaborative Trip`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      showToast('Please specify a trip destination', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || `${destination.split(',')[0]} Collaborative Trip`;
      const newTrip = await createNewBlankTrip({
        destination: destination.trim(),
        title: finalTitle,
        daysCount: Number(daysCount) || 3,
        budgetTotal: Number(budgetTotal) || 30000,
      });

      setIsCreateTripModalOpen(false);
      showToast(`Created new blank trip: "${newTrip.title}"! 🚀`, 'success');

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}

      navigate(`/workspace/${newTrip.id}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create trip. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111C2E] rounded-3xl shadow-floating border border-brand-sand-border dark:border-[#1E2D42] p-6 sm:p-7 space-y-5 animate-scaleUp text-brand-navy dark:text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-brand-sand-border dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange-light dark:bg-orange-950/40 text-brand-orange">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-brand-navy dark:text-white">
                Plan a New Trip (Blank Itinerary)
              </h3>
              <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                Start fresh and build your itinerary from scratch with friends
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateTripModalOpen(false)}
            className="p-1 rounded-full text-brand-navy/40 hover:text-brand-navy hover:bg-brand-sand dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Close Create Trip Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Destination */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
              Where are you traveling?
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-orange" />
              <input
                type="text"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (!title || title.includes('Trip Itinerary') || title.includes('Collaborative Trip')) {
                    setTitle(`${e.target.value.split(',')[0]} Collaborative Trip`);
                  }
                }}
                placeholder="e.g. Goa, Manali, Jaipur, Udupi, Munnar..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                required
              />
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-brand-navy/50 dark:text-slate-400 mr-1">
                Popular:
              </span>
              {POPULAR_DESTINATIONS.map(d => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => handleSelectDest(d.name, d.state)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    destination.toLowerCase().includes(d.name.toLowerCase())
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 border-brand-sand-border dark:border-slate-700 hover:border-brand-orange'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Trip Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
              Trip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Goa Coastal Rhythm & Sunset Sessions"
              className="w-full px-4 py-2.5 rounded-2xl bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          {/* Duration & Budget Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Number of Days */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
                Duration (Days)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 7].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysCount(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      daysCount === d
                        ? 'bg-brand-navy text-white dark:bg-white dark:text-brand-navy border-brand-navy dark:border-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 border-brand-sand-border dark:border-slate-700 hover:border-brand-teal'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>

            {/* Target Budget */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
                Target Group Budget (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-teal">
                  ₹
                </span>
                <input
                  type="number"
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(Number(e.target.value))}
                  step="1000"
                  min="5000"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-xs font-bold text-brand-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>
            </div>

          </div>

          {/* PRD Blank Canvas Guarantee Notice */}
          <div className="p-3 rounded-2xl bg-brand-sand/40 dark:bg-slate-800/40 border border-brand-sand-border dark:border-slate-700/60 text-xs text-brand-navy/70 dark:text-slate-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              Starts with a <strong>clean, empty itinerary</strong> (0 pre-filled mock activities). You and your crew have full freedom to add stays, vote on activities, and split costs.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating Blank Trip...' : 'Create Blank Trip Itinerary ✨'}</span>
          </button>

          {/* Quick link to currently active trip if one exists */}
          {activeTrip && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreateTripModalOpen(false);
                  navigate(`/workspace/${activeTrip.id}`);
                }}
                className="text-xs font-semibold text-brand-navy/60 dark:text-slate-400 hover:text-brand-orange transition-colors"
              >
                Or continue editing: <strong>{activeTrip.title}</strong> →
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
