import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check, ArrowRight } from 'lucide-react';
import {
  getTodayString,
  getMaxBookingDateString,
  parseDateString,
  formatToDateString,
  formatDisplayDate,
  getDaysDifference,
  addDays,
  MAX_ADVANCE_BOOKING_DAYS,
} from '../../utils/dateUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ThemedDatePicker = ({
  checkIn = '',
  checkOut = '',
  onChange,
  className = '',
  variant = 'connected', // 'connected' (dual slots in one control) or 'split'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeField, setActiveField] = useState('checkIn'); // 'checkIn' | 'checkOut'
  const [hoverDateStr, setHoverDateStr] = useState(null);
  const containerRef = useRef(null);

  const todayStr = useMemo(() => getTodayString(), []);
  const maxDateStr = useMemo(() => getMaxBookingDateString(MAX_ADVANCE_BOOKING_DAYS), []);

  // Initialize view month to checkIn date or today
  const [viewYear, setViewYear] = useState(() => {
    const d = parseDateString(checkIn) || new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDateString(checkIn) || new Date();
    return d.getMonth();
  });

  // Sync view when checkIn changes externally
  useEffect(() => {
    if (checkIn) {
      const d = parseDateString(checkIn);
      if (d) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [checkIn]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation limits
  const canGoPrev = useMemo(() => {
    const today = parseDateString(todayStr);
    const view = new Date(viewYear, viewMonth, 1);
    return view > new Date(today.getFullYear(), today.getMonth(), 1);
  }, [viewYear, viewMonth, todayStr]);

  const canGoNext = useMemo(() => {
    const max = parseDateString(maxDateStr);
    const view = new Date(viewYear, viewMonth, 1);
    return view < new Date(max.getFullYear(), max.getMonth(), 1);
  }, [viewYear, viewMonth, maxDateStr]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar days grid
  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(viewYear, viewMonth, day);
      const dateStr = formatToDateString(dateObj);

      const isPast = dateStr < todayStr;
      const isBeyondMax = dateStr > maxDateStr;
      const isDisabled = isPast || isBeyondMax;
      const isToday = dateStr === todayStr;

      const isCheckIn = dateStr === checkIn;
      const isCheckOut = dateStr === checkOut;

      let isInRange = false;
      if (checkIn && checkOut && dateStr > checkIn && dateStr < checkOut) {
        isInRange = true;
      }
      if (checkIn && !checkOut && hoverDateStr && dateStr > checkIn && dateStr <= hoverDateStr) {
        isInRange = true;
      }

      days.push({
        key: dateStr,
        dayNum: day,
        dateStr,
        isDisabled,
        isPast,
        isBeyondMax,
        isToday,
        isCheckIn,
        isCheckOut,
        isInRange,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, maxDateStr, checkIn, checkOut, hoverDateStr]);

  // Click on date cell
  const handleDateClick = (dateStr) => {
    if (dateStr < todayStr || dateStr > maxDateStr) return;

    if (activeField === 'checkIn') {
      // User is picking Check-In
      let newCheckOut = checkOut;

      // If existing checkOut is <= new checkIn, automatically set checkOut to checkIn + 1 day
      if (!checkOut || checkOut <= dateStr) {
        newCheckOut = addDays(dateStr, 1);
      }

      onChange?.({ checkIn: dateStr, checkOut: newCheckOut });
      // Move focus smoothly to check-out selection
      setActiveField('checkOut');
    } else {
      // User is picking Check-Out
      if (dateStr <= checkIn) {
        // If user picked a date earlier than or equal to checkIn, treat it as new checkIn
        const nextDay = addDays(dateStr, 1);
        onChange?.({ checkIn: dateStr, checkOut: nextDay });
        setActiveField('checkOut');
      } else {
        // Complete the range
        onChange?.({ checkIn, checkOut: dateStr });
        setIsOpen(false);
      }
    }
  };

  // Quick preset shortcuts
  const applyPreset = (daysCount) => {
    const start = checkIn && checkIn >= todayStr ? checkIn : todayStr;
    const end = addDays(start, daysCount);
    onChange?.({ checkIn: start, checkOut: end });
    setIsOpen(false);
  };

  const nightsCount = checkIn && checkOut ? getDaysDifference(checkIn, checkOut) : 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      
      {/* Trigger: Side-by-Side Unified Check-in and Check-out slots */}
      <div className="flex items-center gap-1 sm:gap-2">
        
        {/* Check-In Button Slot */}
        <button
          type="button"
          onClick={() => {
            setActiveField('checkIn');
            setIsOpen(true);
          }}
          className={`flex-1 min-w-[95px] text-left px-2.5 sm:px-3 py-1.5 rounded-xl transition-all focus:outline-none shrink-0 ${
            isOpen && activeField === 'checkIn'
              ? 'bg-brand-sand border border-brand-orange/40 ring-1 ring-brand-orange/20'
              : 'hover:bg-brand-sand/60'
          }`}
        >
          <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-navy/60 leading-none whitespace-nowrap">
            Check-In
          </span>
          <span className={`block text-xs font-bold truncate mt-1 whitespace-nowrap ${checkIn ? 'text-brand-navy' : 'text-brand-navy/40'}`}>
            {checkIn ? formatDisplayDate(checkIn) : 'Add date'}
          </span>
        </button>

        <span className="text-brand-sand-border font-light text-sm select-none shrink-0">|</span>

        {/* Check-Out Button Slot */}
        <button
          type="button"
          onClick={() => {
            setActiveField('checkOut');
            setIsOpen(true);
          }}
          className={`flex-1 min-w-[95px] text-left px-2.5 sm:px-3 py-1.5 rounded-xl transition-all focus:outline-none shrink-0 ${
            isOpen && activeField === 'checkOut'
              ? 'bg-brand-sand border border-brand-teal/40 ring-1 ring-brand-teal/20'
              : 'hover:bg-brand-sand/60'
          }`}
        >
          <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-navy/60 leading-none whitespace-nowrap">
            Check-Out
          </span>
          <span className={`block text-xs font-bold truncate mt-1 whitespace-nowrap ${checkOut ? 'text-brand-navy' : 'text-brand-navy/40'}`}>
            {checkOut ? formatDisplayDate(checkOut) : 'Add date'}
          </span>
        </button>

        {/* Clear Button if both selected */}
        {checkIn && checkOut && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.({ checkIn: '', checkOut: '' });
            }}
            className="p-1 rounded-full text-brand-navy/30 hover:text-brand-navy hover:bg-brand-sand transition-colors shrink-0"
            title="Clear dates"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

      </div>

      {/* Floating Themed Calendar Popover (Positioned on the Upper Side) */}
      {isOpen && (
        <div className="absolute left-0 sm:-left-8 bottom-full mb-3 z-50 w-[320px] sm:w-[350px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-floating border border-brand-sand-border p-4 animate-fadeIn select-none text-brand-navy">
          
          {/* Active Field Mode Switcher Header */}
          <div className="flex items-center justify-between pb-3 border-b border-brand-sand-border">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-brand-sand border border-brand-sand-border text-xs">
              <button
                type="button"
                onClick={() => setActiveField('checkIn')}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  activeField === 'checkIn'
                    ? 'bg-brand-orange text-white shadow-subtle'
                    : 'text-brand-navy/70 hover:text-brand-navy'
                }`}
              >
                1. Check-In
              </button>
              <button
                type="button"
                onClick={() => setActiveField('checkOut')}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  activeField === 'checkOut'
                    ? 'bg-brand-teal text-white shadow-subtle'
                    : 'text-brand-navy/70 hover:text-brand-navy'
                }`}
              >
                2. Check-Out
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-brand-sand text-brand-navy/50 hover:text-brand-navy transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between py-2.5">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-brand-sand text-brand-navy disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-brand-navy">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-brand-sand text-brand-navy disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 pb-2.5 border-b border-brand-sand-border/60 overflow-x-auto text-[11px] font-semibold no-scrollbar">
            <button
              type="button"
              onClick={() => applyPreset(2)}
              className="px-2.5 py-1 rounded-full bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange text-brand-navy/70 whitespace-nowrap transition-colors"
            >
              2 Nights
            </button>
            <button
              type="button"
              onClick={() => applyPreset(4)}
              className="px-2.5 py-1 rounded-full bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange text-brand-navy/70 whitespace-nowrap transition-colors"
            >
              4 Nights
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1 rounded-full bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange text-brand-navy/70 whitespace-nowrap transition-colors"
            >
              7 Nights (1 Week)
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-brand-navy/40 uppercase tracking-wider">
            {DAYS_SHORT.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item) => {
              if (item.empty) {
                return <div key={item.key} className="h-8" />;
              }

              const isStart = item.isCheckIn;
              const isEnd = item.isCheckOut;
              const isHighlight = isStart || isEnd;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => handleDateClick(item.dateStr)}
                  onMouseEnter={() => activeField === 'checkOut' && setHoverDateStr(item.dateStr)}
                  className={`h-8 text-xs font-semibold flex items-center justify-center transition-all relative ${
                    item.isDisabled
                      ? 'text-brand-navy/20 cursor-not-allowed'
                      : isStart
                      ? 'bg-brand-orange text-white rounded-l-full font-bold shadow-subtle z-10'
                      : isEnd
                      ? 'bg-brand-teal text-white rounded-r-full font-bold shadow-subtle z-10'
                      : item.isInRange
                      ? 'bg-brand-orange/15 text-brand-orange'
                      : item.isToday
                      ? 'border border-brand-teal/80 text-brand-teal hover:bg-brand-sand rounded-full font-bold'
                      : 'hover:bg-brand-sand text-brand-navy rounded-full'
                  }`}
                  title={
                    item.isBeyondMax
                      ? `Reservations limited to ${MAX_ADVANCE_BOOKING_DAYS} days in advance`
                      : item.isPast
                      ? 'Past dates cannot be selected'
                      : item.dateStr
                  }
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Summary & Confirmation */}
          <div className="mt-3 pt-3 border-t border-brand-sand-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-brand-navy/70">
                {checkIn && checkOut
                  ? `${nightsCount} ${nightsCount === 1 ? 'night' : 'nights'} stay`
                  : activeField === 'checkIn'
                  ? 'Select Check-in'
                  : 'Select Check-out'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
