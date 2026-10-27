import { dataService } from './dataService.js';

export class AnalyticsService {
  /**
   * Derive authentic session analytics from recorded event logs and trip data.
   * Eliminates hardcoded demonstration values.
   */
  static async calculateTripAnalytics(tripId) {
    const trip = await dataService.getTripById(tripId);
    if (!trip) return null;

    const events = await dataService.getEventsForTrip(tripId);

    // 1. Planning duration: Count unique calendar days (UTC/ISO) with recorded activity
    const activeDates = new Set();
    events.forEach(e => {
      if (e.timestamp) {
        const dateStr = new Date(e.timestamp).toISOString().split('T')[0];
        activeDates.add(dateStr);
      }
    });
    const planningDays = activeDates.size;

    // 2. Planning actions by member
    const actionsByMember = {};
    const uniqueActors = new Set();

    events.forEach(e => {
      const actor = e.actorId || 'system';
      if (actor !== 'system') {
        uniqueActors.add(actor);
      }
      actionsByMember[actor] = (actionsByMember[actor] || 0) + 1;
    });

    // 3. Peak planners count: Maximum concurrent active collaborators or distinct participants
    const peakPlanners = Math.max(uniqueActors.size, (trip.members || []).length > 0 ? 1 : 0);

    // 4. AI Questions asked
    const aiQuestionsAsked = events.filter(e => e.type === 'ai.question').length;

    // 5. Conflicts detected & resolved
    const conflictsFlagged = events.filter(e => e.type === 'conflict.flagged').length;
    const conflictsResolved = events.filter(e => e.type === 'conflict.resolved').length;

    // 6. Votes opened, cast, resolved
    const votesOpened = events.filter(e => e.type === 'vote.opened').length;
    const votesCast = events.filter(e => e.type === 'vote.cast').length;
    const votesResolved = events.filter(e => e.type === 'vote.resolved').length;

    // 7. Budget totals from verified expenses
    const expenses = trip.budget?.expenses || [];
    const spentTotal = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const totalBudget = trip.budget?.totalTarget || 40000;
    const memberCount = Math.max((trip.members || []).length, 1);
    const perPersonShare = Math.round(spentTotal / memberCount);

    // Member contribution breakdown
    const memberBreakdown = (trip.members || []).map(m => {
      const paid = expenses
        .filter(exp => exp.paidBy === m.name || exp.paidBy === m.id)
        .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const actions = actionsByMember[m.id] || actionsByMember[m.name] || 0;
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        role: m.role,
        paid,
        share: perPersonShare,
        actionsCount: actions,
      };
    });

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

    return {
      tripId,
      title: trip.title,
      totalEvents: events.length,
      planningDays,
      peakPlanners,
      aiQuestionsAsked,
      conflictsFlagged,
      conflictsResolved,
      votesOpened,
      votesCast,
      votesResolved,
      totalBudget,
      spentTotal,
      perPersonShare,
      peakPlanningHourUTC: `${peakHour.toString().padStart(2, '0')}:00 UTC`,
      memberBreakdown,
      recentEvents: events.slice(-15).reverse(),
      hasActivity: events.length > 0,
    };
  }
}

