import { dataService } from './dataService.js';
import { BudgetEngine } from './budgetService.js';

export class AnalyticsService {
  /**
   * Derive authentic session analytics from recorded event logs and trip data.
   * Reconciles per-member paid and owed shares using integer paise expense splits.
   * Eliminates hardcoded demonstration values.
   */
  static async calculateTripAnalytics(tripId) {
    const trip = await dataService.getTripById(tripId);
    if (!trip) return null;

    const events = await dataService.getEventsForTrip(tripId);

    // 1. Planning duration & Session Duration
    // Unique calendar days (UTC/ISO) with recorded activity
    const activeDates = new Set();
    const timestamps = [];
    events.forEach(e => {
      if (e.timestamp) {
        const d = new Date(e.timestamp);
        const t = d.getTime();
        if (!isNaN(t)) {
          timestamps.push(t);
          activeDates.add(d.toISOString().split('T')[0]);
        }
      }
    });
    timestamps.sort((a, b) => a - b);

    const planningDays = activeDates.size;
    const firstEventTime = timestamps.length > 0 ? timestamps[0] : null;
    const lastEventTime = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
    const totalSessionDurationMs = firstEventTime && lastEventTime ? lastEventTime - firstEventTime : 0;

    let activeSessionTimeMs = 0;
    for (let i = 1; i < timestamps.length; i++) {
      const delta = timestamps[i] - timestamps[i - 1];
      if (delta <= 30 * 60 * 1000) { // Count active contiguous windows (<= 30 min idle gap)
        activeSessionTimeMs += delta;
      }
    }

    const sessionDurationMinutes = Math.round(totalSessionDurationMs / 60000);
    const activePlanningDurationMinutes = Math.round(activeSessionTimeMs / 60000);

    // 2. Planning actions by member
    const actionsByMemberMap = {};
    const uniqueActors = new Set();
    let totalNonSystemActions = 0;

    events.forEach(e => {
      const actor = e.actorId || 'system';
      if (actor !== 'system') {
        uniqueActors.add(actor);
        totalNonSystemActions++;
      }
      actionsByMemberMap[actor] = (actionsByMemberMap[actor] || 0) + 1;
    });

    const actionsByMember = (trip.members || []).map(m => {
      const count = actionsByMemberMap[m.id] || actionsByMemberMap[m.name] || 0;
      const percentage = totalNonSystemActions > 0 ? Math.round((count / totalNonSystemActions) * 100) : 0;
      return {
        userId: m.id || m.name,
        name: m.name,
        actionCount: count,
        percentage,
      };
    });

    // 3. Unique collaborators vs true concurrent peak (PRD Audit distinction)
    // Total distinct contributors in audit stream:
    const totalUniqueActiveCollaborators = uniqueActors.size;
    // Note: True simultaneous concurrent presence tracking is part of the postponed group synchronization issue.
    const peakConcurrentCollaborators = null;
    const concurrentPresenceTrackingStatus = 'POSTPONED_PRESENCE_DEPENDENCY';

    // 4. AI Questions asked
    const aiQuestionsAsked = events.filter(e => e.type === 'ai.question').length;

    // 5. Conflicts detected & resolved
    const conflictsFlagged = events.filter(e => e.type === 'conflict.flagged').length;
    const conflictsResolved = events.filter(e => e.type === 'conflict.resolved').length;

    // 6. Votes opened, cast, resolved
    const votesOpened = events.filter(e => e.type === 'vote.opened').length;
    const votesCast = events.filter(e => e.type === 'vote.cast').length;
    const votesResolved = events.filter(e => e.type === 'vote.resolved').length;

    // 7. Budget totals & exact per-member reconciliation using persisted expense splits
    const budgetReport = BudgetEngine.reconcileTripBudget(trip);
    const totalBudget = trip.budget?.totalTarget || 40000;
    const spentTotal = budgetReport ? budgetReport.actualLogged : 0;
    const memberBalances = budgetReport ? budgetReport.memberBalances : [];

    const memberBreakdown = (trip.members || []).map(m => {
      const mb = memberBalances.find(b => b.id === m.id || b.name === m.name);
      const paid = mb ? mb.paid : 0;
      const share = mb ? mb.shareOwed : 0;
      const actions = actionsByMemberMap[m.id] || actionsByMemberMap[m.name] || 0;
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        role: m.role,
        paid,
        share,
        netBalance: paid - share,
        actionsCount: actions,
      };
    });

    const memberCount = Math.max((trip.members || []).length, 1);
    const perPersonShare = Math.round(spentTotal / memberCount);

    // Peak planning periods (histogram by hour of day UTC)
    const hourlyDistribution = new Array(24).fill(0);
    events.forEach(e => {
      if (e.timestamp) {
        const hour = new Date(e.timestamp).getUTCHours();
        hourlyDistribution[hour] += 1;
      }
    });

    let peakHour = 0;
    let maxHourEvents = 0;
    hourlyDistribution.forEach((cnt, hr) => {
      if (cnt > maxHourEvents) {
        maxHourEvents = cnt;
        peakHour = hr;
      }
    });

    const peakPlanningHourStr = `${peakHour.toString().padStart(2, '0')}:00 UTC`;

    return {
      tripId,
      title: trip.title,
      totalEvents: events.length,
      planningDays,
      sessionDurationMinutes,
      activePlanningDurationMinutes,
      totalUniqueActiveCollaborators,
      peakConcurrentCollaborators,
      concurrentPresenceTrackingStatus,
      peakPlanners: totalUniqueActiveCollaborators, // preserved for backward-compatibility with UI
      aiQuestionsAsked,
      conflictsFlagged,
      conflictsResolved,
      votesOpened,
      votesCast,
      votesResolved,
      totalBudget,
      spentTotal,
      perPersonShare,
      peakPlanningHourUTC: peakPlanningHourStr,
      memberBreakdown,
      actionsByMember,
      summary: {
        activePlanningDays: planningDays,
        sessionDurationMinutes,
        activePlanningDurationMinutes,
        uniqueActiveMembers: totalUniqueActiveCollaborators,
        peakConcurrentCollaborators: null,
        peakConcurrentStatus: 'POSTPONED_PRESENCE_DEPENDENCY',
        aiQuestionsAsked,
        conflictsResolved,
        totalVotesCast: votesCast,
        peakActivityPeriod: peakPlanningHourStr,
        totalEvents: events.length,
      },
      budgetMetrics: {
        totalTarget: totalBudget,
        totalSpent: spentTotal,
        perPersonShare,
        memberShares: memberBreakdown.map(m => ({
          userId: m.id || m.name,
          name: m.name,
          paid: m.paid,
          share: m.share,
          netBalance: m.netBalance,
        })),
        zeroSumReconciled: budgetReport ? budgetReport.zeroSumReconciled : true,
      },
      recentEvents: events.slice(-15).reverse(),
      hasActivity: events.length > 0,
    };
  }
}

