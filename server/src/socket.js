// Socket.IO Real-Time Collaboration Engine for TripTandem
import jwt from 'jsonwebtoken';
import { store } from './store.js';
import { dataService } from './services/dataService.js';
import { BudgetEngine } from './services/budgetService.js';
import { JWT_SECRET } from './middleware/auth.js';

export function setupSocketIO(io) {
  // Map of tripId -> Map(socketId -> userData)
  const roomPresences = new Map();

  // -------------------------------------------------------------
  // Socket.IO Handshake Authentication Middleware (PRD Section 10)
  // -------------------------------------------------------------
  io.use(async (socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      let token = null;
      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      }

      if (!token) {
        // Allow unauthenticated connection in read-only / guest mode for tests or public joins
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: invalid token claims'));
      }

      // Attach verified server-side identity to socket context
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || 'Traveler',
        role: decoded.role || 'Planner',
      };

      next();
    } catch (err) {
      return next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // Helper to verify user permissions for mutating operations on a trip
  async function authorizeSocketTripAction(socket, tripId, allowedRoles = ['Planner', 'Leader', 'Admin']) {
    if (!socket.user) {
      return { authorized: false, error: 'Unauthorized: authentication token required.' };
    }

    if (socket.user.role === 'Admin') {
      return { authorized: true, role: 'Admin' };
    }

    const trip = await dataService.getTripById(tripId);
    if (!trip) {
      return { authorized: false, error: `Trip "${tripId}" not found.` };
    }

    const member = (trip.members || []).find(
      m => m.id === socket.user.id || (m.email && m.email.toLowerCase() === socket.user.email.toLowerCase())
    );

    if (!member) {
      return { authorized: false, error: 'Forbidden: you are not a member of this trip room.' };
    }

    const effectiveRole = member.role || 'Planner';
    const isAllowed =
      allowedRoles.includes(effectiveRole) ||
      effectiveRole === 'Owner' ||
      effectiveRole === 'Leader';

    if (!isAllowed) {
      return {
        authorized: false,
        error: `Forbidden: role "${effectiveRole}" is not permitted to perform this operation. Allowed: [${allowedRoles.join(', ')}].`,
      };
    }

    return { authorized: true, role: effectiveRole, member, trip };
  }

  io.on('connection', (socket) => {
    // -----------------------------------------------------------
    // 1. Join Trip Room
    // -----------------------------------------------------------
    socket.on('join_trip', async ({ tripId, user }, callback) => {
      try {
        if (!tripId) {
          if (callback) callback({ success: false, error: 'Trip ID is required' });
          return;
        }

        const effectiveUser = socket.user || user || {
          id: `guest-${socket.id.slice(0, 5)}`,
          name: 'Guest Traveler',
          role: 'Viewer',
        };

        socket.join(`trip_${tripId}`);
        socket.tripId = tripId;
        socket.userData = effectiveUser;

        if (!roomPresences.has(tripId)) {
          roomPresences.set(tripId, new Map());
        }
        roomPresences.get(tripId).set(socket.id, effectiveUser);

        // Register member in trip if not present
        const trip = await dataService.getTripById(tripId);
        if (trip && effectiveUser && (effectiveUser.id || effectiveUser.name)) {
          const existingIdx = (trip.members || []).findIndex(
            m => (m.id && effectiveUser.id && m.id === effectiveUser.id) ||
                 (m.email && effectiveUser.email && m.email.toLowerCase() === effectiveUser.email.toLowerCase())
          );

          if (existingIdx === -1) {
            const newMemberObj = {
              id: effectiveUser.id || `user-${Date.now().toString(36)}`,
              name: effectiveUser.name || 'Traveler',
              email: effectiveUser.email || '',
              role: effectiveUser.role || 'Planner',
              avatar: effectiveUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              color: effectiveUser.color || '#FF6B45',
              status: 'online',
              joinedAt: new Date().toISOString(),
            };

            const updatedTrip = await dataService.addMemberToTrip(tripId, newMemberObj);

            // Record event
            await dataService.recordEvent({
              tripId,
              type: 'trip.member.joined',
              actorId: newMemberObj.id,
              metadata: { name: newMemberObj.name, role: newMemberObj.role },
            });

            const joinMsg = {
              id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tripId,
              senderId: 'system',
              senderName: 'Trip Concierge',
              senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              text: `${newMemberObj.name} joined the trip room as ${newMemberObj.role}! 🎉`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            };

            io.to(`trip_${tripId}`).emit('member_joined', { trip: updatedTrip, newMember: newMemberObj });
            io.to(`trip_${tripId}`).emit('new_message', { message: joinMsg });
          }
        }

        // Broadcast active collaborators in this trip
        const activeUsers = Array.from(roomPresences.get(tripId).values());
        io.to(`trip_${tripId}`).emit('presence_sync', {
          tripId,
          activeUsers,
          joinedUser: effectiveUser,
        });

        if (callback) callback({ success: true, activeUsers });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // -----------------------------------------------------------
    // 2. Optimistic Concurrency Board & Drag-and-Drop Update (PRD Feature 1)
    // -----------------------------------------------------------
    socket.on('trip.board.update', async (payload, callback) => {
      const { tripId, itemId, dayNumber, dayIndex, startTime, endTime, lifecycleStage, positionVersion } = payload;

      // 1. RBAC authorization: Planners, Leaders, Admins only (Viewers rejected!)
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        const errorMsg = authCheck.error;
        socket.emit('trip.error', { event: 'trip.board.update', message: errorMsg });
        if (callback) callback({ success: false, error: errorMsg, conflict: false });
        return;
      }

      // 2. Concurrency check & Atomic version update via dataService
      const result = await dataService.updateItemWithConcurrency(tripId, itemId, {
        dayNumber,
        dayIndex,
        startTime,
        endTime,
        lifecycleStage,
        positionVersion,
      });

      if (!result.success) {
        if (result.conflict) {
          await dataService.recordEvent({
            tripId,
            type: 'conflict.flagged',
            actorId: socket.user.id,
            metadata: { itemId, serverVersion: result.currentServerVersion, clientVersion },
          });

          // Notify losing client with conflict details
          socket.emit('trip.board.conflict', {
            tripId,
            itemId,
            conflict: true,
            currentServerVersion: result.currentServerVersion,
            authoritativeItem: result.authoritativeItem,
            authoritativeTrip: result.authoritativeTrip,
            message: result.error,
          });

          if (callback) {
            callback({
              success: false,
              conflict: true,
              error: result.error,
              currentServerVersion: result.currentServerVersion,
              authoritativeItem: result.authoritativeItem,
              authoritativeTrip: result.authoritativeTrip,
            });
          }
          return;
        }

        if (callback) callback({ success: false, error: result.error });
        return;
      }

      // 3. Accepted update: Record event
      await dataService.recordEvent({
        tripId,
        type: 'itinerary.item.reordered',
        actorId: socket.user.id,
        metadata: { itemId, newVersion: result.newVersion },
      });

      // 4. Broadcast accepted update to ALL other members in the trip room
      socket.to(`trip_${tripId}`).emit('trip.board.updated', {
        tripId,
        itemId,
        item: result.item,
        trip: result.trip,
        newVersion: result.newVersion,
        updatedBy: socket.user,
      });

      socket.to(`trip_${tripId}`).emit('itinerary_synced', {
        trip: result.trip,
        changeDescription: `Activity "${result.item.title}" reordered to v${result.newVersion}`,
        updatedBy: socket.user,
      });

      if (callback) {
        callback({
          success: true,
          item: result.item,
          trip: result.trip,
          newVersion: result.newVersion,
        });
      }
    });

    // -----------------------------------------------------------
    // 3. Itinerary Change (Legacy event compatibility)
    // -----------------------------------------------------------
    socket.on('itinerary_change', async ({ tripId, trip, changeDescription }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'itinerary_change', message: authCheck.error });
        return;
      }

      if (trip) {
        await dataService.updateTrip(tripId, trip);
      }

      socket.to(`trip_${tripId}`).emit('itinerary_synced', {
        trip,
        changeDescription,
        updatedBy: socket.user,
      });
    });

    // -----------------------------------------------------------
    // 4. Cast Vote on Activity (Consensus Up/Down)
    // -----------------------------------------------------------
    socket.on('cast_vote', async ({ tripId, itemId, votes, status }) => {
      // Viewers CAN vote!
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Viewer', 'Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'cast_vote', message: authCheck.error });
        return;
      }

      const voter = socket.user || { id: 'voter', name: 'Traveler' };

      await dataService.recordEvent({
        tripId,
        type: 'vote.cast',
        actorId: voter.id,
        metadata: { itemId, status },
      });

      io.to(`trip_${tripId}`).emit('vote_recorded', {
        itemId,
        votes,
        status,
        user: voter,
      });
    });

    // -----------------------------------------------------------
    // 5. Send Chat Message & Typing
    // -----------------------------------------------------------
    socket.on('send_message', async ({ tripId, message }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Viewer', 'Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'send_message', message: authCheck.error });
        return;
      }

      const safeMessage = {
        ...message,
        senderId: socket.user?.id || message.senderId,
        senderName: socket.user?.name || message.senderName,
      };

      const trip = await dataService.getTripById(tripId);
      if (trip) {
        if (!trip.chat) trip.chat = [];
        trip.chat.push(safeMessage);
        await dataService.updateTrip(tripId, { chat: trip.chat });
      }

      io.to(`trip_${tripId}`).emit('new_message', { message: safeMessage });
    });

    socket.on('typing_status', ({ tripId, isTyping }) => {
      socket.to(`trip_${tripId}`).emit('user_typing', {
        user: socket.user || socket.userData,
        isTyping,
      });
    });

    socket.on('message_reaction', async ({ tripId, messageId, emoji }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Viewer', 'Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) return;

      const user = socket.user || socket.userData;
      const trip = await dataService.getTripById(tripId);
      let updatedReactions = null;

      if (trip && trip.chat) {
        const msg = trip.chat.find(m => m.id === messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

          const existingUserIdx = msg.reactions[emoji].findIndex(
            u => (typeof u === 'string' ? u : u.id) === user.id
          );
          if (existingUserIdx >= 0) {
            msg.reactions[emoji].splice(existingUserIdx, 1);
            if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
          } else {
            msg.reactions[emoji].push({ id: user.id, name: user.name });
          }
          updatedReactions = msg.reactions;
          await dataService.updateTrip(tripId, { chat: trip.chat });
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

    // -----------------------------------------------------------
    // 6. Contested-Slot Timed Duel Vote (PRD Section 6.2 & 7.3.4)
    // -----------------------------------------------------------
    socket.on('trip.vote.open', async (payload) => {
      const { tripId, duelId, title, slotKey, dayNumber, candidateItems, durationSeconds = 60 } = payload;
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'trip.vote.open', message: authCheck.error });
        return;
      }

      const closesAt = Date.now() + durationSeconds * 1000;
      const duel = {
        duelId: duelId || `duel-${Date.now()}`,
        tripId,
        title: title || 'Contested Slot Duel',
        slotKey,
        dayNumber,
        candidateItems,
        durationSeconds,
        closesAt,
        votes: {},
        status: 'active',
        openedBy: socket.user || socket.userData,
      };

      if (!store.activeDuels) store.activeDuels = new Map();
      store.activeDuels.set(duel.duelId, duel);

      await dataService.recordEvent({
        tripId,
        type: 'vote.opened',
        actorId: socket.user?.id || 'lead',
        metadata: { duelId: duel.duelId, title: duel.title },
      });

      io.to(`trip_${tripId}`).emit('trip.vote.opened', duel);

      setTimeout(() => {
        resolveDuelVote(io, tripId, duel.duelId);
      }, durationSeconds * 1000);
    });

    socket.on('trip.vote.cast', async ({ tripId, duelId, choiceItemId }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Viewer', 'Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) return;

      if (!store.activeDuels) return;
      const duel = store.activeDuels.get(duelId);
      if (!duel || duel.status !== 'active') return;

      const user = socket.user || socket.userData;
      duel.votes[user.id] = {
        choiceItemId,
        userName: user.name,
        userAvatar: user.avatar,
        castAt: Date.now(),
      };

      await dataService.recordEvent({
        tripId,
        type: 'vote.cast',
        actorId: user.id,
        metadata: { duelId, choiceItemId },
      });

      io.to(`trip_${tripId}`).emit('trip.vote.cast_recorded', {
        duelId,
        votes: duel.votes,
        voter: { userId: user.id, userName: user.name, choiceItemId },
      });
    });

    socket.on('trip.vote.resolve', async ({ tripId, duelId }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'trip.vote.resolve', message: 'Only Trip Leader can force resolve duel votes.' });
        return;
      }
      resolveDuelVote(io, tripId, duelId);
    });

    // -----------------------------------------------------------
    // 7. Budget Updates (Feature 3)
    // -----------------------------------------------------------
    socket.on('budget_change', async ({ tripId, budget, expense }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Planner', 'Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'budget_change', message: authCheck.error });
        return;
      }

      const trip = await dataService.getTripById(tripId);
      if (trip && budget) {
        trip.budget = budget;
        await dataService.updateTrip(tripId, { budget });
      }

      const reconciledBudget = BudgetEngine.reconcileTripBudget(trip);

      io.to(`trip_${tripId}`).emit('budget_synced', {
        budget: reconciledBudget,
        expense,
        user: socket.user,
      });
    });

    // -----------------------------------------------------------
    // 8. Real-time Canvas Sync Drift Ping/Pong (PRD §1.3 & §7.3.4)
    // -----------------------------------------------------------
    socket.on('trip.sync.ping', ({ clientSentAt }) => {
      socket.emit('trip.sync.pong', {
        clientSentAt,
        serverReceivedAt: Date.now(),
      });
    });

    // -----------------------------------------------------------
    // 9. Trip Leader Moderation: Transfer Leader Role (PRD §6.1)
    // -----------------------------------------------------------
    socket.on('trip.leader.transfer', async ({ tripId, newLeaderId, newLeaderName }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'trip.leader.transfer', message: 'Only current Trip Leader can transfer leadership.' });
        return;
      }

      const trip = await dataService.getTripById(tripId);
      if (trip) {
        trip.leaderUserId = newLeaderId;
        if (trip.members) {
          trip.members.forEach(m => {
            if (m.id === newLeaderId) m.role = 'Leader';
            else if (m.role === 'Leader') m.role = 'Planner';
          });
        }
        await dataService.updateTrip(tripId, { leaderUserId: newLeaderId, members: trip.members });

        await dataService.recordEvent({
          tripId,
          type: 'trip.leader.transferred',
          actorId: socket.user.id,
          metadata: { newLeaderId, newLeaderName },
        });
      }

      io.to(`trip_${tripId}`).emit('trip.leader.transferred', {
        tripId,
        newLeaderId,
        newLeaderName,
        trip,
      });
    });

    // -----------------------------------------------------------
    // 10. Trip Leader Moderation: Lock Room / Workspace (PRD §6.1)
    // -----------------------------------------------------------
    socket.on('trip.room.lock_toggle', async ({ tripId, isLocked }) => {
      const authCheck = await authorizeSocketTripAction(socket, tripId, ['Leader', 'Admin']);
      if (!authCheck.authorized) {
        socket.emit('trip.error', { event: 'trip.room.lock_toggle', message: 'Only Trip Leader can lock the room.' });
        return;
      }

      const trip = await dataService.updateTrip(tripId, { isRoomLocked: Boolean(isLocked) });

      await dataService.recordEvent({
        tripId,
        type: isLocked ? 'trip.locked' : 'trip.unlocked',
        actorId: socket.user.id,
        metadata: { isLocked },
      });

      io.to(`trip_${tripId}`).emit('trip.room.lock_updated', {
        tripId,
        isRoomLocked: Boolean(isLocked),
        toggledBy: socket.user,
      });
    });

    // -----------------------------------------------------------
    // 11. Disconnect / Leave + Leader Disconnect Alert (PRD §6.1)
    // -----------------------------------------------------------
    socket.on('disconnect', async () => {
      if (socket.tripId && roomPresences.has(socket.tripId)) {
        roomPresences.get(socket.tripId).delete(socket.id);
        const activeUsers = Array.from(roomPresences.get(socket.tripId).values());

        io.to(`trip_${socket.tripId}`).emit('presence_sync', {
          tripId: socket.tripId,
          activeUsers,
          leftUser: socket.userData || socket.user,
        });

        const trip = await dataService.getTripById(socket.tripId);
        const leaderId = trip?.leaderUserId || trip?.creatorId || trip?.members?.[0]?.id;
        const currentUserId = socket.user?.id || socket.userData?.id;

        if (currentUserId && currentUserId === leaderId) {
          const isLeaderStillInRoom = activeUsers.some(u => u.id === leaderId);
          if (!isLeaderStillInRoom) {
            io.to(`trip_${socket.tripId}`).emit('trip.leader.status', {
              tripId: socket.tripId,
              isLeaderConnected: false,
              leader: socket.user || socket.userData,
              message: 'Trip Leader disconnected. Lock and finalize operations are temporarily frozen.',
            });
          }
        }
      }
    });
  });
}

async function resolveDuelVote(io, tripId, duelId) {
  if (!store.activeDuels) return;
  const duel = store.activeDuels.get(duelId);
  if (!duel || duel.status === 'resolved') return;

  duel.status = 'resolved';

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

  const trip = await dataService.getTripById(tripId);
  if (trip && trip.days) {
    const day = trip.days.find(d => d.dayNumber === duel.dayNumber);
    if (day) {
      const winner = day.items.find(i => i.id === winningItem.id);
      if (winner) {
        winner.status = 'locked';
        winner.lifecycleStage = 'locked';
        winner.positionVersion = (winner.positionVersion || 1) + 1;
      }
      duel.candidateItems.forEach(ci => {
        if (ci.id !== winningItem.id) {
          const loser = day.items.find(i => i.id === ci.id);
          if (loser) {
            loser.status = 'drafting';
            loser.lifecycleStage = 'drafting';
          }
        }
      });
      await dataService.updateTrip(tripId, { days: trip.days });
    }
  }

  await dataService.recordEvent({
    tripId,
    type: 'vote.resolved',
    actorId: 'system',
    metadata: { duelId, winningItemId: winningItem.id, title: winningItem.title },
  });

  io.to(`trip_${tripId}`).emit('trip.vote.resolved', {
    duelId,
    winningItem,
    tallies,
    trip,
  });
}
