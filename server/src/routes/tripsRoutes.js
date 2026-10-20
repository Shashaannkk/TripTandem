import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../store.js';

const router = express.Router();

// GET /api/trips - list trips
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: store.trips.map(t => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      coverImage: t.coverImage,
      startDate: t.startDate,
      endDate: t.endDate,
      daysCount: t.daysCount,
      membersCount: t.members.length,
      budgetTotal: t.budget.totalTarget,
    })),
  });
});

// POST /api/trips - create new trip
router.post('/', (req, res) => {
  const { title, destination, startDate, endDate, daysCount, budgetTotal, createdBy } = req.body;
  const newTrip = {
    id: `trip-${uuidv4().slice(0, 8)}`,
    title: title || `${destination} Adventure`,
    destination: destination || 'Goa, India',
    coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
    startDate: startDate || '2026-11-20',
    endDate: endDate || '2026-11-23',
    daysCount: daysCount || 3,
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
    members: [
      createdBy || store.users[0],
    ],
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
        senderId: 'system',
        senderName: 'TripTandem Assistant',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: `Trip "${title || destination}" created! Invite friends to start collaborating in real time.`,
        timestamp: 'Just now',
      }
    ],
  };

  store.trips.push(newTrip);
  res.status(201).json({ success: true, data: newTrip });
});

// GET /api/trips/code/:inviteCode - look up trip by invite code
router.get('/code/:inviteCode', (req, res) => {
  const code = (req.params.inviteCode || '').trim().toUpperCase();
  const trip = store.trips.find(t => (t.inviteCode || '').toUpperCase() === code || t.id.toUpperCase() === code);
  if (!trip) {
    return res.status(404).json({ success: false, message: `No active trip found for invite code "${code}"` });
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

// POST /api/trips/join-by-code - real participant joins trip with invite code
router.post('/join-by-code', (req, res) => {
  const { inviteCode, user, role = 'Planner' } = req.body;
  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({ success: false, message: 'Invite code is required' });
  }
  if (!user || (!user.id && !user.name)) {
    return res.status(400).json({ success: false, message: 'Valid user object required to join' });
  }

  const cleanCode = inviteCode.trim().toUpperCase();
  let trip = store.trips.find(t => (t.inviteCode || '').toUpperCase() === cleanCode || t.id.toUpperCase() === cleanCode);
  if (!trip && cleanCode.includes('GOA')) {
    trip = store.trips.find(t => t.id === 'trip-goa-2026') || store.trips[0];
  }

  // If not found in memory, create a dynamic trip room for that invite code so friends never hit a dead end
  if (!trip) {
    const isManali = cleanCode.includes('MAN');
    const isJaipur = cleanCode.includes('JAI');
    const isKerala = cleanCode.includes('KER');
    const isUdaipur = cleanCode.includes('UDA');
    const destName = isManali ? 'Manali, Himachal Pradesh' : isJaipur ? 'Jaipur, Rajasthan' : isKerala ? 'Kerala, India' : isUdaipur ? 'Udaipur, Rajasthan' : 'Goa, India';

    trip = {
      id: `trip-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title: `${destName.split(',')[0]} Crew Escape`,
      destination: destName,
      coverImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      daysCount: 3,
      leaderUserId: user.id || 'lead',
      status: 'drafting',
      participantIds: [],
      budget: {
        totalTarget: 36000,
        currency: 'INR',
        splitMode: 'equal',
        categories: { accommodation: 16200, food: 9000, transport: 5400, activities: 3600, other: 1800 },
        expenses: [],
      },
      members: [],
      inviteCode: cleanCode,
      days: [
        { dayNumber: 1, dateFormatted: 'Day 1', theme: 'Arrival & Welcome', items: [] },
        { dayNumber: 2, dateFormatted: 'Day 2', theme: 'Explore & Activities', items: [] },
        { dayNumber: 3, dateFormatted: 'Day 3', theme: 'Farewell & Departure', items: [] },
      ],
      chat: [],
    };
    store.trips.push(trip);
  }

  // Check if user is already a member
  const memberIdx = (trip.members || []).findIndex(
    m => m.id === user.id || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
  );

  const newMemberObj = {
    id: user.id || `user-${uuidv4().slice(0, 8)}`,
    name: user.name || 'Traveler',
    email: user.email || `${(user.name || 'user').toLowerCase().replace(/\s+/g, '.')}@triptandem.travel`,
    role: role || user.role || 'Planner', // 'Leader' | 'Planner' | 'Viewer'
    avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    color: user.color || '#FF6B45',
    upiId: user.upiId || `${(user.name || 'user').toLowerCase().replace(/\s+/g, '')}@upi`,
    upiQrCode: user.upiQrCode || null,
    status: 'online',
    joinedAt: new Date().toISOString(),
  };

  let joinMessage = null;

  if (memberIdx === -1) {
    if (!trip.members) trip.members = [];
    trip.members.push(newMemberObj);

    if (!trip.participantIds) trip.participantIds = [];
    if (!trip.participantIds.includes(newMemberObj.id)) {
      trip.participantIds.push(newMemberObj.id);
    }

    // Add notification into group chat
    if (!trip.chat) trip.chat = [];
    joinMessage = {
      id: `msg-${uuidv4()}`,
      tripId: trip.id,
      senderId: 'system',
      senderName: 'Trip Concierge',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: `${newMemberObj.name} joined the trip room as ${newMemberObj.role}! 🎉 Let's collaborate.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    };
    trip.chat.push(joinMessage);
  } else {
    // Update existing member status
    trip.members[memberIdx] = { ...trip.members[memberIdx], ...newMemberObj, status: 'online' };
  }

  // Broadcast real-time event to connected sockets in this trip
  const io = req.app.get('io');
  if (io) {
    io.to(`trip_${trip.id}`).emit('member_joined', { trip, newMember: newMemberObj });
    if (joinMessage) {
      io.to(`trip_${trip.id}`).emit('new_message', { message: joinMessage });
    }
    io.to(`trip_${trip.id}`).emit('itinerary_synced', {
      trip,
      changeDescription: `${newMemberObj.name} joined the trip room`,
      updatedBy: newMemberObj,
    });
  }

  res.json({
    success: true,
    message: `Joined trip "${trip.title}" as ${newMemberObj.name}`,
    data: trip,
    member: newMemberObj,
  });
});

// POST /api/trips/:id/join - join existing trip by ID
router.post('/:id/join', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const { user, role = 'Planner' } = req.body;
  if (!user || (!user.id && !user.name)) {
    return res.status(400).json({ success: false, message: 'Valid user object required' });
  }

  const existingIdx = (trip.members || []).findIndex(
    m => m.id === user.id || (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
  );

  const memberObj = {
    id: user.id || `user-${uuidv4().slice(0, 8)}`,
    name: user.name || 'Traveler',
    email: user.email || '',
    role: role || user.role || 'Planner',
    avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    color: user.color || '#2A9D8F',
    upiId: user.upiId || '',
    upiQrCode: user.upiQrCode || null,
    status: 'online',
    joinedAt: new Date().toISOString(),
  };

  if (existingIdx === -1) {
    if (!trip.members) trip.members = [];
    trip.members.push(memberObj);
    if (!trip.participantIds) trip.participantIds = [];
    if (!trip.participantIds.includes(memberObj.id)) trip.participantIds.push(memberObj.id);

    const joinMsg = {
      id: `msg-${uuidv4()}`,
      tripId: trip.id,
      senderId: 'system',
      senderName: 'Trip Concierge',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: `${memberObj.name} joined the trip room as ${memberObj.role}! 👋`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    };
    trip.chat.push(joinMsg);

    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip.id}`).emit('member_joined', { trip, newMember: memberObj });
      io.to(`trip_${trip.id}`).emit('new_message', { message: joinMsg });
    }
  } else {
    trip.members[existingIdx] = { ...trip.members[existingIdx], ...memberObj };
    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip.id}`).emit('member_joined', { trip, newMember: trip.members[existingIdx] });
    }
  }

  res.json({ success: true, data: trip, member: memberObj });
});

// PATCH /api/trips/:id/members/:memberId/role - Trip Leader updates member role (Planner vs Viewer)
router.patch('/:id/members/:memberId/role', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const { role } = req.body;
  if (!['Leader', 'Planner', 'Viewer', 'Admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Choose from Leader, Planner, Viewer, Admin' });
  }

  const member = (trip.members || []).find(m => m.id === req.params.memberId);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

  member.role = role;
  res.json({ success: true, data: member, trip });
});

// DELETE /api/trips/:id/members/:memberId - Trip Leader removes member
router.delete('/:id/members/:memberId', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const idx = (trip.members || []).findIndex(m => m.id === req.params.memberId);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Member not found' });

  const removed = trip.members.splice(idx, 1)[0];
  if (trip.participantIds) {
    trip.participantIds = trip.participantIds.filter(id => id !== req.params.memberId);
  }

  res.json({ success: true, message: `Removed ${removed.name} from trip`, trip });
});

// GET /api/trips/:id
router.get('/:id', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found' });
  }
  res.json({ success: true, data: trip });
});

// POST /api/trips/:id/items - add itinerary activity
router.post('/:id/items', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const { dayNumber, timeSlot, title, venueId, venueName, costPerPerson, location, image, notes, startTime, duration } = req.body;
  const day = trip.days.find(d => d.dayNumber === Number(dayNumber));
  if (!day) return res.status(404).json({ success: false, message: 'Day not found' });

  const newItem = {
    id: `item-${uuidv4().slice(0, 8)}`,
    timeSlot: timeSlot || 'afternoon',
    startTime: startTime || '02:00 PM',
    duration: duration || '2h',
    title: title || 'New Activity',
    venueId: venueId || null,
    venueName: venueName || title,
    category: req.body.category || 'experience',
    image: image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    costPerPerson: Number(costPerPerson) || 0,
    location: location || trip.destination,
    source: req.body.source || 'user',
    status: 'drafting', // drafting -> voting -> locked
    votes: { up: [], down: [] },
    notes: notes || '',
  };

  day.items.push(newItem);

  // recalculate budget categories
  if (newItem.costPerPerson > 0) {
    const totalAdded = newItem.costPerPerson * (trip.members.length || 1);
    const cat = newItem.category === 'stay' ? 'accommodation' : newItem.category === 'restaurant' ? 'food' : 'activities';
    trip.budget.categories[cat] = (trip.budget.categories[cat] || 0) + totalAdded;
  }

  res.status(201).json({ success: true, data: newItem, trip });
});

// POST /api/trips/:id/items/:itemId/vote - vote on activity
router.post('/:id/items/:itemId/vote', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const { userId, voteType } = req.body; // 'up' or 'down'
  let foundItem = null;

  for (const day of trip.days) {
    const item = day.items.find(i => i.id === req.params.itemId);
    if (item) {
      foundItem = item;
      break;
    }
  }

  if (!foundItem) return res.status(404).json({ success: false, message: 'Item not found' });

  // Toggle or cast vote
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

  // Update status based on votes
  const majorityThreshold = Math.ceil((trip.members.length || 4) * 0.75); // e.g. 3 out of 4 votes
  if (foundItem.votes.up.length >= majorityThreshold) {
    foundItem.status = 'locked';
  } else if (foundItem.votes.up.length > 0) {
    foundItem.status = 'voting';
  } else {
    foundItem.status = 'drafting';
  }

  res.json({ success: true, data: foundItem, trip });
});

// PATCH /api/trips/:id/items/:itemId - edit item
router.patch('/:id/items/:itemId', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  let foundItem = null;
  for (const day of trip.days) {
    const item = day.items.find(i => i.id === req.params.itemId);
    if (item) {
      Object.assign(item, req.body);
      foundItem = item;
      break;
    }
  }

  if (!foundItem) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: foundItem, trip });
});

// DELETE /api/trips/:id/items/:itemId - delete item
router.delete('/:id/items/:itemId', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  for (const day of trip.days) {
    const idx = day.items.findIndex(i => i.id === req.params.itemId);
    if (idx !== -1) {
      day.items.splice(idx, 1);
      return res.json({ success: true, message: 'Item removed', trip });
    }
  }

  res.status(404).json({ success: false, message: 'Item not found' });
});

// POST /api/trips/:id/budget/expenses - add expense
router.post('/:id/budget/expenses', (req, res) => {
  const trip = store.trips.find(t => t.id === req.params.id);
  if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  const { title, category, amount, paidBy, splitWith, type } = req.body;
  const newExp = {
    id: `exp-${uuidv4().slice(0, 8)}`,
    title: title || 'Group Expense',
    category: category || 'other',
    amount: Number(amount) || 0,
    paidBy: paidBy || 'Alex Morgan',
    splitWith: splitWith || trip.members.map(m => m.name),
    date: new Date().toISOString().split('T')[0],
    type: type || 'actual',
  };

  trip.budget.expenses.push(newExp);
  res.status(201).json({ success: true, data: newExp, budget: trip.budget });
});

export default router;
