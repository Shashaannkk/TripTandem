import React, { useState } from 'react';
import { X, Plus, Sparkles, MapPin, Clock, Coins, Compass } from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { VENUES } from '../../data/mockData';

export const AddActivityModal = ({ isOpen, onClose, defaultDayNumber = 1 }) => {
  const { addActivity, trip } = useTrip();

  const [mode, setMode] = useState('curated'); // 'curated' | 'custom'
  const [selectedVenue, setSelectedVenue] = useState(VENUES[0]);
  const [targetDay, setTargetDay] = useState(defaultDayNumber);
  const [targetSlot, setTargetSlot] = useState('afternoon');
  const [startTime, setStartTime] = useState('02:00 PM');
  const [duration, setDuration] = useState('2h');

  // Custom activity fields
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('experience');
  const [customCost, setCustomCost] = useState('500');
  const [customLocation, setCustomLocation] = useState(trip?.destination || 'Goa');
  const [customNotes, setCustomNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'curated' && selectedVenue) {
      addActivity(Number(targetDay), targetSlot, {
        title: selectedVenue.name,
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        category: selectedVenue.type,
        image: selectedVenue.coverImage,
        costPerPerson: selectedVenue.price,
        location: selectedVenue.region || selectedVenue.destination,
        startTime,
        duration,
        notes: `Selected from curated venues. Rated ${selectedVenue.rating} ★`,
      });
    } else {
      addActivity(Number(targetDay), targetSlot, {
        title: customTitle || 'Custom Activity',
        category: customCategory,
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
        costPerPerson: Number(customCost) || 0,
        location: customLocation,
        startTime,
        duration,
        notes: customNotes,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-brand-sand-border space-y-6 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-sand-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange-light text-brand-orange">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-brand-navy">Add Itinerary Activity</h3>
              <p className="text-xs text-brand-navy/60">Enters as a draft for group consensus</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-brand-sand text-brand-navy transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Curated Vetted Venues vs Custom Activity */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-brand-sand border border-brand-sand-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('curated')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'curated' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/60'
            }`}
          >
            Pick Curated Venue
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`py-2 rounded-xl transition-all ${
              mode === 'custom' ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/60'
            }`}
          >
            Create Custom Plan
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'curated' ? (
            <div>
              <label className="block text-xs font-semibold text-brand-navy mb-1">
                Select Curated Venue
              </label>
              <select
                value={selectedVenue?.id}
                onChange={(e) => setSelectedVenue(VENUES.find(v => v.id === e.target.value))}
                className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand"
              >
                {VENUES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.destination} · ₹{v.price})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-brand-navy mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Early Morning Anjuna Flea Market"
                  className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">
                    Cost per Person (₹)
                  </label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-navy mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand"
                  >
                    <option value="experience">Experience</option>
                    <option value="restaurant">Dining / Food</option>
                    <option value="stay">Accommodation</option>
                    <option value="attraction">Attraction</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Schedule Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-navy mb-1">
                Day Number
              </label>
              <select
                value={targetDay}
                onChange={(e) => setTargetDay(e.target.value)}
                className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand"
              >
                {(trip?.days || []).map((d) => (
                  <option key={d.dayNumber} value={d.dayNumber}>
                    Day {d.dayNumber} ({d.dateFormatted})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-navy mb-1">
                Time Slot
              </label>
              <select
                value={targetSlot}
                onChange={(e) => setTargetSlot(e.target.value)}
                className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand"
              >
                <option value="morning">Morning (Daytime ☀️)</option>
                <option value="afternoon">Afternoon (Daytime ☀️)</option>
                <option value="evening">Evening (Golden Hour 🌇)</option>
                <option value="night">Night (Nightlife & Starlight 🌙)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-navy mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="11:30 AM"
                className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-navy mb-1">
                Estimated Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="2h"
                className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-brand-navy/70 hover:bg-brand-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-card transition-all active:scale-95"
            >
              Add to Itinerary as Draft
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AddActivityModal;
