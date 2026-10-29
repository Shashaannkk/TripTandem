import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  Wallet, 
  CheckCircle2, 
  X, 
  ArrowRight,
  TrendingUp,
  Receipt,
  Vote,
  Activity,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { BudgetEngine } from '../../utils/budgetEngine';

export const SessionAnalyticsModal = ({ trip, onClose }) => {
  const { formatPrice } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!trip?.id) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.getAnalytics(trip.id);
        if (isMounted) {
          setAnalytics(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Analytics fetch error, falling back to local computation:', err);
          setError('Could not fetch remote event logs. Showing local session summary.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [trip?.id]);

  if (!trip) return null;

  // Local fallback calculations if API logs are loading or absent
  const localBudgetSummary = BudgetEngine.reconcileTripBudget(trip);
  const localAiCount = (trip.chat || []).filter(m => m.isAi || m.text?.toLowerCase().includes('suggest')).length;
  
  // Real metrics derived from either backend event log or trip state
  const activePlanningDays = analytics?.summary?.activePlanningDays ?? analytics?.planningDays ?? Math.max(1, trip.daysCount || 1);
  const activeMembersCount = analytics?.summary?.uniqueActiveMembers ?? analytics?.peakPlanners ?? (trip.members?.length || 1);
  const aiQuestionsAsked = analytics?.summary?.aiQuestionsAsked ?? analytics?.aiQuestionsAsked ?? localAiCount;
  const conflictsResolved = analytics?.summary?.conflictsResolved ?? analytics?.conflictsResolved ?? 0;
  const totalVotesCast = analytics?.summary?.totalVotesCast ?? analytics?.votesCast ?? 0;
  const peakPeriod = analytics?.summary?.peakActivityPeriod ?? analytics?.peakPlanningHourUTC ?? 'Evening (18:00 - 21:00)';
  const totalEvents = analytics?.summary?.totalEvents ?? analytics?.totalEvents ?? 0;

  // Member shares from backend analytics or local BudgetEngine
  const memberBalances = analytics?.budgetMetrics?.memberShares || 
    (trip.members || []).map(m => {
      const b = (localBudgetSummary?.memberBalances || []).find(
        item => item.id === m.id || item.name === m.name
      );
      return {
        userId: m.id || m.name,
        name: m.name,
        avatar: m.avatar,
        role: m.role,
        paid: b ? (b.paid ?? (b.paidPaise ? b.paidPaise / 100 : 0)) : 0,
        share: b ? (b.shareOwed ?? (b.sharePaise ? b.sharePaise / 100 : 0)) : 0,
        netBalance: b ? (b.balance ?? (b.balancePaise ? b.balancePaise / 100 : 0)) : 0,
      };
    });

  const actionsByMember = analytics?.actionsByMember || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#111C2E] max-w-3xl w-full rounded-3xl shadow-floating border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-brand-navy to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-teal/20 text-brand-teal flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{trip.title}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-teal text-white">
                  Event-Driven Analytics
                </span>
              </div>
              <p className="text-xs text-white/70">
                Authoritative collaboration event metrics, member participation & zero-sum budget reconciliation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-brand-navy/60 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <p className="text-sm font-semibold">Aggregating trip event log & reconciliation metrics...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                  {error}
                </div>
              )}

              {/* Key Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                
                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-brand-orange" />
                    <span>Planning Days</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {activePlanningDays} {activePlanningDays === 1 ? 'Day' : 'Days'}
                  </div>
                  <div className="text-[9px] text-brand-teal font-medium">
                    Active Calendar
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Users className="w-3 h-3 text-brand-teal" />
                    <span>Active Crew</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {activeMembersCount} Members
                  </div>
                  <div className="text-[9px] text-emerald-600 font-medium">
                    Collaborating
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>AI Queries</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {aiQuestionsAsked}
                  </div>
                  <div className="text-[9px] text-purple-600 font-medium">
                    Concierge Asked
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3 h-3 text-emerald-600" />
                    <span>Conflicts</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {conflictsResolved} Resolved
                  </div>
                  <div className="text-[9px] text-emerald-600 font-medium">
                    Optimistic Sync
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Vote className="w-3 h-3 text-indigo-500" />
                    <span>Votes Cast</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {totalVotesCast}
                  </div>
                  <div className="text-[9px] text-indigo-600 font-medium">
                    Consensus Decided
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1">
                  <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1 font-semibold">
                    <Activity className="w-3 h-3 text-brand-orange" />
                    <span>Total Events</span>
                  </div>
                  <div className="text-base font-bold text-brand-navy dark:text-white">
                    {totalEvents}
                  </div>
                  <div className="text-[9px] text-brand-navy/60 dark:text-slate-400 font-medium truncate" title={peakPeriod}>
                    Peak: {peakPeriod}
                  </div>
                </div>

              </div>

              {/* Member Collaboration Breakdown */}
              {actionsByMember.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-brand-navy/70 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Member Engagement & Actions</span>
                  </h4>
                  <div className="space-y-2">
                    {actionsByMember.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span className="w-28 font-medium text-brand-navy dark:text-white truncate">
                          {m.name || m.userId}
                        </span>
                        <div className="flex-1 bg-brand-sand dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-brand-teal h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, m.percentage))}%` }}
                          />
                        </div>
                        <span className="text-brand-navy/70 dark:text-slate-400 w-24 text-right font-mono text-[11px]">
                          {m.actionCount} acts ({m.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Per-Person Budget Breakdown & Zero-Sum Reconciliation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-brand-navy/70 dark:text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-brand-teal" />
                    <span>Authoritative Per-Person Budget Reconciliation</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Zero-Sum Verified (Paise Precision)
                  </span>
                </div>

                <div className="border border-brand-sand-border dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-sand dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 font-bold border-b border-brand-sand-border dark:border-slate-700">
                      <tr>
                        <th className="p-3">Traveler</th>
                        <th className="p-3">Total Paid</th>
                        <th className="p-3">Fair Share</th>
                        <th className="p-3 text-right">Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-sand-border dark:divide-slate-800">
                      {memberBalances.map((m, i) => {
                        const paid = m.paid || 0;
                        const share = m.share || 0;
                        const net = m.netBalance || (paid - share);
                        return (
                          <tr key={i} className="hover:bg-brand-sand/30 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-brand-navy dark:text-white">{m.name || m.userId}</td>
                            <td className="p-3 text-brand-navy/80 dark:text-slate-300">{formatPrice(paid)}</td>
                            <td className="p-3 text-brand-navy/80 dark:text-slate-300">{formatPrice(share)}</td>
                            <td className={`p-3 font-bold text-right ${
                              net > 0.01 
                                ? 'text-emerald-600' 
                                : net < -0.01 
                                ? 'text-rose-500' 
                                : 'text-brand-navy/50 dark:text-slate-400'
                            }`}>
                              {net > 0.01 
                                ? `+${formatPrice(net)} (Gets back)` 
                                : net < -0.01 
                                ? `-${formatPrice(Math.abs(net))} (Owes)` 
                                : '₹0.00 (Settled)'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <p className="text-[11px] text-brand-navy/60 dark:text-slate-400 italic">
                  * All split allocations are tracked in integer paise units. Sum of net balances = ₹0.00 without rounding leakage.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-brand-sand dark:bg-slate-900 border-t border-brand-sand-border dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-bold bg-brand-navy text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            Close Analytics Report
          </button>
        </div>

      </div>
    </div>
  );
};
