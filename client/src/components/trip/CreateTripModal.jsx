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
  ChevronDown
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

export const DESTINATION_OPTIONS = [
  { value: 'Manali, Himachal Pradesh', city: 'Manali', state: 'Himachal Pradesh', tag: 'Snow Peaks, Treks & Pine Cafes' },
  { value: 'Goa, India', city: 'Goa', state: 'Goa', tag: 'Beaches, Sunsets & Beach Shacks' },
  { value: 'Udaipur, Rajasthan', city: 'Udaipur', state: 'Rajasthan', tag: 'Lakes, Palaces & Rooftop Dining' },
  { value: 'Jaipur, Rajasthan', city: 'Jaipur', state: 'Rajasthan', tag: 'Pink City, Havelis & Forts' },
  { value: 'Kerala, India', city: 'Kerala', state: 'Kerala', tag: 'Backwaters, Tea Hills & Munnar' },
  { value: 'Udupi, Karnataka', city: 'Udupi', state: 'Karnataka', tag: 'Malpe Beach, Kaup Lighthouse & Temples' },
  { value: 'Rishikesh, Uttarakhand', city: 'Rishikesh', state: 'Uttarakhand', tag: 'Ganga Aarti, River Rafting & Yoga' },
  { value: 'Pondicherry, India', city: 'Pondicherry', state: 'Puducherry', tag: 'French Colony & Rock Beach' },
  { value: 'Darjeeling, West Bengal', city: 'Darjeeling', state: 'West Bengal', tag: 'Tea Gardens & Kanchenjunga Sunrises' },
  { value: 'Coorg, Karnataka', city: 'Coorg', state: 'Karnataka', tag: 'Coffee Plantations & Abbey Falls' },
  { value: 'Gokarna, Karnataka', city: 'Gokarna', state: 'Karnataka', tag: 'Om Beach & Cliff Treks' },
  { value: 'Ooty, Tamil Nadu', city: 'Ooty', state: 'Tamil Nadu', tag: 'Nilgiri Hills & Toy Train' },
  { value: 'Leh Ladakh, India', city: 'Leh Ladakh', state: 'Ladakh', tag: 'Pangong Lake & Mountain Passes' },
  { value: 'custom', city: '', state: '', tag: 'Custom / Other Destination' },
];

export const CreateTripModal = () => {
  const navigate = useNavigate();
  const { 
    isCreateTripModalOpen, 
    setIsCreateTripModalOpen, 
    createNewBlankTrip, 
    trip: activeTrip 
  } = useTrip();
  const { showToast, formatPrice, currentUser } = useAuth();

  const [selectedDestOption, setSelectedDestOption] = useState('Manali, Himachal Pradesh');
  const [customDestination, setCustomDestination] = useState('');
  const [title, setTitle] = useState('Manali Mountain Escape & Pine Trails');
  const [daysCount, setDaysCount] = useState(3);
  const [budgetTotal, setBudgetTotal] = useState(30000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateTripModalOpen) return null;

  const getEffectiveDestination = () => {
    if (selectedDestOption === 'custom') {
      return customDestination.trim() || 'Custom Destination';
    }
    return selectedDestOption;
  };

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedDestOption(val);
    if (val !== 'custom') {
      const opt = DESTINATION_OPTIONS.find(d => d.value === val);
      if (opt && opt.city) {
        setTitle(`${opt.city} Collaborative Trip`);
      }
    }
  };

  const handleChipSelect = (opt) => {
    setSelectedDestOption(opt.value);
    setTitle(`${opt.city} Collaborative Trip`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in first to plan a trip', 'warning');
      setIsCreateTripModalOpen(false);
      navigate('/login', { state: { returnTo: '/explore' } });
      return;
    }
    const effectiveDest = getEffectiveDestination();
    if (!effectiveDest) {
      showToast('Please specify a trip destination', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cityName = selectedDestOption !== 'custom' 
        ? DESTINATION_OPTIONS.find(d => d.value === selectedDestOption)?.city || effectiveDest.split(',')[0].trim()
        : effectiveDest.split(',')[0].trim();

      const finalTitle = title.trim() || `${cityName} Collaborative Trip`;

      const newTrip = await createNewBlankTrip({
        destination: effectiveDest,
        title: finalTitle,
        daysCount: Number(daysCount) || 3,
        budgetTotal: Number(budgetTotal) || 30000,
      });

      setIsCreateTripModalOpen(false);
      showToast(`Created new trip: "${newTrip.title}"! 🚀`, 'success');

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}

      // Navigate directly to the destination selection page where all things for that place are listed
      navigate(`/explore?destination=${encodeURIComponent(cityName)}&tripId=${newTrip.id}&tripTitle=${encodeURIComponent(newTrip.title)}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create trip. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCityName = selectedDestOption !== 'custom'
    ? DESTINATION_OPTIONS.find(d => d.value === selectedDestOption)?.city || 'Manali'
    : 'Selected Destination';

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
                Start a New Trip
              </h3>
              <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                Choose destination, name your trip, and pick places to visit
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateTripModalOpen(false)}
            className="p-1.5 rounded-full text-brand-navy/40 hover:text-brand-navy hover:bg-brand-sand dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close Create Trip Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sign In Required Notice */}
        {!currentUser && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col gap-2.5 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              <span className="font-bold text-xs">Sign In Required to Plan Trips</span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              Please sign in to your account or create a free account so your group itineraries and custom places can be saved securely.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreateTripModalOpen(false);
                  navigate('/login', { state: { returnTo: '/explore' } });
                }}
                className="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange-hover transition-all cursor-pointer shadow-xs"
              >
                Sign In Now ➔
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreateTripModalOpen(false);
                  navigate('/register');
                }}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-brand-navy dark:text-white border border-brand-sand-border dark:border-slate-700 text-xs font-bold hover:bg-brand-sand transition-all cursor-pointer"
              >
                Create Free Account
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Trip Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
              Trip Name / Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Manali Snow Expedition & Pine Trails"
              className="w-full px-4 py-2.5 rounded-2xl bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-orange"
              required
            />
          </div>

          {/* 2. Destination Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 flex items-center justify-between">
              <span>Select Destination (Place)</span>
              <span className="text-[10px] text-brand-teal font-bold uppercase tracking-wider">Dropdown</span>
            </label>
            
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-orange pointer-events-none" />
              <select
                value={selectedDestOption}
                onChange={handleDropdownChange}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-semibold text-brand-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none cursor-pointer"
              >
                {DESTINATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-brand-navy dark:text-white py-1">
                    {opt.value === 'custom' ? '✨ Custom / Other Destination...' : `${opt.city} (${opt.state}) — ${opt.tag}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy/50 pointer-events-none" />
            </div>

            {/* Custom Destination input if selected */}
            {selectedDestOption === 'custom' && (
              <div className="pt-2 animate-fadeIn">
                <input
                  type="text"
                  value={customDestination}
                  onChange={(e) => {
                    setCustomDestination(e.target.value);
                    if (e.target.value.trim()) {
                      setTitle(`${e.target.value.trim()} Trip`);
                    }
                  }}
                  placeholder="Type any city or place (e.g. Kasol, Spiti, Pondicherry)..."
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-brand-orange text-xs font-semibold text-brand-navy dark:text-white focus:outline-none"
                  autoFocus
                  required
                />
              </div>
            )}

            {/* Quick Popular Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[10px] uppercase font-bold text-brand-navy/50 dark:text-slate-400 mr-1">
                Quick Pick:
              </span>
              {DESTINATION_OPTIONS.slice(0, 5).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChipSelect(opt)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    selectedDestOption === opt.value
                      ? 'bg-brand-orange text-white border-brand-orange shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 border-brand-sand-border dark:border-slate-700 hover:border-brand-orange'
                  }`}
                >
                  {opt.city}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Duration & Budget Row */}
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
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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

          {/* Explanation Box */}
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Clicking below will create your trip and immediately open the <strong>{currentCityName} selection catalog</strong> showing all available stays, cafes, and activities to add to your plan.
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Creating Trip...' : `Next: Browse All Places for ${currentCityName} ➔`}</span>
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
                className="text-xs font-semibold text-brand-navy/60 dark:text-slate-400 hover:text-brand-orange transition-colors cursor-pointer"
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

export default CreateTripModal;
