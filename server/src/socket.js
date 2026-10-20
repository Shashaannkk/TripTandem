// Socket.IO Real-Time Collaboration Engine for TripTandem
import { store } from './store.js';

export function setupSocketIO(io) {
  // Map of tripId -> Map(socketId -> userData)
  const roomPresences = new Map();

  io.on('connection', (socket) => {
    // 1. Join Trip Room
    socket.on('join_trip', ({ tripId, user }) => {
      socket.join(`trip_${tripId}`);
      socket.tripId = tripId;
      socket.userData = user;

      if (!roomPresences.has(tripId)) {
        roomPresences.set(tripId, new Map());
      }
      roomPresences.get(tripId).set(socket.id, user);

      // Check trip in memory store and register new member if not already joined
      const trip = store.trips.find(t => t.id === tripId);
      if (trip && user && (user.id || user.name)) {
        if (!trip.members) trip.members = [];
        const existingIdx = trip.members.findIndex(
          m => (m.id && user.id && m.id === user.id) ||
               (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
        );

        if (existingIdx === -1) {
          const newMemberObj = {
            id: user.id || `user-${Date.now().toString(36)}`,
            name: user.name || 'Traveler',
            email: user.email || '',
            role: user.role || 'Planner',
            avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            color: user.color || '#FF6B45',
            status: 'online',
            joinedAt: new Date().toISOString(),
          };

          trip.members.push(newMemberObj);
          if (!trip.participantIds) trip.participantIds = [];
          if (!trip.participantIds.includes(newMemberObj.id)) trip.participantIds.push(newMemberObj.id);

          if (!trip.chat) trip.chat = [];
          const joinMsg = {
            id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tripId,
            senderId: 'system',
            senderName: 'Trip Concierge',
            senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            text: `${newMemberObj.name} joined the trip room as ${newMemberObj.role}! 🎉 Let's collaborate.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true,
          };
          trip.chat.push(joinMsg);

          // Broadcast to everyone in room that a new member joined and a system message appeared
          io.to(`trip_${tripId}`).emit('member_joined', { trip, newMember: newMemberObj });
          io.to(`trip_${tripId}`).emit('new_message', { message: joinMsg });
        }
      }

      // Broadcast active collaborators in this trip
      const activeUsers = Array.from(roomPresences.get(tripId).values());
      io.to(`trip_${tripId}`).emit('presence_sync', {
        tripId,
        activeUsers,
        joinedUser: user,
      });
    });

    // Explicit member join announcement
    socket.on('member_join', ({ tripId, member, trip }) => {
      io.to(`trip_${tripId}`).emit('member_joined', { trip, newMember: member });
    });

    // 2. User Focus / Location in Workspace
    socket.on('user_focus', ({ tripId, focusLocation }) => {
      socket.to(`trip_${tripId}`).emit('user_focused', {
        user: socket.userData,
        focusLocation,
      });
    });

    // 3. Typing Indicator for Shared Chat
    socket.on('typing_status', ({ tripId, user, isTyping }) => {
      socket.to(`trip_${tripId}`).emit('user_typing', {
        user,
        isTyping,
      });
    });

    // 4. Send Chat Message
    socket.on('send_message', ({ tripId, message }) => {
      const trip = store.trips.find(t => t.id === tripId);
      if (trip) {
        if (!trip.chat) trip.chat = [];
        trip.chat.push(message);
      }
      io.to(`trip_${tripId}`).emit('new_message', { message });
    });

    // 4b. Message Reactions (Instagram / WhatsApp style: ❤️, 😂, 👍, 🔥, 😮, 👏, ✈️, 🥳)
    socket.on('message_reaction', ({ tripId, messageId, emoji, user }) => {
      const trip = store.trips.find(t => t.id === tripId);
      let updatedReactions = null;
      if (trip && trip.chat) {
        const msg = trip.chat.find(m => m.id === messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

          const existingUserIdx = msg.reactions[emoji].findIndex(u => (typeof u === 'string' ? u : u.id) === user.id);
          if (existingUserIdx >= 0) {
            msg.reactions[emoji].splice(existingUserIdx, 1);
            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }
          } else {
            msg.reactions[emoji].push({ id: user.id, name: user.name });
          }
          updatedReactions = msg.reactions;
        }
      }

      io.to(`trip_${tripId}`).emit('message_reaction_synced', {
        tripId,
        messageId,
        emoji,
        user,
        reactions: updatedReactions,
      });
    });

    // 5. Itinerary Updates (Add, Edit, Reorder, Delete)
    socket.on('itinerary_change', ({ tripId, trip, changeDescription, updatedBy }) => {
      // Sync in-memory store
      const existingIdx = store.trips.findIndex(t => t.id === tripId);
      if (existingIdx !== -1 && trip) {
        store.trips[existingIdx] = trip;
      }

      socket.to(`trip_${tripId}`).emit('itinerary_synced', {
        trip,
        changeDescription,
        updatedBy,
      });
    });

    // 6. Cast Vote on Activity (Consensus Up/Down)
    socket.on('cast_vote', ({ tripId, itemId, votes, status, user }) => {
      io.to(`trip_${tripId}`).emit('vote_recorded', {
        itemId,
        votes,
        status,
        user,
      });
    });

    // 6b. Contested-Slot Timed Duel Vote (PRD Section 6.2 & 7.3.4)
    socket.on('trip.vote.open', ({ tripId, duelId, title, slotKey, dayNumber, candidateItems, durationSeconds = 60, openedBy }) => {
      const closesAt = Date.now() + (durationSeconds * 1000);
      const duel = {
        duelId: duelId || `duel-${Date.now()}`,
        tripId,
        title: title || `Contested Slot Duel`,
        slotKey,
        dayNumber,
        candidateItems,
        durationSeconds,
        closesAt,
        votes: {}, // userId -> { choiceItemId, userName, userAvatar }
        status: 'active',
        openedBy,
      };

      if (!store.activeDuels) store.activeDuels = new Map();
      store.activeDuels.set(duel.duelId, duel);

      io.to(`trip_${tripId}`).emit('trip.vote.opened', duel);

      // Automatic resolution timer when countdown expires
      setTimeout(() => {
        resolveDuelVote(io, tripId, duel.duelId);
      }, durationSeconds * 1000);
    });

    socket.on('trip.vote.cast', ({ tripId, duelId, userId, userName, userAvatar, choiceItemId }) => {
      if (!store.activeDuels) return;
      const duel = store.activeDuels.get(duelId);
      if (!duel || duel.status !== 'active') return;

      duel.votes[userId] = { choiceItemId, userName, userAvatar, castAt: Date.now() };

      io.to(`trip_${tripId}`).emit('trip.vote.cast_recorded', {
        duelId,
        votes: duel.votes,
        voter: { userId, userName, userAvatar, choiceItemId },
      });
    });

    socket.on('trip.vote.resolve', ({ tripId, duelId }) => {
      resolveDuelVote(io, tripId, duelId);
    });

    // 7. Budget Updates
    socket.on('budget_change', ({ tripId, budget, expense, user }) => {
      const trip = store.trips.find(t => t.id === tripId);
      if (trip && budget) {
        trip.budget = budget;
      }
      io.to(`trip_${tripId}`).emit('budget_synced', {
        budget,
        expense,
        user,
      });
    });

    // 8. Real-time Canvas Sync Drift Latency Ping/Pong (PRD Section 1.3 & 7.3.4)
    socket.on('trip.sync.ping', ({ clientSentAt }) => {
      socket.emit('trip.sync.pong', {
        clientSentAt,
        serverReceivedAt: Date.now(),
      });
    });

    // 9. Trip Leader Moderation: Transfer Leader Role (PRD Section 6.1)
    socket.on('trip.leader.transfer', ({ tripId, newLeaderId, newLeaderName }) => {
      const trip = store.trips.find(t => t.id === tripId);
      if (trip) {
        trip.leaderUserId = newLeaderId;
        if (trip.members) {
          trip.members.forEach(m => {
            if (m.id === newLeaderId) m.role = 'Leader';
            else if (m.role === 'Leader') m.role = 'Planner';
          });
        }
      }
      io.to(`trip_${tripId}`).emit('trip.leader.transferred', {
        tripId,
        newLeaderId,
        newLeaderName,
        trip,
      });
    });

    // 10. Trip Leader Moderation: Lock Room / Workspace (PRD Section 6.1)
    socket.on('trip.room.lock_toggle', ({ tripId, isLocked, toggledBy }) => {
      const trip = store.trips.find(t => t.id === tripId);
      if (trip) {
        trip.isRoomLocked = isLocked;
      }
      io.to(`trip_${tripId}`).emit('trip.room.lock_updated', {
        tripId,
        isRoomLocked: isLocked,
        toggledBy,
      });
    });

    // 11. Disconnect / Leave + Leader Disconnect Alert (PRD Section 6.1)
    socket.on('disconnect', () => {
      if (socket.tripId && roomPresences.has(socket.tripId)) {
        roomPresences.get(socket.tripId).delete(socket.id);
        const activeUsers = Array.from(roomPresences.get(socket.tripId).values());
        
        io.to(`trip_${socket.tripId}`).emit('presence_sync', {
          tripId: socket.tripId,
          activeUsers,
          leftUser: socket.userData,
        });

        // Check if disconnected user was Trip Leader (PRD Section 6.1)
        const trip = store.trips.find(t => t.id === socket.tripId);
        const leaderId = trip?.leaderUserId || trip?.creatorId || trip?.members?.[0]?.id;
        if (socket.userData?.id && socket.userData.id === leaderId) {
          const isLeaderStillInRoom = activeUsers.some(u => u.id === leaderId);
          if (!isLeaderStillInRoom) {
            io.to(`trip_${socket.tripId}`).emit('trip.leader.status', {
              tripId: socket.tripId,
              isLeaderConnected: false,
              leader: socket.userData,
              message: 'Trip Leader disconnected. Lock and finalize operations are temporarily frozen.',
            });
          }
        }
      }
    });
  });
}

// Helper: Resolve Contested Duel Vote and atomically apply winner
function resolveDuelVote(io, tripId, duelId) {
  if (!store.activeDuels) return;
  const duel = store.activeDuels.get(duelId);
  if (!duel || duel.status === 'resolved') return;

  duel.status = 'resolved';

  // Tally votes
  const tallies = {};
  duel.candidateItems.forEach(item => {
    tallies[item.id] = 0;
  });

  Object.values(duel.votes).forEach(v => {
    if (tallies[v.choiceItemId] !== undefined) {
      tallies[v.choiceItemId]++;
    }
  });

  let winningItem = duel.candidateItems[0];
  let maxVotes = -1;
  duel.candidateItems.forEach(item => {
    const count = tallies[item.id] || 0;
    if (count > maxVotes) {
      maxVotes = count;
      winningItem = item;
    }
  });

  duel.winningItem = winningItem;
  duel.tallies = tallies;

  // Persist winning item as 'locked' in store.trips
  const trip = store.trips.find(t => t.id === tripId);
  if (trip && trip.days) {
    const day = trip.days.find(d => d.dayNumber === duel.dayNumber);
    if (day) {
      const winner = day.items.find(i => i.id === winningItem.id);
      if (winner) {
        winner.status = 'locked';
        winner.positionVersion = (winner.positionVersion || 1) + 1;
      }
      duel.candidateItems.forEach(ci => {
        if (ci.id !== winningItem.id) {
          const loser = day.items.find(i => i.id === ci.id);
          if (loser) loser.status = 'drafting';
        }
      });
    }
  }

  io.to(`trip_${tripId}`).emit('trip.vote.resolved', {
    duelId,
    winningItem,
    tallies,
    trip,
  });
}

