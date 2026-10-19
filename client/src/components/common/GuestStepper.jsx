import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Minus, Check, Sparkles } from 'lucide-react';

export const GuestStepper = ({
  value = 2,
  onChange,
  className = '',
  max = 50,
  min = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const count = Math.max(min, Math.min(max, Number(value) || 1));

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIncrement = (amount = 1) => {
    const next = Math.min(max, count + amount);
    if (onChange) onChange(next);
  };

  const handleDecrement = (amount = 1) => {
    const next = Math.max(min, count - amount);
    if (onChange) onChange(next);
  };

  const getTierLabel = (n) => {
    if (n === 1) return { label: 'Solo Explorer', badge: 'Solo' };
    if (n === 2) return { label: 'Dynamic Duo / Couple', badge: 'Duo' };
    if (n <= 5) return { label: 'Small Crew / Family', badge: 'Crew' };
    if (n <= 15) return { label: 'Travel Tribe / Friends Group', badge: 'Tribe' };
    return { label: 'Expedition / Retreat / Wedding', badge: 'Expedition' };
  };

  const tier = getTierLabel(count);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left focus:outline-none flex items-center justify-between group"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm font-semibold text-brand-navy truncate">
            {count} {count === 1 ? 'Guest' : 'Guests'}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-sand text-brand-navy/70 border border-brand-sand-border">
            {tier.badge}
          </span>
        </div>
      </button>

      {/* Floating Guest Selector Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-3 z-50 w-[300px] sm:w-[320px] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-floating border border-brand-sand-border p-4 animate-fadeIn select-none text-brand-navy">
          
          <div className="flex items-center justify-between pb-3 border-b border-brand-sand-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-orange" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                Number of Travellers
              </span>
            </div>
            <span className="text-[10px] font-semibold text-brand-teal">
              Up to 50 guests
            </span>
          </div>

          {/* Stepper Main Display */}
          <div className="py-4 flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-brand-navy tracking-tight">
                {count} {count === 1 ? 'Guest' : 'Guests'}
              </span>
              <p className="text-xs text-brand-navy/60 font-medium mt-0.5">
                {tier.label}
              </p>
            </div>

            {/* Stepper Controls: - and + */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={count <= min}
                onClick={() => handleDecrement(1)}
                className="w-9 h-9 rounded-full border border-brand-sand-border flex items-center justify-center text-brand-navy hover:bg-brand-sand active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="w-8 text-center font-bold text-base text-brand-navy">
                {count}
              </span>

              <button
                type="button"
                disabled={count >= max}
                onClick={() => handleIncrement(1)}
                className="w-9 h-9 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-subtle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Increment Shortcuts */}
          <div className="flex items-center gap-1.5 py-2.5 border-t border-b border-brand-sand-border/60">
            <span className="text-[10px] uppercase font-bold text-brand-navy/50 mr-1">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => onChange(1)}
              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange transition-colors"
            >
              1 Solo
            </button>
            <button
              type="button"
              onClick={() => onChange(2)}
              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange transition-colors"
            >
              2 Couple
            </button>
            <button
              type="button"
              onClick={() => onChange(4)}
              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-sand hover:bg-brand-orange/15 hover:text-brand-orange transition-colors"
            >
              4 Friends
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(5)}
              disabled={count + 5 > max}
              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-sand hover:bg-brand-teal/15 hover:text-brand-teal transition-colors disabled:opacity-30"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(10)}
              disabled={count + 10 > max}
              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-sand hover:bg-brand-teal/15 hover:text-brand-teal transition-colors disabled:opacity-30"
            >
              +10
            </button>
          </div>

          {/* Footer with Group Travel Split note */}
          <div className="pt-3 flex items-center justify-between text-xs">
            <span className="text-[11px] text-brand-navy/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-yellow" />
              Auto bill-split enabled
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
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
