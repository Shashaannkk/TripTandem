import React, { useState, useEffect } from 'react';
import { Swords, Clock, CheckCircle2, Trophy, Users, Sparkles, X, ChevronRight, Lock } from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';

export const ContestedSlotDuelModal = () => {
  const { activeDuelVote, castDuelVote, resolveContestedVote, setActiveDuelVote } = useTrip();
  const { currentUser, formatPrice } = useAuth();
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (!activeDuelVote || activeDuelVote.status === 'resolved') return;

    const calculateRemaining = () => {
      const remainingMs = Math.max(0, activeDuelVote.closesAt - Date.now());
      return Math.ceil(remainingMs / 1000);
    };

    setTimeLeft(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        resolveContestedVote(activeDuelVote.duelId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeDuelVote?.duelId, activeDuelVote?.closesAt, activeDuelVote?.status]);

  if (!activeDuelVote) return null;

  const {
    duelId,
    title,
    candidateItems = [],
    durationSeconds = 60,
    votes = {},
    status,
    winningItem,
    openedBy
  } = activeDuelVote;

  if (candidateItems.length < 2) return null;

  const itemA = candidateItems[0];
  const itemB = candidateItems[1];

  const userVote = currentUser?.id ? votes?.[currentUser.id]?.choiceItemId : null;
  const isResolved = status === 'resolved';

  // Group voters by item
  const votersA = Object.values(votes).filter(v => v.choiceItemId === itemA.id);
  const votersB = Object.values(votes).filter(v => v.choiceItemId === itemB.id);

  const percentLeft = Math.max(0, Math.min(100, Math.round((timeLeft / durationSeconds) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#111C2E] max-w-2xl w-full rounded-3xl shadow-floating border border-brand-orange/40 dark:border-orange-500/30 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy p-5 text-white relative">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-orange text-white">
              <Swords className="w-3.5 h-3.5" />
              <span>Contested-Slot Timed Duel</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Countdown Ticker */}
              {!isResolved ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>{timeLeft}s remaining</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </div>
              )}

              <button
                onClick={() => setActiveDuelVote(null)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
          <p className="text-xs text-white/70 mt-1">
            Two options are contesting the same time slot. Co-travelers vote in real-time; the AI Concierge locks the winner!
          </p>

          {/* Progress bar */}
          {!isResolved && (
            <div className="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-brand-orange transition-all duration-1000"
                style={{ width: `${percentLeft}%` }}
              />
            </div>
          )}
        </div>

        {/* Duel Arena: Option A vs Option B */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            
            {/* Center VS pill badge */}
            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-navy border-2 border-brand-orange text-white items-center justify-center font-black text-xs z-10 shadow-card">
              VS
            </div>

            {/* Candidate A Card */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
              isResolved && winningItem?.id === itemA.id
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30'
                : userVote === itemA.id
                ? 'bg-orange-50/50 dark:bg-orange-950/20 border-brand-orange shadow-subtle'
                : 'bg-brand-sand dark:bg-slate-800 border-brand-sand-border dark:border-slate-700'
            }`}>
              <div className="space-y-2">
                <div className="relative h-32 rounded-xl overflow-hidden bg-slate-200">
                  <img src={itemA.image} alt={itemA.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-brand-navy">
                    Option A
                  </span>
                  {isResolved && winningItem?.id === itemA.id && (
                    <span className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-card">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Winner</span>
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-brand-navy dark:text-white line-clamp-1">{itemA.title}</h4>
                <div className="flex items-center justify-between text-xs text-brand-navy/70 dark:text-slate-300">
                  <span>{itemA.category || 'Dining'}</span>
                  <span className="font-bold text-brand-teal">{formatPrice(itemA.costPerPerson || itemA.price || 0)}/person</span>
                </div>
              </div>

              {/* Voter Avatars */}
              <div className="space-y-2 pt-2 border-t border-brand-sand-border/50 dark:border-slate-700">
                <div className="flex items-center justify-between text-[11px] text-brand-navy/60 dark:text-slate-400 font-medium">
                  <span>{votersA.length} votes</span>
                  <div className="flex items-center -space-x-1.5">
                    {votersA.map((v, i) => (
                      <img key={i} src={v.userAvatar} alt={v.userName} title={v.userName} className="w-5 h-5 rounded-full border border-white" />
                    ))}
                  </div>
                </div>

                <button
                  disabled={isResolved}
                  onClick={() => castDuelVote(duelId, itemA.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    userVote === itemA.id
                      ? 'bg-brand-orange text-white shadow-card'
                      : 'bg-white dark:bg-slate-700 border border-brand-sand-border dark:border-slate-600 text-brand-navy dark:text-white hover:border-brand-orange'
                  }`}
                >
                  {userVote === itemA.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Voted Option A</span>
                    </>
                  ) : (
                    <span>Vote for Option A</span>
                  )}
                </button>
              </div>
            </div>

            {/* Candidate B Card */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
              isResolved && winningItem?.id === itemB.id
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/30'
                : userVote === itemB.id
                ? 'bg-orange-50/50 dark:bg-orange-950/20 border-brand-orange shadow-subtle'
                : 'bg-brand-sand dark:bg-slate-800 border-brand-sand-border dark:border-slate-700'
            }`}>
              <div className="space-y-2">
                <div className="relative h-32 rounded-xl overflow-hidden bg-slate-200">
                  <img src={itemB.image} alt={itemB.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-brand-navy">
                    Option B
                  </span>
                  {isResolved && winningItem?.id === itemB.id && (
                    <span className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-card">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Winner</span>
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-brand-navy dark:text-white line-clamp-1">{itemB.title}</h4>
                <div className="flex items-center justify-between text-xs text-brand-navy/70 dark:text-slate-300">
                  <span>{itemB.category || 'Activity'}</span>
                  <span className="font-bold text-brand-teal">{formatPrice(itemB.costPerPerson || itemB.price || 0)}/person</span>
                </div>
              </div>

              {/* Voter Avatars */}
              <div className="space-y-2 pt-2 border-t border-brand-sand-border/50 dark:border-slate-700">
                <div className="flex items-center justify-between text-[11px] text-brand-navy/60 dark:text-slate-400 font-medium">
                  <span>{votersB.length} votes</span>
                  <div className="flex items-center -space-x-1.5">
                    {votersB.map((v, i) => (
                      <img key={i} src={v.userAvatar} alt={v.userName} title={v.userName} className="w-5 h-5 rounded-full border border-white" />
                    ))}
                  </div>
                </div>

                <button
                  disabled={isResolved}
                  onClick={() => castDuelVote(duelId, itemB.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    userVote === itemB.id
                      ? 'bg-brand-orange text-white shadow-card'
                      : 'bg-white dark:bg-slate-700 border border-brand-sand-border dark:border-slate-600 text-brand-navy dark:text-white hover:border-brand-orange'
                  }`}
                >
                  {userVote === itemB.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Voted Option B</span>
                    </>
                  ) : (
                    <span>Vote for Option B</span>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* AI Resolution Banner */}
          {isResolved ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-sm">Duel Concluded: "{winningItem?.title}" Locked!</div>
                <div className="opacity-90 mt-0.5">
                  The AI Concierge has tallied the votes and locked this option to the itinerary slot.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-brand-navy/60 dark:text-slate-400">
                Opened by {openedBy?.name || 'Trip Leader'}
              </span>
              <button
                onClick={() => resolveContestedVote(duelId)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-brand-navy text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Resolve & Finalize Now
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
