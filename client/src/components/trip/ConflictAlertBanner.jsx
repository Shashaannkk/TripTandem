import React from 'react';
import { AlertTriangle, Clock, MapPin, Wallet, ArrowRight, CheckCircle2, Swords } from 'lucide-react';
import { useTrip } from '../../context/TripContext';

export const ConflictAlertBanner = () => {
  const { conflicts, openContestedVote, trip, activeDayIndex } = useTrip();

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {conflicts.map((conflict) => {
        const isOverlap = conflict.type === 'time_overlap';
        const isTravel = conflict.type === 'travel_gap';
        const isBudget = conflict.type === 'budget_overrun';

        const dayItems = trip?.days?.[activeDayIndex]?.items || [];
        const candidateItems = conflict.duelCandidateItems || (dayItems.length >= 2 ? [dayItems[0], dayItems[1]] : null);

        return (
          <div
            key={conflict.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle ${
              isBudget
                ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                : isTravel
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-orange-50/90 border-orange-200 text-orange-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  isBudget
                    ? 'bg-rose-100 text-rose-700'
                    : isTravel
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {isBudget ? (
                  <Wallet className="w-5 h-5" />
                ) : isTravel ? (
                  <MapPin className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {conflict.title}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/70 border border-current">
                    Action Recommended
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {conflict.description}
                </p>
                <p className="text-xs font-semibold pt-0.5 opacity-95">
                  💡 Suggestion: {conflict.suggestion}
                </p>
              </div>
            </div>

            {/* Actions: Duel Vote (PRD 6.2) & Auto-Resolve */}
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 sm:self-center pl-10 sm:pl-0">
              {isOverlap && candidateItems && candidateItems.length >= 2 && (
                <button
                  type="button"
                  onClick={() => openContestedVote({
                    title: `Contested Slot: ${candidateItems[0]?.title} vs ${candidateItems[1]?.title}`,
                    dayNumber: trip.days[activeDayIndex]?.dayNumber || 1,
                    candidateItems,
                    durationSeconds: 60,
                  })}
                  className="px-3.5 py-2 rounded-full text-xs font-bold bg-brand-navy hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Timed Duel Vote</span>
                </button>
              )}

              <button
                onClick={() => conflict.resolve && conflict.resolve()}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isBudget
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : isTravel
                    ? 'bg-amber-800 hover:bg-amber-900 text-white'
                    : 'bg-brand-orange hover:bg-brand-orange-hover text-white'
                }`}
              >
                <span>{conflict.actionLabel || 'Auto Resolve'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConflictAlertBanner;
