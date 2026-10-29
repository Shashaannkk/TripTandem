import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { INITIAL_TRIP } from '../data/mockData';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { BudgetEngine } from '../utils/budgetEngine';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const { currentUser, showToast } = useAuth();
  const [trip, setTrip] = useState(() => {
    const saved = localStorage.getItem('tt_active_trip');
    return saved ? JSON.parse(saved) : INITIAL_TRIP;
  });

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isAiConciergeOpen, setIsAiConciergeOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);

  // PRD Real-Time Metrics & Moderation States
  const [syncDriftMs, setSyncDriftMs] = useState(38);
  const [connectionQuality, setConnectionQuality] = useState('fast'); // 'fast' | 'good' | 'slow'
  const [isLeaderConnected, setIsLeaderConnected] = useState(true);
  const [leaderStatusMessage, setLeaderStatusMessage] = useState('');
  const [activeDuelVote, setActiveDuelVote] = useState(null);

  // Initialize Socket.IO connection (Live production & local aware)
  useEffect(() => {
    const envSocketUrl = import.meta.env?.VITE_SOCKET_URL;
    const envApiUrl = import.meta.env?.VITE_API_URL;
    let socketTarget = undefined;

    if (envSocketUrl && typeof envSocketUrl === 'string' && envSocketUrl.trim() !== '') {
      socketTarget = envSocketUrl.trim().replace(/\/+$/, '');
    } else if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.startsWith('http')) {
      socketTarget = envApiUrl.trim().replace(/\/api\/?$/, '');
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      socketTarget = 'http://localhost:3001';
    }

    const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');

    const newSocket = io(socketTarget || undefined, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      auth: {
        token: token || undefined,
      },
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Cross-Tab Broadcast Helper (0ms latency local synchronization across windows/tabs)
  const broadcastSync = (data) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('triptandem_live_sync');
        bc.postMessage(data);
        bc.close();
      }
    } catch (e) {}
  };

  // Cross-Tab BroadcastChannel Listener
  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('triptandem_live_sync');

        channel.onmessage = (event) => {
          const { type, tripId, message, newMember, trip: broadcastTrip, changeDescription, updatedBy } = event.data || {};
          if (tripId && trip?.id && tripId !== trip.id) return;

          if (type === 'NEW_CHAT_MESSAGE' && message) {
            setTrip(prev => {
              if (!prev) return prev;
              const chat = prev.chat || [];
              if (chat.some(m => m.id === message.id)) return prev;
              return { ...prev, chat: [...chat, message] };
            });

            if (message.senderId !== currentUser?.id) {
              if (message.isSystem) {
                showToast(`✨ ${message.text}`, 'info');
              } else {
                showToast(`💬 ${message.senderName || 'Traveler'}: ${message.text?.slice(0, 45) || 'New message'}`, 'info');
              }
            }
          }

          if (type === 'MEMBER_JOINED') {
            if (broadcastTrip) {
              setTrip(broadcastTrip);
            } else if (newMember) {
              setTrip(prev => {
                if (!prev) return prev;
                const exists = (prev.members || []).some(m => m.id === newMember.id);
                if (exists) return prev;
                return { ...prev, members: [...(prev.members || []), newMember] };
              });
            }
            if (newMember && newMember.id !== currentUser?.id) {
              showToast(`🎉 ${newMember.name} joined the trip room as ${newMember.role || 'Planner'}!`, 'success');
              try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
            }
          }

          if (type === 'ITINERARY_SYNC' && broadcastTrip) {
            setTrip(broadcastTrip);
            if (updatedBy && updatedBy.id !== currentUser?.id) {
              showToast(`${updatedBy.name}: ${changeDescription || 'Updated itinerary'}`, 'info');
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel sync init:', e);
    }

    return () => {
      if (channel) channel.close();
    };
  }, [trip?.id, currentUser?.id]);

  // Reflect logged-in user (Google account name, avatar, email) across trip members and expense splits
  useEffect(() => {
    if (!currentUser) return;
    setTrip((prev) => {
      if (!prev || !prev.members) return prev;
      const index = prev.members.findIndex(
        (m) => m.id === currentUser.id || m.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      if (index >= 0) {
        const updated = [...prev.members];
        updated[index] = { ...updated[index], ...currentUser };
        return { ...prev, members: updated };
      } else {
        const otherMembers = prev.members.filter((m) => m.id !== 'user-alex');
        return {
          ...prev,
          members: [{ ...currentUser, role: 'Owner' }, ...otherMembers],
        };
      }
    });
  }, [currentUser]);

  // Sync Trip Room on Socket
  useEffect(() => {
    if (!socket || !trip?.id || !currentUser) return;

    socket.emit('join_trip', { tripId: trip.id, user: currentUser });

    const handlePresence = ({ activeUsers, joinedUser, leftUser }) => {
      if (activeUsers) setActiveCollaborators(activeUsers);
      if (joinedUser && joinedUser.id !== currentUser?.id) {
        showToast(`${joinedUser.name} joined the trip workspace 👋`, 'info');
        setTrip(prev => {
          if (!prev || !prev.members) return prev;
          const exists = prev.members.some(
            m => (m.id && joinedUser.id && m.id === joinedUser.id) ||
                 (m.email && joinedUser.email && m.email.toLowerCase() === joinedUser.email.toLowerCase())
          );
          if (!exists) {
            const newM = {
              id: joinedUser.id || `user-${Date.now().toString(36)}`,
              name: joinedUser.name || 'Traveler',
              email: joinedUser.email || '',
              role: joinedUser.role || 'Planner',
              avatar: joinedUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              color: joinedUser.color || '#FF6B45',
              status: 'online',
            };
            return {
              ...prev,
              members: [...prev.members, newM],
            };
          }
          return prev;
        });
      }
    };

    const handleItinerarySynced = ({ trip: syncedTrip, changeDescription, updatedBy }) => {
      if (syncedTrip) {
        setTrip(syncedTrip);
        if (updatedBy && updatedBy.id !== currentUser?.id) {
          showToast(`${updatedBy.name}: ${changeDescription || 'Updated itinerary'}`, 'info');
        }
      }
    };

    const handleVoteRecorded = ({ itemId, votes, status, user }) => {
      setTrip(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        for (const day of next.days) {
          const item = day.items.find(i => i.id === itemId);
          if (item) {
            item.votes = votes;
            item.status = status;
            break;
          }
        }
        return next;
      });

      if (status === 'locked') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FF6B45', '#2A9D8F', '#FFC857'],
        });
      }
    };

    const handleNewMessage = ({ message }) => {
      if (!message || !message.id) return;
      setTrip(prev => {
        if (!prev) return prev;
        const chat = prev.chat || [];
        if (chat.some(m => m.id === message.id)) return prev;
        return {
          ...prev,
          chat: [...chat, message],
        };
      });

      if (message.senderId !== currentUser?.id) {
        if (message.isSystem) {
          showToast(`✨ ${message.text}`, 'info');
        } else {
          showToast(`💬 ${message.senderName || 'Traveler'}: ${message.text?.slice(0, 45) || 'New message'}`, 'info');
        }
      }
    };

    const handleTyping = ({ user, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.some(u => u.id === user.id) ? prev : [...prev, user];
        } else {
          return prev.filter(u => u.id !== user.id);
        }
      });
    };

    const handleBudgetSynced = ({ budget, user }) => {
      if (budget) {
        setTrip(prev => ({
          ...prev,
          budget: {
            ...prev?.budget,
            ...budget,
            expenses: (budget.expenses && budget.expenses.length > 0)
              ? budget.expenses
              : (prev?.budget?.expenses || []),
          },
        }));
        if (user && user.id !== currentUser?.id) {
          showToast(`${user.name} recorded an expense 💳`, 'info');
        }
      }
    };

    const handleReactionSynced = ({ messageId, emoji, user, reactions }) => {
      setTrip(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const msg = (next.chat || []).find(m => m.id === messageId);
        if (msg) {
          if (reactions) {
            msg.reactions = reactions;
          } else {
            if (!msg.reactions) msg.reactions = {};
            if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
            const existingIdx = msg.reactions[emoji].findIndex(u => (typeof u === 'string' ? u : u.id) === user.id);
            if (existingIdx >= 0) {
              msg.reactions[emoji].splice(existingIdx, 1);
              if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
            } else {
              msg.reactions[emoji].push({ id: user.id, name: user.name });
            }
          }
        }
        return next;
      });
    };

    const handleMemberJoined = ({ trip: syncedTrip, newMember }) => {
      if (syncedTrip) {
        setTrip(syncedTrip);
      } else if (newMember) {
        setTrip(prev => {
          if (!prev) return prev;
          const members = prev.members || [];
          const exists = members.some(
            m => (m.id && newMember.id && m.id === newMember.id) ||
                 (m.email && newMember.email && m.email.toLowerCase() === newMember.email.toLowerCase())
          );
          if (exists) return prev;
          return {
            ...prev,
            members: [...members, newMember],
          };
        });
      }
      if (newMember && newMember.id !== currentUser?.id) {
        showToast(`🎉 ${newMember.name} joined the trip room as ${newMember.role || 'Planner'}!`, 'success');
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }
    };

    // PRD Latency Pong Handler
    const handlePong = ({ clientSentAt, serverReceivedAt }) => {
      const now = Date.now();
      const drift = Math.max(15, now - clientSentAt);
      setSyncDriftMs(drift);
      if (drift < 75) setConnectionQuality('fast');
      else if (drift < 150) setConnectionQuality('good');
      else setConnectionQuality('slow');
    };

    // PRD Leader Disconnect Handler
    const handleLeaderStatus = ({ isLeaderConnected: connected, message }) => {
      setIsLeaderConnected(connected);
      setLeaderStatusMessage(message || '');
      if (!connected) {
        showToast('⚠️ Trip Leader is offline — finalizing actions temporarily frozen', 'warning');
      } else {
        showToast('👑 Trip Leader is back online in the workspace', 'info');
      }
    };

    const handleLeaderTransferred = ({ newLeaderName, trip: updatedTrip }) => {
      if (updatedTrip) setTrip(updatedTrip);
      showToast(`👑 Leadership transferred to ${newLeaderName}!`, 'info');
    };

    const handleRoomLockUpdated = ({ isRoomLocked }) => {
      setTrip(prev => ({ ...prev, isRoomLocked }));
      showToast(isRoomLocked ? '🔒 Workspace locked by leader' : '🔓 Workspace unlocked', 'info');
    };

    // PRD Contested Slot Duel Handlers
    const handleDuelOpened = (duel) => {
      setActiveDuelVote(duel);
      showToast(`⚔️ Contested Slot Duel opened: ${duel.title}`, 'info');
    };

    const handleDuelCast = ({ duelId, votes }) => {
      setActiveDuelVote(prev => {
        if (!prev || prev.duelId !== duelId) return prev;
        return { ...prev, votes };
      });
    };

    const handleDuelResolved = ({ duelId, winningItem, tallies, trip: updatedTrip }) => {
      setActiveDuelVote(prev => (prev?.duelId === duelId ? { ...prev, status: 'resolved', winningItem, tallies } : prev));
      if (updatedTrip) setTrip(updatedTrip);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
      showToast(`🏆 Duel resolved: "${winningItem?.title}" won and is locked!`, 'success');
      setTimeout(() => {
        setActiveDuelVote(null);
      }, 5000);
    };

    // Start 4-second drift measurement ping
    const pingInterval = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('trip.sync.ping', { clientSentAt: Date.now() });
      }
    }, 4000);

    const handleBoardUpdated = ({ itemId, item, trip: updatedTrip, updatedBy }) => {
      if (updatedTrip) {
        setTrip(updatedTrip);
      }
      if (updatedBy?.id !== currentUser?.id) {
        showToast(`🔄 ${updatedBy?.name || 'A collaborator'} moved "${item?.title || 'an activity'}"`, 'info');
      }
    };

    const handleBoardConflict = (data) => {
      showToast(`⚠️ Conflict: Activity was modified by another collaborator. Reconciling...`, 'error');
      if (data?.authoritativeTrip) {
        setTrip(data.authoritativeTrip);
      }
    };

    const handleTripError = (err) => {
      showToast(`⚠️ ${err.message || 'Operation forbidden'}`, 'error');
    };

    socket.on('presence_sync', handlePresence);
    socket.on('itinerary_synced', handleItinerarySynced);
    socket.on('trip.board.updated', handleBoardUpdated);
    socket.on('trip.board.conflict', handleBoardConflict);
    socket.on('trip.error', handleTripError);
    socket.on('vote_recorded', handleVoteRecorded);
    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('budget_synced', handleBudgetSynced);
    socket.on('message_reaction_synced', handleReactionSynced);
    socket.on('member_joined', handleMemberJoined);
    socket.on('trip.sync.pong', handlePong);
    socket.on('trip.leader.status', handleLeaderStatus);
    socket.on('trip.leader.transferred', handleLeaderTransferred);
    socket.on('trip.room.lock_updated', handleRoomLockUpdated);
    socket.on('trip.vote.opened', handleDuelOpened);
    socket.on('trip.vote.cast_recorded', handleDuelCast);
    socket.on('trip.vote.resolved', handleDuelResolved);

    return () => {
      clearInterval(pingInterval);
      socket.off('presence_sync', handlePresence);
      socket.off('itinerary_synced', handleItinerarySynced);
      socket.off('trip.board.updated', handleBoardUpdated);
      socket.off('trip.board.conflict', handleBoardConflict);
      socket.off('trip.error', handleTripError);
      socket.off('vote_recorded', handleVoteRecorded);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('budget_synced', handleBudgetSynced);
      socket.off('message_reaction_synced', handleReactionSynced);
      socket.off('member_joined', handleMemberJoined);
      socket.off('trip.sync.pong', handlePong);
      socket.off('trip.leader.status', handleLeaderStatus);
      socket.off('trip.leader.transferred', handleLeaderTransferred);
      socket.off('trip.room.lock_updated', handleRoomLockUpdated);
      socket.off('trip.vote.opened', handleDuelOpened);
      socket.off('trip.vote.cast_recorded', handleDuelCast);
      socket.off('trip.vote.resolved', handleDuelResolved);
    };
  }, [socket, trip?.id, currentUser]);

  // Persist trip to localStorage
  useEffect(() => {
    if (trip) {
      localStorage.setItem('tt_active_trip', JSON.stringify(trip));
    }
  }, [trip]);

  // Multi-tab storage sync (updates tabs on same browser profile)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tt_active_trip' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id) {
            setTrip(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Actions
  const castVote = (itemId, voteType = 'up') => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let targetItem = null;

      for (const day of next.days) {
        const item = day.items.find(i => i.id === itemId);
        if (item) {
          targetItem = item;
          break;
        }
      }

      if (!targetItem) return prev;

      if (!targetItem.votes) targetItem.votes = { up: [], down: [] };

      const userId = currentUser.id;
      if (voteType === 'up') {
        if (targetItem.votes.up.includes(userId)) {
          targetItem.votes.up = targetItem.votes.up.filter(id => id !== userId);
        } else {
          targetItem.votes.up.push(userId);
          targetItem.votes.down = targetItem.votes.down.filter(id => id !== userId);
        }
      } else {
        if (targetItem.votes.down.includes(userId)) {
          targetItem.votes.down = targetItem.votes.down.filter(id => id !== userId);
        } else {
          targetItem.votes.down.push(userId);
          targetItem.votes.up = targetItem.votes.up.filter(id => id !== userId);
        }
      }

      // Check lock threshold (3 out of 4 members or 75%)
      const threshold = Math.ceil((next.members.length || 4) * 0.75);
      const isLocked = targetItem.votes.up.length >= threshold;
      targetItem.status = isLocked ? 'locked' : targetItem.votes.up.length > 0 ? 'voting' : 'drafting';

      if (isLocked) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#FF6B45', '#2A9D8F', '#FFC857'],
        });
        showToast(`🎉 "${targetItem.title}" reached consensus and was LOCKED!`, 'success');
      }

      // Emit socket event
      if (socket) {
        socket.emit('cast_vote', {
          tripId: next.id,
          itemId,
          votes: targetItem.votes,
          status: targetItem.status,
          user: currentUser,
        });
      }

      return next;
    });
  };

  const addActivity = (dayNumber, timeSlot, activityData) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const day = next.days.find(d => d.dayNumber === dayNumber);
      if (!day) return prev;

      const newItem = {
        id: `item-${Date.now().toString(36)}`,
        timeSlot: timeSlot || 'afternoon',
        startTime: activityData.startTime || '02:00 PM',
        duration: activityData.duration || '2h',
        title: activityData.title || 'New Activity',
        venueId: activityData.venueId || null,
        venueName: activityData.venueName || activityData.title,
        category: activityData.category || 'experience',
        image: activityData.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
        costPerPerson: Number(activityData.costPerPerson) || 0,
        location: activityData.location || next.destination,
        source: activityData.source || 'user',
        status: 'drafting',
        votes: { up: [currentUser.id], down: [] },
        notes: activityData.notes || '',
      };

      day.items.push(newItem);

      // Rebalance category budget
      if (newItem.costPerPerson > 0) {
        const cat = newItem.category === 'stay' ? 'accommodation' : newItem.category === 'restaurant' ? 'food' : 'activities';
        next.budget.categories[cat] = (next.budget.categories[cat] || 0) + (newItem.costPerPerson * (next.members.length || 1));
      }

      if (socket) {
        socket.emit('itinerary_change', {
          tripId: next.id,
          trip: next,
          changeDescription: `Added "${newItem.title}" to Day ${dayNumber}`,
          updatedBy: currentUser,
        });
      }

      showToast(`Added "${newItem.title}" to Day ${dayNumber} as Draft`, 'success');
      return next;
    });
  };

  const updateActivity = (itemId, updates) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const day of next.days) {
        const item = day.items.find(i => i.id === itemId);
        if (item) {
          Object.assign(item, updates);
          break;
        }
      }

      if (socket) {
        socket.emit('itinerary_change', {
          tripId: next.id,
          trip: next,
          changeDescription: `Updated activity details`,
          updatedBy: currentUser,
        });
      }
      return next;
    });
  };

  const removeActivity = (itemId) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let removedName = '';
      for (const day of next.days) {
        const idx = day.items.findIndex(i => i.id === itemId);
        if (idx !== -1) {
          removedName = day.items[idx].title;
          day.items.splice(idx, 1);
          break;
        }
      }

      if (socket) {
        socket.emit('itinerary_change', {
          tripId: next.id,
          trip: next,
          changeDescription: `Removed "${removedName}"`,
          updatedBy: currentUser,
        });
      }
      showToast(`Removed "${removedName}"`, 'info');
      return next;
    });
  };

  const reorderActivity = ({ itemId, dayNumber, targetIndex, positionVersion }) => {
    let currentVersion = positionVersion;
    let targetDayNumber = dayNumber;

    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const day = next.days.find(d => d.dayNumber === dayNumber);
      if (!day || !day.items) return prev;

      const currentIndex = day.items.findIndex(i => i.id === itemId);
      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= day.items.length) return prev;

      const [moved] = day.items.splice(currentIndex, 1);
      currentVersion = currentVersion ?? moved.positionVersion ?? 1;
      moved.positionVersion = (moved.positionVersion || 1) + 1;
      day.items.splice(targetIndex, 0, moved);

      return next;
    });

    if (socket) {
      socket.emit(
        'trip.board.update',
        {
          tripId: trip.id,
          itemId,
          dayNumber: targetDayNumber,
          dayIndex: targetDayNumber - 1,
          positionVersion: currentVersion ?? 1,
        },
        (ack) => {
          if (ack && !ack.success && ack.conflict) {
            showToast('⚠️ Concurrent edit conflict: Activity was modified by another collaborator.', 'error');
            if (ack.authoritativeTrip) {
              setTrip(ack.authoritativeTrip);
            }
          }
        }
      );
    }
  };

  const moveActivityToDay = ({ itemId, fromDayNumber, toDayNumber, targetIndex = 0, positionVersion }) => {
    if (fromDayNumber === toDayNumber) {
      reorderActivity({ itemId, dayNumber: fromDayNumber, targetIndex, positionVersion });
      return;
    }

    let currentVersion = positionVersion;
    let movedItemTitle = '';

    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const fromDay = next.days.find(d => d.dayNumber === fromDayNumber);
      const toDay = next.days.find(d => d.dayNumber === toDayNumber);
      if (!fromDay || !toDay) return prev;

      const idx = fromDay.items.findIndex(i => i.id === itemId);
      if (idx === -1) return prev;

      const [moved] = fromDay.items.splice(idx, 1);
      movedItemTitle = moved.title;
      currentVersion = currentVersion ?? moved.positionVersion ?? 1;
      moved.dayNumber = toDayNumber;
      moved.positionVersion = (moved.positionVersion || 1) + 1;

      if (!toDay.items) toDay.items = [];
      const clampedIdx = Math.max(0, Math.min(targetIndex, toDay.items.length));
      toDay.items.splice(clampedIdx, 0, moved);

      return next;
    });

    showToast(`Moved "${movedItemTitle || 'Activity'}" to Day ${toDayNumber}`, 'info');

    if (socket) {
      socket.emit(
        'trip.board.update',
        {
          tripId: trip.id,
          itemId,
          dayNumber: toDayNumber,
          dayIndex: toDayNumber - 1,
          positionVersion: currentVersion ?? 1,
        },
        (ack) => {
          if (ack && !ack.success && ack.conflict) {
            showToast('⚠️ Concurrent edit conflict: Activity was modified by another collaborator.', 'error');
            if (ack.authoritativeTrip) {
              setTrip(ack.authoritativeTrip);
            }
          }
        }
      );
    }
  };

  const reorderDayItems = (dayNumber, reorderedItems) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const day = next.days.find(d => d.dayNumber === dayNumber);
      if (day) {
        day.items = reorderedItems;
      }
      return next;
    });

    // Determine moved item and its version to sync via trip.board.update
    const currentDay = trip?.days?.find(d => d.dayNumber === dayNumber);
    const firstChanged = reorderedItems.find((item, idx) => currentDay?.items?.[idx]?.id !== item.id);
    const targetIdx = firstChanged ? reorderedItems.findIndex(i => i.id === firstChanged.id) : 0;

    if (firstChanged && socket) {
      socket.emit('trip.board.update', {
        tripId: trip.id,
        itemId: firstChanged.id,
        dayNumber,
        dayIndex: dayNumber - 1,
        positionVersion: firstChanged.positionVersion || 1,
      });
    } else if (socket) {
      socket.emit('itinerary_change', {
        tripId: trip.id,
        trip: { ...trip, days: trip.days.map(d => d.dayNumber === dayNumber ? { ...d, items: reorderedItems } : d) },
        changeDescription: `Reordered activities for Day ${dayNumber}`,
        updatedBy: currentUser,
      });
    }
  };

  const addExpense = (expenseData) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const newExp = {
        id: `exp-${Date.now().toString(36)}`,
        title: expenseData.title,
        category: expenseData.category || 'other',
        amount: Number(expenseData.amount) || 0,
        paidBy: expenseData.paidBy || currentUser.name,
        splitMode: expenseData.splitMode || 'equal',
        splitWith: expenseData.splitWith || next.members.map(m => m.name),
        splits: expenseData.splits || {},
        date: expenseData.date || new Date().toISOString().split('T')[0],
        type: expenseData.type || 'actual',
        receiptUrl: expenseData.receiptUrl || null,
        notes: expenseData.notes || '',
      };

      next.budget.expenses = [...(next.budget.expenses || []), newExp];

      if (socket) {
        socket.emit('budget_change', {
          tripId: next.id,
          budget: next.budget,
          expense: newExp,
          user: currentUser,
        });
      }
      showToast(`Logged expense: ₹${newExp.amount.toLocaleString()} for ${newExp.title}`, 'success');
      return next;
    });
  };

  const sendChatMessage = (text, attachment = null, customSender = null) => {
    if (!text?.trim() && !attachment) return;
    const sender = customSender || {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isAi: false,
    };

    const newMsg = {
      id: `msg-${Date.now().toString(36)}`,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      isAi: !!sender.isAi,
      role: sender.role || null,
      suggestions: sender.suggestions || null,
      text: (text || '').trim(),
      attachment: attachment || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTrip(prev => {
      const next = {
        ...prev,
        chat: [...(prev.chat || []), newMsg],
      };

      // If a bill/expense is attached directly from chat, sync it to trip budget too!
      if (attachment && attachment.type === 'bill' && attachment.amount > 0) {
        const billExp = {
          id: `exp-bill-${Date.now().toString(36)}`,
          title: attachment.title || 'Shared Expense',
          category: attachment.category || 'food',
          amount: Number(attachment.amount) || 0,
          paidBy: attachment.paidBy || currentUser.name,
          splitWith: attachment.splitWith || next.members.map(m => m.name),
          date: new Date().toISOString().split('T')[0],
          type: 'actual',
          receiptUrl: attachment.receiptUrl || null,
          notes: 'Logged directly via Trip Chat',
        };
        next.budget.expenses = [...(next.budget.expenses || []), billExp];
      }

      return next;
    });

    if (socket) {
      socket.emit('send_message', {
        tripId: trip.id,
        message: newMsg,
      });
    }

    // Cross-tab live broadcast
    broadcastSync({
      type: 'NEW_CHAT_MESSAGE',
      tripId: trip.id,
      message: newMsg,
    });
  };

  // Instagram / WhatsApp-style emoji reactions
  const reactToMessage = (messageId, emoji) => {
    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const msg = (next.chat || []).find(m => m.id === messageId);
      if (!msg) return prev;
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

      const userIdx = msg.reactions[emoji].findIndex(u => (typeof u === 'string' ? u : u.id) === currentUser.id);
      if (userIdx >= 0) {
        msg.reactions[emoji].splice(userIdx, 1);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji].push({ id: currentUser.id, name: currentUser.name });
      }
      return next;
    });

    if (socket && trip) {
      socket.emit('message_reaction', {
        tripId: trip.id,
        messageId,
        emoji,
        user: { id: currentUser.id, name: currentUser.name },
      });
    }
  };

  // Add a new member to the trip
  const addMember = (newMember) => {
    if (!newMember || !newMember.name) return;
    setTrip(prev => {
      const exists = prev.members.some(m => m.email?.toLowerCase() === newMember.email?.toLowerCase());
      if (exists) {
        showToast(`${newMember.name} is already a member of this trip`, 'info');
        return prev;
      }

      const memberObj = {
        id: `user-${Date.now().toString(36)}`,
        name: newMember.name,
        email: newMember.email || `${newMember.name.toLowerCase().replace(/\s+/g, '.')}@triptandem.travel`,
        role: newMember.role || 'Explorer',
        avatar: newMember.avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=150&auto=format&fit=crop&q=80`,
        color: newMember.color || '#2A9D8F',
        status: 'online',
      };

      const updated = {
        ...prev,
        members: [...prev.members, memberObj],
      };

      showToast(`Invited ${newMember.name} to ${prev.title}!`, 'success');
      return updated;
    });
  };

  // Join trip with invite code or shared link
  const joinTripByCode = async (inviteCode, requestedRole = 'Planner') => {
    if (!inviteCode || !inviteCode.trim()) {
      showToast('Please enter an invite code to join a trip', 'error');
      return null;
    }
    const cleanCode = inviteCode.trim().toUpperCase();

    // 1. Authoritative Server Join via API
    let targetTrip = null;
    try {
      const serverRes = await api.joinTripByCode(cleanCode, currentUser, requestedRole);
      if (serverRes) {
        targetTrip = serverRes;
      }
    } catch (err) {
      console.warn('Server trip join notification:', err);
    }

    // 2. Local fallback if server unreachable
    if (!targetTrip) {
      targetTrip = { ...trip };
      if (cleanCode === 'TANDEM-GOA-77' || cleanCode.includes('GOA') || (trip && trip.inviteCode && trip.inviteCode.toUpperCase() === cleanCode)) {
        targetTrip = { ...trip, id: trip?.id || 'trip-goa-2026', inviteCode: 'TANDEM-GOA-77' };
      } else {
        const isManali = cleanCode.includes('MAN');
        const isJaipur = cleanCode.includes('JAI');
        const destName = isManali ? 'Manali, Himachal Pradesh' : isJaipur ? 'Jaipur, Rajasthan' : 'Goa, India';
        targetTrip = {
          ...trip,
          id: `trip-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          inviteCode: cleanCode,
          destination: destName,
          title: `${destName.split(',')[0]} Collaborative Crew Escape`,
        };
      }
    }

    const memberName = currentUser?.name || 'Traveler';
    const memberRole = requestedRole || currentUser?.role || 'Planner';
    const newMemberObj = {
      id: currentUser?.id || `user-${Date.now()}`,
      name: memberName,
      email: currentUser?.email || 'traveler@triptandem.travel',
      role: memberRole,
      avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      color: '#FF6B45',
      status: 'online',
    };

    const alreadyMember = (targetTrip.members || []).some(
      m => m.id === newMemberObj.id || (m.email && m.email === newMemberObj.email)
    );

    if (!alreadyMember) {
      targetTrip = {
        ...targetTrip,
        members: [...(targetTrip.members || []), newMemberObj],
      };
    }

    // Create system join message and push to chat
    const joinMsg = {
      id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: targetTrip.id,
      senderId: 'system',
      senderName: 'Trip Concierge',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: `${memberName} joined the trip room as ${memberRole}! 🎉 Let's collaborate.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    };

    if (!targetTrip.chat) targetTrip.chat = [];
    if (!targetTrip.chat.some(m => m.id === joinMsg.id || (m.isSystem && m.text?.includes(memberName)))) {
      targetTrip.chat.push(joinMsg);
    }

    setTrip(targetTrip);
    localStorage.setItem('tt_active_trip', JSON.stringify(targetTrip));

    // Emit live socket events
    if (socket) {
      socket.emit('join_trip', { tripId: targetTrip.id, user: currentUser });
      socket.emit('member_join', { tripId: targetTrip.id, member: newMemberObj, trip: targetTrip });
      socket.emit('send_message', { tripId: targetTrip.id, message: joinMsg });
      socket.emit('itinerary_change', {
        tripId: targetTrip.id,
        trip: targetTrip,
        changeDescription: `${memberName} joined the trip room`,
        updatedBy: currentUser,
      });
    }

    // Cross-tab broadcast for dual-window local collaboration
    broadcastSync({
      type: 'MEMBER_JOINED',
      tripId: targetTrip.id,
      newMember: newMemberObj,
      trip: targetTrip,
    });
    broadcastSync({
      type: 'NEW_CHAT_MESSAGE',
      tripId: targetTrip.id,
      message: joinMsg,
    });

    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    showToast(`🎉 Joined "${targetTrip.title}" as ${memberName}!`, 'success');
    return targetTrip;
  };

  // Trip Leader Moderation: Update member role (Planner vs Viewer)
  const updateMemberRole = async (memberId, newRole) => {
    try {
      await api.updateMemberRole(trip.id, memberId, newRole);
    } catch (e) {}

    setTrip(prev => {
      const updated = {
        ...prev,
        members: (prev.members || []).map(m => m.id === memberId ? { ...m, role: newRole } : m)
      };
      if (socket) {
        socket.emit('itinerary_change', {
          tripId: prev.id,
          trip: updated,
          changeDescription: `Updated role of member to ${newRole}`,
          updatedBy: currentUser,
        });
      }
      return updated;
    });
    showToast(`Updated role to ${newRole}`, 'success');
  };

  // Trip Leader Moderation: Remove member
  const removeMember = async (memberId) => {
    try {
      await api.removeTripMember(trip.id, memberId);
    } catch (e) {}

    setTrip(prev => {
      const updated = {
        ...prev,
        members: (prev.members || []).filter(m => m.id !== memberId)
      };
      if (socket) {
        socket.emit('itinerary_change', {
          tripId: prev.id,
          trip: updated,
          changeDescription: `Removed member from trip room`,
          updatedBy: currentUser,
        });
      }
      return updated;
    });
    showToast(`Removed member from workspace`, 'info');
  };

  // Contested-Slot Timed Duel Vote Open (PRD Section 6.2 & 7.3.4)
  const openContestedVote = ({ slotKey, dayNumber, candidateItems, durationSeconds = 60, title }) => {
    if (!socket || !trip) return;
    socket.emit('trip.vote.open', {
      tripId: trip.id,
      duelId: `duel-${Date.now()}`,
      title: title || `Duel: ${candidateItems[0]?.title} vs ${candidateItems[1]?.title}`,
      slotKey,
      dayNumber,
      candidateItems,
      durationSeconds,
      openedBy: currentUser,
    });
  };

  // Cast Duel Vote
  const castDuelVote = (duelId, choiceItemId) => {
    if (!socket || !trip || !currentUser) return;
    socket.emit('trip.vote.cast', {
      tripId: trip.id,
      duelId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      choiceItemId,
    });
  };

  // Resolve Duel Vote
  const resolveContestedVote = (duelId) => {
    if (!socket || !trip) return;
    socket.emit('trip.vote.resolve', { tripId: trip.id, duelId });
  };

  // Trip Leader Moderation: Transfer Host/Leader Role (PRD Section 6.1)
  const transferLeaderRole = (newLeaderId, newLeaderName) => {
    if (!socket || !trip) return;
    socket.emit('trip.leader.transfer', {
      tripId: trip.id,
      newLeaderId,
      newLeaderName,
    });
    setTrip(prev => ({
      ...prev,
      leaderUserId: newLeaderId,
      members: (prev.members || []).map(m => ({
        ...m,
        role: m.id === newLeaderId ? 'Leader' : (m.role === 'Leader' ? 'Planner' : m.role),
      })),
    }));
  };

  // Trip Leader Moderation: Lock Room / Workspace (PRD Section 6.1)
  const toggleRoomLock = (isLocked) => {
    if (!socket || !trip) return;
    socket.emit('trip.room.lock_toggle', {
      tripId: trip.id,
      isLocked,
      toggledBy: currentUser?.name || 'Leader',
    });
    setTrip(prev => ({ ...prev, isRoomLocked: isLocked }));
  };

  // Settle up direct payment between two members with payment proof upload support
  const settleDebt = (fromName, toName, amount, metadata = {}) => {
    addExpense({
      title: `Debt Settlement: ${fromName} paid ${toName}`,
      amount: Number(amount),
      category: 'other',
      paidBy: fromName,
      splitWith: [toName],
      type: 'settlement',
      notes: metadata.notes || (metadata.transactionId ? `Settled via UPI Ref #${metadata.transactionId}` : `Settled direct balance between ${fromName} and ${toName}`),
      receiptUrl: metadata.receiptUrl || metadata.paymentProof || null,
      paymentProof: metadata.paymentProof || metadata.receiptUrl || null,
      transactionId: metadata.transactionId || null,
    });
    showToast(`Marked ₹${amount.toLocaleString()} settled between ${fromName} and ${toName}!`, 'success');
  };

  const emitTyping = (isTyping) => {
    if (socket && trip) {
      socket.emit('typing_status', {
        tripId: trip.id,
        user: currentUser,
        isTyping,
      });
    }
  };

  // Accept AI suggestion into itinerary
  const acceptAiSuggestion = (suggestion, dayNumber = 1) => {
    addActivity(dayNumber, suggestion.proposedTimeSlot || 'afternoon', {
      title: suggestion.title,
      venueId: suggestion.venueId,
      venueName: suggestion.venueName,
      category: suggestion.category || 'experience',
      image: suggestion.image,
      costPerPerson: suggestion.estimatedCostPerPerson,
      location: suggestion.location,
      source: 'ai_suggestion',
      startTime: suggestion.proposedTime,
      duration: suggestion.duration,
      notes: `Recommended by TripTandem AI: ${suggestion.rationale}`,
    });
  };

  // Create or Connect Trip Itinerary directly from Booking or Search Details
  const createTripFromBooking = ({
    venue,
    destination = 'Goa',
    checkIn,
    checkOut,
    guests = 4,
    rooms = 1,
    totalAmount = 0,
  }) => {
    const destName = destination || venue?.destination || 'Goa';
    const title = venue ? `${venue.name} & ${destName} Escape` : `${destName} Collaborative Trip`;
    const tripId = `trip-${destName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString(36)}`;

    // Generate dates
    const checkInDate = checkIn ? new Date(checkIn) : new Date();
    const checkOutDate = checkOut ? new Date(checkOut) : new Date(checkInDate.getTime() + 3 * 86400000);
    const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / 86400000));

    const numGuests = Number(guests) || 4;
    const stayCost = totalAmount || (venue ? venue.price * nights : 16000);

    const newTrip = {
      id: tripId,
      title,
      destination: destName,
      dates: `${checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      daysCount: Math.min(nights, 5),
      partySize: numGuests,
      coverImage: venue?.coverImage || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80',
      members: [
        currentUser,
        ...(trip?.members?.filter(m => m.id !== currentUser.id) || []).slice(0, Math.max(1, numGuests - 1)),
      ],
      inviteCode: `TANDEM-${destName.toUpperCase().slice(0, 3)}-${Math.floor(10 + Math.random() * 90)}`,
      activeDayIndex: 0,
      budget: {
        totalTarget: Math.round(stayCost * 2),
        currency: 'INR',
        splitMode: 'equal',
        categories: {
          accommodation: stayCost,
          food: 8000,
          transport: 4000,
          activities: 6000,
          other: 1500,
        },
        expenses: [
          ...(venue ? [{
            id: `exp-stay-${Date.now().toString(36)}`,
            title: `Stay Booking: ${venue.name} (${nights} nights, ${numGuests} guests)`,
            category: 'accommodation',
            amount: stayCost,
            paidBy: currentUser.name,
            splitWith: [currentUser.name, ...(trip?.members?.map(m => m.name) || []).filter(n => n !== currentUser.name).slice(0, numGuests - 1)],
            date: new Date().toISOString().split('T')[0],
            type: 'actual',
            notes: `Confirmed stay booking at ${venue.name}. Advance registered in trip split.`,
          }] : []),
        ],
      },
      days: Array.from({ length: Math.min(nights, 4) }, (_, i) => {
        const d = new Date(checkInDate.getTime() + i * 86400000);
        return {
          dayNumber: i + 1,
          dateFormatted: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          theme: i === 0 
            ? (venue ? `Arrival & Check-in at ${venue.name}` : `Arrival & Welcome Rhythm`)
            : i === nights - 1 
            ? `Farewell Brunches & Departure`
            : `Exploration & Coastal Adventure`,
          weather: { temp: 29 - i, condition: 'Clear & Pleasant', icon: 'Sun' },
          items: i === 0 && venue ? [
            {
              id: `item-stay-${Date.now().toString(36)}`,
              timeSlot: 'morning',
              startTime: '11:30 AM',
              duration: '1h 30m',
              title: `Check-in: ${venue.name}`,
              venueId: venue.id,
              venueName: venue.name,
              category: 'stay',
              image: venue.coverImage,
              costPerPerson: Math.round(stayCost / numGuests),
              location: venue.region || destName,
              source: 'verified_booking',
              status: 'locked',
              votes: { up: [currentUser.id], down: [] },
              notes: `Confirmed villa booking for ${numGuests} guests. Welcome drinks ready.`,
            },
            {
              id: `item-afternoon-${Date.now().toString(36)}`,
              timeSlot: 'afternoon',
              startTime: '02:00 PM',
              duration: '2h',
              title: `Local Heritage Discovery & Coastal Lunch`,
              category: 'restaurant',
              image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
              costPerPerson: 750,
              location: venue.region || destName,
              source: 'user',
              status: 'voting',
              votes: { up: [currentUser.id], down: [] },
              notes: `Fresh local cuisine and coconut coolers.`,
            },
            {
              id: `item-sunset-${Date.now().toString(36)}`,
              timeSlot: 'evening',
              startTime: '05:30 PM',
              duration: '2h 30m',
              title: `Golden Hour Sunset at Ocean Cliff`,
              category: 'experience',
              image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
              costPerPerson: 300,
              location: destName,
              source: 'user',
              status: 'voting',
              votes: { up: [currentUser.id], down: [] },
              notes: `Catch the golden dusk and seaside breeze.`,
            },
            {
              id: `item-night-${Date.now().toString(36)}`,
              timeSlot: 'night',
              startTime: '09:00 PM',
              duration: '2h',
              title: `Starlight Fireside & Late Night Waves`,
              category: 'restaurant',
              image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
              costPerPerson: 900,
              location: destName,
              source: 'user',
              status: 'drafting',
              votes: { up: [currentUser.id], down: [] },
              notes: `Late night music, fresh grilled seafood and starry skies.`,
            }
          ] : [
            {
              id: `item-day${i}-morning`,
              timeSlot: 'morning',
              startTime: '09:30 AM',
              duration: '2h',
              title: `Morning Coastal Yoga & Acai Bowls`,
              category: 'experience',
              image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
              costPerPerson: 400,
              location: destName,
              source: 'ai_suggestion',
              status: 'voting',
              votes: { up: [currentUser.id], down: [] },
              notes: 'Scenic trail and morning fresh air.',
            },
            {
              id: `item-day${i}-night`,
              timeSlot: 'night',
              startTime: '08:30 PM',
              duration: '2h 30m',
              title: `Assagao Night Courtyard Feast`,
              category: 'restaurant',
              image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=600&auto=format&fit=crop&q=80',
              costPerPerson: 1100,
              location: destName,
              source: 'user',
              status: 'drafting',
              votes: { up: [currentUser.id], down: [] },
              notes: 'Night music and authentic specialties.',
            }
          ]
        };
      }),
    };

    setTrip(newTrip);
    localStorage.setItem('tt_active_trip', JSON.stringify(newTrip));

    if (socket) {
      socket.emit('itinerary_change', {
        tripId: newTrip.id,
        trip: newTrip,
        changeDescription: `Generated collaborative trip itinerary for ${title}`,
        updatedBy: currentUser,
      });
    }

    showToast(`🎉 Generated Trip Itinerary for ${title}!`, 'success');
    return newTrip.id;
  };

  // Conflict Detection Engine
  const conflicts = useMemo(() => {
    if (!trip || !trip.days) return [];
    const list = [];

    trip.days.forEach(day => {
      // 1. Time overlap check
      const items = day.items || [];
      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i];
        const b = items[i + 1];

        // Specific demo conflict: Aguada afternoon vs Lunch overlap
        if (a.title.includes('Aguada') && b.title.includes('Curlies') && a.timeSlot === b.timeSlot) {
          list.push({
            id: `conflict-time-${day.dayNumber}`,
            type: 'time_overlap',
            dayNumber: day.dayNumber,
            title: `Time Overlap on Day ${day.dayNumber}`,
            description: `"${a.title}" ends at 03:30 PM, but "${b.title}" starts at 05:30 PM with zero travel buffer for Goa traffic.`,
            suggestion: 'Shift Curlies sunset booking to 06:00 PM for a relaxed ocean rhythm.',
            actionLabel: 'Auto-adjust Gap (+30m)',
            resolve: () => updateActivity(b.id, { startTime: '06:00 PM' }),
          });
        }
      }

      // 2. Insufficient travel gap between north and south goa
      const hasNorth = items.some(i => (i.location || '').toLowerCase().includes('anjuna') || (i.location || '').toLowerCase().includes('vagator'));
      const hasSouth = items.some(i => (i.location || '').toLowerCase().includes('south') || (i.location || '').toLowerCase().includes('benaulim'));
      if (hasNorth && hasSouth) {
        list.push({
          id: `conflict-travel-${day.dayNumber}`,
          type: 'travel_gap',
          dayNumber: day.dayNumber,
          title: `Heavy Travel Gap on Day ${day.dayNumber}`,
          description: `You have activities in both North Goa and South Goa on the same day. Estimated transit is ~80 minutes each way.`,
          suggestion: 'Group South Goa activities on Day 3 to save 1.5 hours of car travel.',
          actionLabel: 'Group by Region',
          resolve: () => showToast('Region transit optimized!', 'success'),
        });
      }
    });

    // 3. Budget overrun check
    const totalSpent = Object.values(trip.budget.categories || {}).reduce((a, b) => a + b, 0);
    if (totalSpent > trip.budget.totalTarget) {
      const diff = totalSpent - trip.budget.totalTarget;
      list.push({
        id: 'conflict-budget',
        type: 'budget_overrun',
        title: 'Budget Alert',
        description: `Current estimated itinerary total (₹${totalSpent.toLocaleString()}) exceeds target by ₹${diff.toLocaleString()}.`,
        suggestion: 'Review optional evening activities or adjust individual contributions.',
        actionLabel: 'View Budget Breakdown',
        resolve: () => setIsAiConciergeOpen(true),
      });
    }

    return list;
  }, [trip]);

  // Budget calculations with integer-paise zero-sum reconciliation
  const budgetSummary = useMemo(() => {
    if (!trip || !trip.budget) return null;
    return BudgetEngine.reconcileTripBudget(trip);
  }, [trip]);

  return (
    <TripContext.Provider
      value={{
        trip,
        setTrip,
        activeDayIndex,
        setActiveDayIndex,
        activeCollaborators,
        typingUsers,
        isAiConciergeOpen,
        setIsAiConciergeOpen,
        isChatOpen,
        setIsChatOpen,
        isInviteModalOpen,
        setIsInviteModalOpen,
        isJoinModalOpen,
        setIsJoinModalOpen,
        joinTripByCode,
        castVote,
        addActivity,
        updateActivity,
        removeActivity,
        reorderDayItems,
        reorderActivity,
        moveActivityToDay,
        addExpense,
        sendChatMessage,
        reactToMessage,
        emitTyping,
        acceptAiSuggestion,
        conflicts,
        budgetSummary,
        addMember,
        updateMemberRole,
        removeMember,
        settleDebt,
        createTripFromBooking,
        // PRD Newly Added Sync, Duel, and Leader Moderation features
        syncDriftMs,
        connectionQuality,
        isLeaderConnected,
        leaderStatusMessage,
        activeDuelVote,
        setActiveDuelVote,
        openContestedVote,
        castDuelVote,
        resolveContestedVote,
        transferLeaderRole,
        toggleRoomLock,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
