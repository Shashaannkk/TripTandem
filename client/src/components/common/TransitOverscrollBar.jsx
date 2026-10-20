import React, { useState, useEffect, useRef } from 'react';
import { Plane, Train, Bus, Car, X, Sparkles } from 'lucide-react';

/**
 * TransitOverscrollBar
 * Shows an animated transit fleet (train, bus, plane, taxi, and drifting clouds)
 * whenever the user pushes/pulls the page beyond its top limit (overscroll/pull-down),
 * or clicks the whimsical pull-pill.
 */
export const TransitOverscrollBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [pullHeight, setPullHeight] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const timeoutRef = useRef(null);
  const touchStartY = useRef(0);
  const accumulatedDelta = useRef(0);

  const triggerReveal = (duration = 6000) => {
    setIsVisible(true);
    setPullHeight(88);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setPullHeight(0);
    }, duration);
  };

  useEffect(() => {
    // 1. Wheel Overscroll Detection (Desktop trackpad/mousewheel up when already at top)
    const handleWheel = (e) => {
      if (window.scrollY <= 2 && e.deltaY < -15) {
        accumulatedDelta.current += Math.abs(e.deltaY);
        if (accumulatedDelta.current > 40) {
          triggerReveal(6500);
          accumulatedDelta.current = 0;
        }
      } else if (e.deltaY > 15) {
        // User scrolling down, collapse bar
        accumulatedDelta.current = 0;
        if (isVisible) {
          setIsVisible(false);
          setPullHeight(0);
        }
      }
    };

    // 2. Touch Overscroll Detection (Mobile/Tablet pull-to-refresh action)
    const handleTouchStart = (e) => {
      if (window.scrollY <= 2) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (window.scrollY <= 2 && touchStartY.current > 0) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartY.current;
        if (diff > 15) {
          setIsPulling(true);
          const calculatedHeight = Math.min(96, Math.max(0, diff * 0.45));
          setPullHeight(calculatedHeight);
          if (calculatedHeight > 45) {
            setIsVisible(true);
          }
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartY.current = 0;
      setIsPulling(false);
      if (pullHeight > 45 || isVisible) {
        triggerReveal(6000);
      } else {
        setPullHeight(0);
        setIsVisible(false);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible, pullHeight]);

  const activeHeight = isPulling ? pullHeight : (isVisible ? 88 : 0);

  return (
    <div className="w-full relative z-50 overflow-hidden select-none">
      {/* Animated Transit Sky & Fleet Track Container */}
      <div
        style={{ height: `${activeHeight}px` }}
        className="w-full transition-all duration-300 ease-out bg-gradient-to-r from-sky-200 via-amber-100 to-emerald-200 dark:from-slate-900 dark:via-[#111C2E] dark:to-emerald-950 border-b border-sky-300/60 dark:border-slate-800 relative shadow-inner overflow-hidden"
      >
        {/* Scenic Background Clouds */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <span className="absolute top-2 text-2xl animate-[floatCloud_25s_linear_infinite]" style={{ left: '-50px' }}>
            ☁️
          </span>
          <span className="absolute top-4 text-xl animate-[floatCloud_32s_linear_infinite_8s]" style={{ left: '-50px' }}>
            ☁️
          </span>
          <span className="absolute top-1 text-base opacity-75 animate-[floatCloud_20s_linear_infinite_14s]" style={{ left: '-50px' }}>
            ☁️
          </span>
        </div>

        {/* Lane 1: Upper Sky - Commercial Airplane with Contrail */}
        <div className="absolute top-1.5 left-0 right-0 h-6 pointer-events-none">
          <div className="flex items-center gap-1.5 animate-[planeFly_11s_linear_infinite]">
            <span className="text-lg filter drop-shadow">✈️</span>
            <span className="h-0.5 w-24 bg-gradient-to-r from-white/90 to-transparent border-t border-dashed border-sky-400/80" />
          </div>
        </div>

        {/* Central Fleet Status Pill */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md border border-brand-orange/30 text-[10px] font-bold text-brand-navy dark:text-slate-200 flex items-center gap-1.5 shadow-xs z-10 pointer-events-none">
          <Sparkles className="w-3 h-3 text-brand-orange animate-spin" />
          <span>TripTandem Transit Fleet · Ready for Departure!</span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setPullHeight(0);
          }}
          className="absolute top-1.5 right-3 p-1 rounded-full bg-black/10 hover:bg-black/25 dark:bg-white/10 dark:hover:bg-white/20 text-brand-navy dark:text-white transition-colors cursor-pointer z-20"
          title="Close transit fleet"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Lane 2: Middle Railway Track & High-Speed Train */}
        <div className="absolute top-9 left-0 right-0 h-5">
          {/* Railroad Rails & Ties */}
          <div className="absolute inset-x-0 top-3.5 h-0.5 bg-slate-400 dark:bg-slate-600 border-t border-slate-500" />
          <div className="absolute inset-x-0 top-4 h-0.5 bg-slate-400 dark:bg-slate-600" />
          
          {/* Bullet / Express Train with Cars */}
          <div className="absolute top-0 flex items-center gap-0.5 animate-[trainZoom_7.5s_linear_infinite]">
            <span className="text-xl filter drop-shadow">🚅</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono font-bold tracking-tighter shadow-xs">
              Vande Bharat · 160 km/h
            </span>
            <span className="text-base">🚃</span>
            <span className="text-base">🚃</span>
          </div>
        </div>

        {/* Lane 3: Lower Highway Road - Highway Bus & City Taxi */}
        <div className="absolute bottom-1 left-0 right-0 h-6">
          {/* Asphalt Road with Dashed Center Mark */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-700/80 dark:bg-slate-800 border-t border-slate-600 flex items-center">
            <div className="w-full border-b border-dashed border-amber-300/70" />
          </div>

          {/* Express Coach Bus */}
          <div className="absolute bottom-0.5 flex items-center gap-1 animate-[busCruiser_12s_linear_infinite]">
            <span className="text-xl filter drop-shadow">🚌</span>
            <span className="text-[9px] font-bold text-white bg-emerald-600 px-1 py-0.2 rounded shadow-xs">
              KSRTC Airavat
            </span>
          </div>

          {/* City Yellow Taxi */}
          <div className="absolute bottom-0.5 flex items-center gap-1 animate-[taxiSpeed_9s_linear_infinite_2.5s]">
            <span className="text-lg filter drop-shadow">🚕</span>
            <span className="text-[9px] font-bold text-slate-900 bg-amber-400 px-1 py-0.2 rounded shadow-xs">
              TAXI
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Micro Pull-Pill Tab */}
      <div className="flex justify-center -mt-0.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => (isVisible ? (setIsVisible(false), setPullHeight(0)) : triggerReveal(7000))}
          className="group px-3 py-0.5 rounded-b-xl bg-brand-sand-light dark:bg-slate-800 border-x border-b border-brand-sand-border dark:border-slate-700 text-[10px] font-semibold text-brand-navy/60 dark:text-slate-400 hover:text-brand-orange hover:bg-white dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          title="Pull or click to launch live transit animation fleet"
        >
          <span className="text-xs transition-transform group-hover:scale-125">
            {isVisible ? '▲ Hide Transit Fleet' : '🚆 ✈️ 🚌 🚕 Transit Radar'}
          </span>
        </button>
      </div>

      {/* Inline Keyframes for smooth animations */}
      <style>{`
        @keyframes floatCloud {
          0% { transform: translateX(-60px); }
          100% { transform: translateX(calc(100vw + 80px)); }
        }
        @keyframes planeFly {
          0% { transform: translateX(-120px); }
          100% { transform: translateX(calc(100vw + 120px)); }
        }
        @keyframes trainZoom {
          0% { transform: translateX(-240px); }
          100% { transform: translateX(calc(100vw + 240px)); }
        }
        @keyframes busCruiser {
          0% { transform: translateX(-180px); }
          100% { transform: translateX(calc(100vw + 180px)); }
        }
        @keyframes taxiSpeed {
          0% { transform: translateX(-150px); }
          100% { transform: translateX(calc(100vw + 150px)); }
        }
      `}</style>
    </div>
  );
};

export default TransitOverscrollBar;
