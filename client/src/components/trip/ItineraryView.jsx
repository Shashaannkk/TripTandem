import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  Sunrise, 
  Sun, 
  Sunset, 
  Moon, 
  Compass, 
  Navigation,
  ArrowRight,
  Clock,
  Car
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { ActivityCard } from './ActivityCard';
import { ConflictAlertBanner } from './ConflictAlertBanner';
import { TransportTransitionCard } from './TransportTransitionCard';

export const ItineraryView = ({ onOpenAddModal }) => {
  const { trip, activeDayIndex, reorderDayItems } = useTrip();
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'day' | 'night'

  if (!trip || !trip.days || !trip.days[activeDayIndex]) return null;

  const currentDay = trip.days[activeDayIndex];
  const items = currentDay.items || [];

  // Categorize tasks into Daytime (morning, afternoon) and Nighttime (evening, night)
  const dayItems = items.filter(i => i.timeSlot === 'morning' || i.timeSlot === 'afternoon');
  const nightItems = items.filter(i => i.timeSlot === 'evening' || i.timeSlot === 'night');

  const filteredItems = filterMode === 'day' 
    ? dayItems 
    : filterMode === 'night' 
    ? nightItems 
    : items;

  const handleMove = (index, direction) => {
    const newItems = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    reorderDayItems(currentDay.dayNumber, newItems);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Day Theme Banner & Timing Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-brand-sand-border dark:border-slate-800 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
              Day {currentDay.dayNumber} · {currentDay.dateFormatted}
            </span>
            <span className="text-brand-navy/30 dark:text-slate-600">·</span>
            <span className="text-xs font-semibold text-brand-teal flex items-center gap-1">
              <span>{dayItems.length} Day Tasks</span>
              <span>·</span>
              <span>{nightItems.length} Night Tasks</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-slate-100">
            {currentDay.theme}
          </h2>
        </div>

        {/* Action Controls: Day / Night View Filter & Add Activity */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Day / Night Filter Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-brand-navy dark:text-white shadow-xs'
                  : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('day')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                filterMode === 'day'
                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                  : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-600" />
              <span>Day Tasks ({dayItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('night')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                filterMode === 'night'
                  ? 'bg-indigo-900 text-indigo-100 shadow-xs'
                  : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
              }`}
            >
              <Moon className="w-3 h-3 text-indigo-300" />
              <span>Night Tasks ({nightItems.length})</span>
            </button>
          </div>

          {/* Add Activity CTA */}
          <button
            onClick={() => onOpenAddModal && onOpenAddModal(currentDay.dayNumber)}
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-card transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Conflict Alerts if detected */}
      <ConflictAlertBanner />

      {/* 3. Empty State or Chronological Task Progression with In-Between Transit */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-brand-sand-border dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-orange-light dark:bg-orange-950/40 text-brand-orange flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-semibold text-lg text-brand-navy dark:text-slate-100">
              {filterMode === 'day' ? 'No Daytime Tasks Added Yet' : filterMode === 'night' ? 'No Night Tasks Added Yet' : `Day ${currentDay.dayNumber} is wide open`}
            </h3>
            <p className="text-xs sm:text-sm text-brand-navy/60 dark:text-slate-400 mt-1">
              Add morning, afternoon, evening or night tasks. Between sequential stops, suggested transport modes (cabs, autos, scooters, bus) will automatically appear with 1-click shared bill splitting!
            </p>
          </div>
          <button
            onClick={() => onOpenAddModal && onOpenAddModal(currentDay.dayNumber)}
            className="inline-flex items-center gap-2 bg-brand-navy dark:bg-slate-800 hover:bg-brand-navy-light text-white px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {filteredItems.map((item, idx) => {
            const nextItem = filteredItems[idx + 1];
            const isDayTask = item.timeSlot === 'morning' || item.timeSlot === 'afternoon';
            const isNightTask = item.timeSlot === 'evening' || item.timeSlot === 'night';

            return (
              <React.Fragment key={item.id}>
                
                {/* Visual Section Dividers when transitioning from Day to Night */}
                {filterMode === 'all' && idx > 0 && isNightTask && (filteredItems[idx - 1].timeSlot === 'morning' || filteredItems[idx - 1].timeSlot === 'afternoon') && (
                  <div className="pt-2 pb-1 flex items-center gap-3">
                    <div className="h-px bg-indigo-200 dark:bg-indigo-950 flex-1" />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Nighttime Schedule & Starlight Tasks (Evening & Night)</span>
                    </span>
                    <div className="h-px bg-indigo-200 dark:bg-indigo-950 flex-1" />
                  </div>
                )}

                {/* Activity Card */}
                <ActivityCard
                  item={item}
                  dayNumber={currentDay.dayNumber}
                  onMoveUp={() => handleMove(idx, -1)}
                  onMoveDown={() => handleMove(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                />

                {/* "What After Next" Suggested In-Between Transit Card between sequential items */}
                {nextItem && (
                  <TransportTransitionCard
                    fromItem={item}
                    toItem={nextItem}
                    dayNumber={currentDay.dayNumber}
                  />
                )}

              </React.Fragment>
            );
          })}

        </div>
      )}

      {/* 4. Bottom Quick Action Helpers */}
      <div className="bg-brand-sand/50 dark:bg-slate-900/60 rounded-3xl p-4 border border-brand-sand-border dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-brand-navy/70 dark:text-slate-400">
          <Car className="w-4 h-4 text-brand-orange" />
          <span>
            Need travel arrangements? Every in-between card features <strong>Cabs, Autos, Scooters & Buses</strong> with 1-click shared bill splitting.
          </span>
        </div>

        <button
          onClick={() => onOpenAddModal && onOpenAddModal(currentDay.dayNumber)}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-hover shrink-0"
        >
          <span>Add another task to Day {currentDay.dayNumber}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

export default ItineraryView;
