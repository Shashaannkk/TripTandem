import React, { useState, useRef, useEffect } from 'react';
import { Users, Bed, Plus, Minus, Check, Sparkles } from 'lucide-react';

export const GuestRoomSelector = ({
  guests = 2,
  rooms = 1,
  onChange,
  className = '',
  maxGuests = 50,
  minGuests = 1,
  maxRooms = 10,
  minRooms = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const guestCount = Math.max(minGuests, Math.min(maxGuests, Number(guests) || 1));
  const roomCount = Math.max(minRooms, Math.min(maxRooms, Number(rooms) || 1));

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

  const handleGuestsChange = (newGuests) => {
    const next = Math.max(minGuests, Math.min(maxGuests, newGuests));
    onChange?.({ guests: next, rooms: roomCount });
  };

  const handleRoomsChange = (newRooms) => {
    const next = Math.max(minRooms, Math.min(maxRooms, newRooms));
    onChange?.({ guests: guestCount, rooms: next });
  };

  const getTierLabel = (n) => {
    if (n === 1) return { label: 'Solo Explorer', badge: 'Solo' };
    if (n === 2) return { label: 'Dynamic Duo', badge: 'Couple' };
    if (n <= 5) return { label: 'Small Crew / Family', badge: 'Crew' };
    if (n <= 15) return { label: 'Travel Tribe / Group', badge: 'Tribe' };
    return { label: 'Expedition / Retreat', badge: 'Expedition' };
  };

  const tier = getTierLabel(guestCount);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      
      {/* Trigger Slot */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-3 py-1.5 rounded-xl transition-all focus:outline-none flex items-center justify-between ${
          isOpen
            ? 'bg-brand-sand border border-brand-yellow/40 ring-1 ring-brand-yellow/20'
            : 'hover:bg-brand-sand/60'
        }`}
      >
        <div className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-navy/60 leading-none">
            Travellers & Rooms
          </span>
          <div className="flex items-center gap-1.5 mt-1 truncate">
            <span className="text-xs font-bold text-brand-navy truncate">
              {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'} · {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
            </span>
            <span className="hidden sm:inline text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-brand-sand-border/70 text-brand-navy/70">
              {tier.badge}
            </span>
          </div>
        </div>
      </button>

      {/* Floating Selector Popover (Positioned on the Upper Side) */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 bottom-full mb-3 z-50 w-[295px] sm:w-[340px] max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-2xl rounded-3xl shadow-floating border border-brand-sand-border p-3 sm:p-4 animate-fadeIn select-none text-brand-navy">
          
          <div className="flex items-center justify-between pb-3 border-b border-brand-sand-border">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-navy">
              Guests & Rooms Selection
            </span>
            <span className="text-[10px] font-semibold text-brand-teal">
              Up to 50 guests
            </span>
          </div>

          {/* 1. Guests Stepper */}
          <div className="py-3 border-b border-brand-sand-border/60">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-brand-navy">Guests</span>
                <p className="text-[11px] text-brand-navy/60 mt-0.5">{tier.label}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={guestCount <= minGuests}
                  onClick={() => handleGuestsChange(guestCount - 1)}
                  className="w-8 h-8 rounded-full border border-brand-sand-border flex items-center justify-center text-brand-navy hover:bg-brand-sand active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  min={minGuests}
                  max={maxGuests}
                  value={guestCount}
                  onChange={(e) => handleGuestsChange(Number(e.target.value) || minGuests)}
                  className="w-10 text-center font-bold text-sm text-brand-navy bg-brand-sand/50 rounded-lg py-0.5 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
                />

                <button
                  type="button"
                  disabled={guestCount >= maxGuests}
                  onClick={() => handleGuestsChange(guestCount + 1)}
                  className="w-8 h-8 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-subtle"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Add Increments (+1, +2, +4, +5, +10) */}
            <div className="pt-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-brand-navy/60 uppercase shrink-0">Add More:</span>
                {[
                  { label: '+1', add: 1 },
                  { label: '+2', add: 2 },
                  { label: '+4', add: 4 },
                  { label: '+5', add: 5 },
                  { label: '+10', add: 10 },
                ].map(({ label, add }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleGuestsChange(guestCount + add)}
                    disabled={guestCount + add > maxGuests}
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white transition-all disabled:opacity-30 cursor-pointer shadow-subtle active:scale-95"
                    title={`Add ${add} guests`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Set Exact Presets (Solo, Couple, Family, Group) */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-brand-navy/40 uppercase shrink-0">Preset:</span>
                {[
                  { label: 'Solo (1)', val: 1 },
                  { label: 'Pair (2)', val: 2 },
                  { label: 'Crew (4)', val: 4 },
                  { label: 'Tribe (6)', val: 6 },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleGuestsChange(val)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                      guestCount === val
                        ? 'bg-brand-navy text-white font-bold'
                        : 'bg-brand-sand hover:bg-brand-sand-border text-brand-navy/70'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Rooms Stepper */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-brand-navy">Rooms</span>
              <p className="text-[11px] text-brand-navy/60 mt-0.5">Up to 10 rooms</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={roomCount <= minRooms}
                onClick={() => handleRoomsChange(roomCount - 1)}
                className="w-8 h-8 rounded-full border border-brand-sand-border flex items-center justify-center text-brand-navy hover:bg-brand-sand active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="w-8 text-center font-bold text-sm text-brand-navy">
                {roomCount}
              </span>

              <button
                type="button"
                disabled={roomCount >= maxRooms}
                onClick={() => handleRoomsChange(roomCount + 1)}
                className="w-8 h-8 rounded-full bg-brand-teal hover:bg-brand-teal/90 text-white flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-subtle"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-brand-sand-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-brand-teal font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-yellow" />
              Auto bill-split ready
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-navy hover:bg-brand-navy-light text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
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

export default GuestRoomSelector;
