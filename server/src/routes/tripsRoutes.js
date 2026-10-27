import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dataService } from '../services/dataService.js';
import { BudgetEngine } from '../services/budgetService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { RecommendationService } from '../services/recommendationService.js';
import {
  authenticateToken,
  optionalAuthToken,
  requireTripMember,
} from '../middleware/auth.js';

const router = express.Router();

// GET /api/trips - list trips
router.get('/', optionalAuthToken, async (req, res) => {
  const allTrips = await dataService.listTrips();
  res.json({
    success: true,
    data: allTrips.map(t => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      coverImage: t.coverImage,
      startDate: t.startDate,
      endDate: t.endDate,
      daysCount: t.daysCount,
      membersCount: (t.members || []).length,
      budgetTotal: t.budget?.totalTarget || 30000,
    })),
  });
});

// POST /api/trips - create new trip
router.post('/', optionalAuthToken, async (req, res) => {
  const { title, destination, startDate, endDate, daysCount, budgetTotal, createdBy } = req.body;
  const creator = req.user
    ? {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: 'Leader',
        color: '#FF6B45',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      }
    : (createdBy || {
        id: 'user-1',
        name: 'Alex Morgan',
        role: 'Leader',
        color: '#FF6B45',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });

  const tripId = `trip-${uuidv4().slice(0, 8)}`;
  const cleanDestination = destination || 'Goa, India';

  const newTrip = {
    id: tripId,
    title: title || `${cleanDestination.split(',')[0]} Adventure`,
    destination: cleanDestination,
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
    startDate: startDate || '2026-11-20',
    endDate: endDate || '2026-11-23',
    daysCount: Number(daysCount) || 3,
    leaderUserId: creator.id,
    isRoomLocked: false,
    budget: {
      totalTarget: Number(budgetTotal) || 30000,
      currency: 'INR',
      splitMode: 'equal',
      categories: {
        accommodation: Math.round((Number(budgetTotal) || 30000) * 0.45),
        food: Math.round((Number(budgetTotal) || 30000) * 0.25),
        transport: Math.round((Number(budgetTotal) || 30000) * 0.15),
        activities: Math.round((Number(budgetTotal) || 30000) * 0.10),
        other: Math.round((Number(budgetTotal) || 30000) * 0.05),
      },
      expenses: [],
    },
    members: [{ ...creator, role: 'Leader' }],
    participantIds: [creator.id],
    inviteCode: `TANDEM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    days: Array.from({ length: Number(daysCount) || 3 }, (_, i) => ({
      dayNumber: i + 1,
      dateFormatted: `Day ${i + 1}`,
      theme: i === 0 ? 'Arrival & Welcome' : i === 1 ? 'Adventure & Discovery' : 'Leisure & Departure',
      items: [],
    })),
    chat: [
      {
        id: `msg-${uuidv4()}`,
        tripId,
        senderId: 'system',
        senderName: 'TripTandem Assistant',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: `Trip "${title || cleanDestination}" created! Invite friends to start collaborating in real time.`,
        timestamp: 'Just now',
        isSystem: true,
      },
    ],
  };

  const created = await dataService.createTrip(newTrip);

  // Record trip.created event
  await dataService.recordEvent({
    tripId: created.id,
    type: 'trip.created',
    actorId: creator.id,
    metadata: { title: created.title, destination: created.destination },
  });

  res.status(201).json({ success: true, data: created });
});

// GET /api/trips/code/:inviteCode - look up trip by invite code
router.get('/code/:inviteCode', async (req, res) => {
  const trip = await dataService.getTripByInviteCode(req.params.inviteCode);
  if (!trip) {
    return res.status(404).json({
      success: false,
      message: `No active trip found for invite code "${req.params.inviteCode}"`,
    });
  }
  res.json({
    success: true,
    data: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      coverImage: trip.coverImage,
      startDate: trip.startDate,
      endDate: trip.endDate,
      daysCount: trip.daysCount,
      inviteCode: trip.inviteCode,
      members: trip.members || [],
      membersCount: (trip.members || []).length,
      budgetTotal: trip.budget?.totalTarget || 30000,
    },
  });
});

// POST /api/trips/join-by-code - participant joins trip with invite code
router.post('/join-by-code', optionalAuthToken, async (req, res) => {
  const { inviteCode, user, role = 'Planner' } = req.body;
  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({ success: false, message: 'Invite code is required' });
  }

  const cleanCode = inviteCode.trim().toUpperCase();
  let trip = await dataService.getTripByInviteCode(cleanCode);

  if (!trip) {
    return res.status(404).json({ success: false, message: `Trip not found for invite code ${cleanCode}` });
  }

  const effectiveUser = req.user || user;
  if (!effectiveUser || (!effectiveUser.id && !effectiveUser.name)) {
    return res.status(400).json({ success: false, message: 'Valid user object required to join' });
  }

  const newMemberObj = {
    id: effectiveUser.id || `user-${uuidv4().slice(0, 8)}`,
    name: effectiveUser.name || 'Traveler',
    email: effectiveUser.email || '',
    role: role || effectiveUser.role || 'Planner',
    avatar: effectiveUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    color: effectiveUser.color || '#FF6B45',
    upiId: effectiveUser.upiId || '',
    status: 'online',
    joinedAt: new Date().toISOString(),
  };

  const updatedTrip = await dataService.addMemberToTrip(trip.id, newMemberObj);

  // Record trip.member.joined event
  await dataService.recordEvent({
    tripId: trip.id,
    type: 'trip.member.joined',
    actorId: newMemberObj.id,
    metadata: { name: newMemberObj.name, role: newMemberObj.role },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`trip_${trip.id}`).emit('member_joined', { trip: updatedTrip, newMember: newMemberObj });
  }

  res.json({
    success: true,
    message: `Joined trip "${trip.title}" as ${newMemberObj.name}`,
    data: updatedTrip,
    member: newMemberObj,
  });
});

// GET /api/trips/:id - get trip details
router.get('/:id', optionalAuthToken, async (req, res) => {
  const trip = await dataService.getTripById(req.params.id);
  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }
  res.json({ success: true, data: trip });
});

// POST /api/trips/:id/lock - Leader locks/unlocks room workspace (PRD Section 6.1)
router.post('/:id/lock', authenticateToken, requireTripMember(['Leader', 'Admin']), async (req, res) => {
  const { isLocked = true } = req.body;
  const trip = await dataService.updateTrip(req.params.id, { isRoomLocked: Boolean(isLocked) });

  await dataService.recordEvent({
    tripId: req.params.id,
    type: isLocked ? 'trip.locked' : 'trip.unlocked',
    actorId: req.user.id,
    metadata: { toggledBy: req.user.name, isLocked },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`trip_${req.params.id}`).emit('trip.room.lock_updated', {
      tripId: req.params.id,
      isRoomLocked: Boolean(isLocked),
      toggledBy: req.user,
    });
  }

  res.json({ success: true, isRoomLocked: Boolean(isLocked), trip });
});

// PATCH /api/trips/:id/members/:memberId/role - Leader updates member role
router.patch(
  '/:id/members/:memberId/role',
  authenticateToken,
  requireTripMember(['Leader', 'Admin']),
  async (req, res) => {
    const { role } = req.body;
    if (!['Leader', 'Planner', 'Viewer', 'Admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: Leader, Planner, Viewer, Admin',
      });
    }

    const updatedTrip = await dataService.updateMemberRole(req.params.id, req.params.memberId, role);
    if (!updatedTrip) {
      return res.status(404).json({ success: false, message: 'Member or Trip not found' });
    }

    await dataService.recordEvent({
      tripId: req.params.id,
      type: 'trip.member.role_changed',
      actorId: req.user.id,
      metadata: { targetMemberId: req.params.memberId, newRole: role, updatedBy: req.user.name },
    });

    const member = (updatedTrip.members || []).find(m => m.id === req.params.memberId);
    res.json({ success: true, data: member, trip: updatedTrip });
  }
);

// DELETE /api/trips/:id/members/:memberId - Leader removes member
router.delete(
  '/:id/members/:memberId',
  authenticateToken,
  requireTripMember(['Leader', 'Admin']),
  async (req, res) => {
    const updatedTrip = await dataService.removeMemberFromTrip(req.params.id, req.params.memberId);
    if (!updatedTrip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await dataService.recordEvent({
      tripId: req.params.id,
      type: 'trip.member.removed',
      actorId: req.user.id,
      metadata: { removedMemberId: req.params.memberId, removedBy: req.user.name },
    });

    res.json({ success: true, message: 'Member removed from trip', trip: updatedTrip });
  }
);

// POST /api/trips/:id/items - add itinerary activity
router.post(
  '/:id/items',
  authenticateToken,
  requireTripMember(['Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const { dayNumber = 1, ...itemData } = req.body;

    const result = await dataService.addItemToTrip(req.params.id, dayNumber, itemData);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Trip or Day not found' });
    }

    await dataService.recordEvent({
      tripId: req.params.id,
      type: 'itinerary.item.created',
      actorId: req.user.id,
      metadata: { itemId: result.item.id, title: result.item.title, dayNumber },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${req.params.id}`).emit('itinerary_synced', {
        trip: result.trip,
        changeDescription: `Added activity "${result.item.title}"`,
        updatedBy: req.user,
      });
    }

    res.status(201).json({ success: true, data: result.item, trip: result.trip });
  }
);

// PATCH /api/trips/:id/items/:itemId - edit or reorder activity with Optimistic Concurrency (positionVersion)
router.patch(
  '/:id/items/:itemId',
  authenticateToken,
  requireTripMember(['Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const result = await dataService.updateItemWithConcurrency(
      req.params.id,
      req.params.itemId,
      req.body
    );

    if (!result.success) {
      if (result.conflict) {
        // Record conflict flagged event
        await dataService.recordEvent({
          tripId: req.params.id,
          type: 'conflict.flagged',
          actorId: req.user.id,
          metadata: { itemId: req.params.itemId, serverVersion: result.currentServerVersion },
        });

        return res.status(409).json({
          success: false,
          conflict: true,
          error: result.error,
          currentServerVersion: result.currentServerVersion,
          authoritativeItem: result.authoritativeItem,
          trip: result.authoritativeTrip,
        });
      }
      return res.status(404).json({ success: false, message: result.error });
    }

    const isReorder = req.body.dayNumber !== undefined || req.body.dayIndex !== undefined || req.body.order !== undefined;
    await dataService.recordEvent({
      tripId: req.params.id,
      type: isReorder ? 'itinerary.item.reordered' : 'itinerary.item.updated',
      actorId: req.user.id,
      metadata: { itemId: req.params.itemId, newVersion: result.newVersion },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${req.params.id}`).emit('trip.board.updated', {
        tripId: req.params.id,
        itemId: req.params.itemId,
        item: result.item,
        trip: result.trip,
        updatedBy: req.user,
      });
      io.to(`trip_${req.params.id}`).emit('itinerary_synced', {
        trip: result.trip,
        changeDescription: `Updated activity "${result.item.title}"`,
        updatedBy: req.user,
      });
    }

    res.json({
      success: true,
      data: result.item,
      trip: result.trip,
      positionVersion: result.newVersion,
    });
  }
);

// POST /api/trips/:id/items/:itemId/vote - Consensus Up/Down vote on activity
router.post(
  '/:id/items/:itemId/vote',
  authenticateToken,
  requireTripMember(['Viewer', 'Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const { voteType = 'up' } = req.body;
    const userId = req.user.id; // Trusted identity!

    const trip = await dataService.getTripById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    let foundItem = null;
    let foundDay = null;

    for (const day of trip.days || []) {
      const it = (day.items || []).find(i => i.id === req.params.itemId);
      if (it) {
        foundItem = it;
        foundDay = day;
        break;
      }
    }

    if (!foundItem) return res.status(404).json({ success: false, message: 'Activity not found' });

    if (!foundItem.votes) foundItem.votes = { up: [], down: [] };
    if (!Array.isArray(foundItem.votes.up)) foundItem.votes.up = [];
    if (!Array.isArray(foundItem.votes.down)) foundItem.votes.down = [];

    // Toggle vote
    if (voteType === 'up') {
      if (foundItem.votes.up.includes(userId)) {
        foundItem.votes.up = foundItem.votes.up.filter(id => id !== userId);
      } else {
        foundItem.votes.up.push(userId);
        foundItem.votes.down = foundItem.votes.down.filter(id => id !== userId);
      }
    } else if (voteType === 'down') {
      if (foundItem.votes.down.includes(userId)) {
        foundItem.votes.down = foundItem.votes.down.filter(id => id !== userId);
      } else {
        foundItem.votes.down.push(userId);
        foundItem.votes.up = foundItem.votes.up.filter(id => id !== userId);
      }
    }

    const previousStatus = foundItem.status;
    const majorityThreshold = Math.ceil(((trip.members || []).length || 4) * 0.75);

    if (foundItem.votes.up.length >= majorityThreshold) {
      foundItem.status = 'locked';
      foundItem.lifecycleStage = 'locked';
    } else if (foundItem.votes.up.length > 0) {
      foundItem.status = 'voting';
      foundItem.lifecycleStage = 'voting';
    } else {
      foundItem.status = 'drafting';
      foundItem.lifecycleStage = 'drafting';
    }

    // Version increments when vote changes lifecycle state
    foundItem.positionVersion = (foundItem.positionVersion || 1) + 1;

    await dataService.updateTrip(trip.id, { days: trip.days });

    await dataService.recordEvent({
      tripId: trip.id,
      type: 'vote.cast',
      actorId: userId,
      metadata: { itemId: foundItem.id, voteType, newStatus: foundItem.status },
    });

    if (previousStatus !== 'locked' && foundItem.status === 'locked') {
      await dataService.recordEvent({
        tripId: trip.id,
        type: 'vote.resolved',
        actorId: 'system',
        metadata: { itemId: foundItem.id, consensusReached: true },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip.id}`).emit('vote_recorded', {
        itemId: foundItem.id,
        votes: foundItem.votes,
        status: foundItem.status,
        user: req.user,
      });
    }

    res.json({ success: true, data: foundItem, trip });
  }
);

// DELETE /api/trips/:id/items/:itemId - Delete activity
router.delete(
  '/:id/items/:itemId',
  authenticateToken,
  requireTripMember(['Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const updatedTrip = await dataService.removeItemFromTrip(req.params.id, req.params.itemId);
    if (!updatedTrip) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    await dataService.recordEvent({
      tripId: req.params.id,
      type: 'itinerary.item.deleted',
      actorId: req.user.id,
      metadata: { itemId: req.params.itemId },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${req.params.id}`).emit('itinerary_synced', {
        trip: updatedTrip,
        changeDescription: 'Activity removed',
        updatedBy: req.user,
      });
    }

    res.json({ success: true, message: 'Activity deleted', trip: updatedTrip });
  }
);

// POST /api/trips/:id/budget/expenses - Add expense with Equal or Weighted split
router.post(
  '/:id/budget/expenses',
  authenticateToken,
  requireTripMember(['Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const trip = await dataService.getTripById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    const {
      title,
      category,
      amount,
      paidBy,
      splitMode = 'equal',
      splitWith,
      splits = {},
      type = 'actual',
      receiptUrl,
    } = req.body;

    const memberNames = (trip.members || []).map(m => m.name);
    const resolvedParticipants = Array.isArray(splitWith) && splitWith.length > 0 ? splitWith : memberNames;

    if (resolvedParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense participant list (splitWith) must not be empty.',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be a positive number.',
      });
    }

    // Validate splitting math via BudgetEngine
    try {
      BudgetEngine.calculateExpenseSharesInPaise({
        amount: parsedAmount,
        splitMode,
        splitWith: resolvedParticipants,
        splits,
      });
    } catch (mathErr) {
      return res.status(422).json({
        success: false,
        message: `Budget validation error: ${mathErr.message}`,
      });
    }

    const newExpense = {
      id: `exp-${uuidv4().slice(0, 8)}`,
      title: title || 'Group Expense',
      category: category || 'other',
      amount: parsedAmount,
      paidBy: paidBy || req.user.name,
      splitMode,
      splitWith: resolvedParticipants,
      splits,
      date: new Date().toISOString().split('T')[0],
      type,
      receiptUrl: receiptUrl || null,
    };

    if (!trip.budget) trip.budget = { expenses: [] };
    if (!trip.budget.expenses) trip.budget.expenses = [];
    trip.budget.expenses.push(newExpense);

    // Persist trip budget
    await dataService.updateTrip(trip.id, { budget: trip.budget });

    // Record budget.expense.created event
    await dataService.recordEvent({
      tripId: trip.id,
      type: 'budget.expense.created',
      actorId: req.user.id,
      metadata: { expenseId: newExpense.id, amount: parsedAmount, title: newExpense.title },
    });

    const reconciledBudget = BudgetEngine.reconcileTripBudget(trip);

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip.id}`).emit('budget_synced', {
        budget: reconciledBudget,
        expense: newExpense,
        user: req.user,
      });
    }

    res.status(201).json({
      success: true,
      data: newExpense,
      budget: reconciledBudget,
    });
  }
);

// GET /api/trips/:id/analytics - Real Event-Driven Session Analytics (Feature 4)
router.get(
  '/:id/analytics',
  authenticateToken,
  requireTripMember(['Viewer', 'Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const analytics = await AnalyticsService.calculateTripAnalytics(req.params.id);
    if (!analytics) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    res.json({ success: true, data: analytics });
  }
);

// GET /api/trips/:id/recommendations - Hybrid Group Recommender (Feature 5)
router.get(
  '/:id/recommendations',
  authenticateToken,
  requireTripMember(['Viewer', 'Planner', 'Leader', 'Admin']),
  async (req, res) => {
    const trip = await dataService.getTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const { limit = 8, dietary, maxPrice } = req.query;
    const recommendations = await RecommendationService.getRecommendationsForGroup(trip, {
      limit: Number(limit) || 8,
      dietaryTags: dietary ? String(dietary).split(',') : [],
      maxPrice: maxPrice ? Number(maxPrice) : null,
    });

    res.json({
      success: true,
      data: recommendations,
      tripId: trip.id,
      destination: trip.destination,
      count: recommendations.length,
    });
  }
);

export default router;
