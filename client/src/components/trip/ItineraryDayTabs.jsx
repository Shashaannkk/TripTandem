import React from 'react';
import { Sun, CloudSun, Plus, Calendar, Sparkles } from 'lucide-react';
import { useTrip } from '../../context/TripContext';

export const ItineraryDayTabs = () => {
  const { trip, activeDayIndex, setActiveDayIndex, setTrip } = useTrip();

  if (!trip || !trip.days) return null;

  const handleAddDay = () => {
    const nextDayNum = trip.days.length + 1;
    const newDay = {
      dayNumber: nextDayNum,
      dateFormatted: `Day ${nextDayNum}`,
      theme: 'Spontaneous Exploration & Rhythm',
      weather: { temp: 29, condition: 'Sunny & Warm', icon: 'Sun' },
      items: [],
    };

    setTrip(prev => ({
      ...prev,
      daysCount: prev.daysCount + 1,
      days: [...prev.days, newDay],
    }));

    setActiveDayIndex(trip.days.length);
  };

  return (
    <div className="border-b border-brand-sand-border bg-white sticky top-20 z-20 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-3">
          
          {trip.days.map((day, idx) => {
            const isActive = activeDayIndex === idx;
            const itemsCount = day.items?.length || 0;
            const lockedCount = day.items?.filter(i => i.status === 'locked').length || 0;

            return (
              <button
                key={day.dayNumber}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all flex-shrink-0 text-left border ${
                  isActive
                    ? 'bg-brand-sand border-brand-orange shadow-sm text-brand-navy'
                    : 'bg-white hover:bg-brand-sand/50 border-brand-sand-border text-brand-navy/70'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      Day {day.dayNumber}
                    </span>
                    <span className="text-[11px] text-brand-navy/60 font-medium">
                      ({day.dateFormatted})
                    </span>
                  </div>
                  <div className="text-[11px] text-brand-teal font-medium mt-0.5 flex items-center gap-1.5">
                    <span>{itemsCount} activities</span>
                    {lockedCount > 0 && (
                      <span className="text-[10px] bg-brand-teal-light text-brand-teal px-1.5 py-0.2 rounded-full font-bold">
                        {lockedCount} locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Weather Pill */}
                {day.weather && (
                  <div className="pl-2 border-l border-brand-sand-border flex items-center gap-1 text-xs text-brand-navy/60">
                    <Sun className="w-3.5 h-3.5 text-brand-yellow fill-brand-yellow" />
                    <span>{day.weather.temp}°C</span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Add Day Button */}
          <button
            onClick={handleAddDay}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-brand-sand-border hover:border-brand-teal text-xs font-semibold text-brand-navy hover:text-brand-teal transition-all flex-shrink-0 bg-brand-sand/40"
          >
            <Plus className="w-4 h-4 text-brand-teal" />
            <span>Add Day</span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default ItineraryDayTabs;
