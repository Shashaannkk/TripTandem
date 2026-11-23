import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { INITIAL_TRIP, createBlankTrip } from '../data/mockData';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { BudgetEngine } from '../utils/budgetEngine';
import { 
  publishTripSnapshot, 
  fetchTripSnapshot, 
  broadcastCloudEvent, 
  subscribeCloudRoom 
} from '../services/cloudRelay';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const { currentUser, showToast } = useAuth();

  // Resilient traveler identity fallback (per-tab session isolated for multi-window testing)
  const getActiveUser = useCallback(() => {
    try {
      const sessionSaved = sessionStorage.getItem('tt_traveler_identity');
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        if (parsed && parsed.id && parsed.name) return parsed;
      }
    } catch {}
    if (currentUser && currentUser.id) return currentUser;
    try {
      const saved = localStorage.getItem('tt_traveler_identity');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) return parsed;
      }
    } catch {}
    let guestId = sessionStorage.getItem('tt_guest_id');
    if (!guestId) {
      guestId = `user-guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      sessionStorage.setItem('tt_guest_id', guestId);
    }
    const guestUser = {
      id: guestId,
      name: 'Traveler',
      email: 'traveler@triptandem.travel',
      role: 'Planner',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      color: '#FF6B45',
      status: 'online',
    };
    try {
      sessionStorage.setItem('tt_traveler_identity', JSON.stringify(guestUser));
    } catch {}
    return guestUser;
  }, [currentUser]);

  const activeUser = useMemo(() => {
    return getActiveUser();
  }, [getActiveUser]);

  const [trip, setTrip] = useState(() => {
    const saved = localStorage.getItem('tt_active_trip');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          if (!Array.isArray(parsed.members)) parsed.members = [];
          if (!Array.isArray(parsed.chat)) parsed.chat = [];
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_TRIP;
  });

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isAiConciergeOpen, setIsAiConciergeOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastJoinedMember, setLastJoinedMember] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  const clearLastJoinedMember = useCallback(() => setLastJoinedMember(null), []);

  // Reset unread count whenever user opens group chat drawer
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // PRD Real-Time Metrics & Moderation States
  const [syncDriftMs, setSyncDriftMs] = useState(38);
  const [connectionQuality, setConnectionQuality] = useState('fast'); // 'fast' | 'good' | 'slow'
  const [isLeaderConnected, setIsLeaderConnected] = useState(true);
  const [leaderStatusMessage, setLeaderStatusMessage] = useState('');
  const [activeDuelVote, setActiveDuelVote] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [focusedCards, setFocusedCards] = useState({});
  const lastCursorEmitRef = useRef(0);
  const typingTimeoutsRef = useRef({});
  const clientIdRef = useRef(`client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const broadcastChannelRef = useRef(null);
  const tripRef = useRef(trip);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);
  const tripSyncTimerRef = useRef(null);
  const [isCloudRelayConnected, setIsCloudRelayConnected] = useState(false);

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

    // Mixed Content guard on live HTTPS deployment
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && socketTarget && socketTarget.startsWith('http:')) {
      if (socketTarget.includes('localhost') || socketTarget.includes('127.0.0.1')) {
        socketTarget = undefined;
      } else {
        socketTarget = socketTarget.replace('http:', 'https:');
      }
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

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
    });
    newSocket.on('disconnect', () => {
      setIsSocketConnected(false);
    });
    newSocket.on('connect_error', () => {
      setIsSocketConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Sync socket authentication token dynamically when user logs in or switches
  useEffect(() => {
    if (!socket) return;
    const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');
    socket.auth = { token: token || undefined };
    if (!socket.connected) {
      socket.connect();
    }
  }, [socket, currentUser]);

  // Cross-Tab & Cross-Device Broadcast Helper (0ms latency local + cloud relay synchronization)
  const broadcastSync = (data) => {
    try {
      const payload = {
        tripId: data?.tripId || trip?.id,
        inviteCode: data?.inviteCode || trip?.inviteCode,
        ...data,
        originClientId: clientIdRef.current,
        timestamp: Date.now()
      };

      // 1. Post to BroadcastChannel (0ms latency across same-browser tabs)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(payload);
        } catch (e) {
          try {
            const bc = new BroadcastChannel('triptandem_live_sync');
            bc.postMessage(payload);
          } catch (err) {}
        }
      } else if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('triptandem_live_sync');
          bc.postMessage(payload);
        } catch (e) {}
      }

      // 2. High-reliability localStorage event (100% supported across all tabs & windows)
      try {
        localStorage.setItem('tt_live_event', JSON.stringify({
          payload,
          ts: Date.now(),
          rnd: Math.random()
        }));
      } catch (e) {}
      
      const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rawTargets = [
        payload.inviteCode,
        payload.tripId,
        data?.trip?.inviteCode,
        data?.trip?.id,
        trip?.inviteCode,
        trip?.id,
      ];
      const validKeys = Array.from(new Set(rawTargets.map(norm).filter(k => k && k.length >= 3)));
      validKeys.forEach(key => {
        broadcastCloudEvent(key, payload);
      });
    } catch (e) {}
  };

  // Unified Real-Time Event Processor (handles both BroadcastChannel & Cloud Relay WebSocket)
  const handleIncomingRealtimeEvent = useCallback((eventData) => {
    if (!eventData) return;
    if (eventData.originClientId && eventData.originClientId === clientIdRef.current) {
      return; // Ignore own echoes
    }

    const { type, tripId, message, newMember, trip: broadcastTrip, changeDescription, updatedBy, user: eventUser, isTyping } = eventData;

    // Cross-tab / cross-device trip state query responder
    if (type === 'REQUEST_TRIP_STATE') {
      const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const reqCode = norm(eventData?.inviteCode || eventData?.tripId);
      const myCode = norm(trip?.inviteCode);
      const myId = norm(trip?.id);
      if (trip && (reqCode === myCode || reqCode === myId || (reqCode.length >= 4 && (myCode.includes(reqCode) || myId.includes(reqCode) || reqCode.includes(myCode) || reqCode.includes(myId))))) {
        broadcastSync({
          type: 'PROVIDE_TRIP_STATE',
          inviteCode: trip.inviteCode || eventData?.inviteCode,
          tripId: trip.id,
          trip: trip,
        });
      }
      return;
    }

    if (type === 'PROVIDE_TRIP_STATE' && broadcastTrip) {
      const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const bCode = norm(broadcastTrip.inviteCode);
      const bId = norm(broadcastTrip.id);
      const currentCode = norm(trip?.inviteCode);
      const currentId = norm(trip?.id);
      if (!trip || currentCode === bCode || currentId === bId || (bCode && (currentId.includes(bCode) || currentCode.includes(bCode))) || (currentCode && bId.includes(currentCode))) {
        setTrip(broadcastTrip);
        try {
          localStorage.setItem('tt_active_trip', JSON.stringify(broadcastTrip));
          const allStored = localStorage.getItem('tt_all_trips');
          const parsedAll = allStored ? JSON.parse(allStored) : [];
          const updatedAll = [broadcastTrip, ...parsedAll.filter(t => t.id !== broadcastTrip.id)];
          localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
        } catch (e) {}
      }
      return;
    }

    // Check if message belongs to current room
    const normStr = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const currentTripIdNorm = normStr(tripRef.current?.id || trip?.id);
    const currentTripCodeNorm = normStr(tripRef.current?.inviteCode || trip?.inviteCode);
    const eventTripIdNorm = normStr(tripId || eventData?.trip?.id);
    const eventTripCodeNorm = normStr(eventData?.inviteCode || eventData?.trip?.inviteCode);

    const isCurrentRoom = !currentTripIdNorm || 
      (eventTripIdNorm && (eventTripIdNorm === currentTripIdNorm || eventTripIdNorm === currentTripCodeNorm)) ||
      (eventTripCodeNorm && (eventTripCodeNorm === currentTripCodeNorm || eventTripCodeNorm === currentTripIdNorm)) ||
      (eventTripIdNorm && eventTripIdNorm.length >= 4 && (currentTripIdNorm.includes(eventTripIdNorm) || currentTripCodeNorm.includes(eventTripIdNorm) || eventTripIdNorm.includes(currentTripIdNorm) || eventTripIdNorm.includes(currentTripCodeNorm))) ||
      (eventTripCodeNorm && eventTripCodeNorm.length >= 4 && (currentTripCodeNorm.includes(eventTripCodeNorm) || currentTripIdNorm.includes(eventTripCodeNorm) || eventTripCodeNorm.includes(currentTripIdNorm) || eventTripCodeNorm.includes(currentTripCodeNorm)));

    if (!isCurrentRoom) return;

    if (type === 'NEW_CHAT_MESSAGE' && message) {
      setTrip(prev => {
        if (!prev) return prev;
        const chat = prev.chat || [];
        if (chat.some(m => m.id === message.id)) return prev;
        const updatedTrip = { ...prev, chat: [...chat, message] };
        try {
          localStorage.setItem('tt_active_trip', JSON.stringify(updatedTrip));
          const allStored = localStorage.getItem('tt_all_trips');
          const parsedAll = allStored ? JSON.parse(allStored) : [];
          const updatedAll = [updatedTrip, ...parsedAll.filter(t => t.id !== updatedTrip.id)];
          localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
        } catch (e) {}
        return updatedTrip;
      });

      if (!isChatOpen) {
        setUnreadChatCount(prev => prev + 1);
      }

      if (message.senderId !== activeUser?.id && message.senderName !== activeUser?.name) {
        if (message.isSystem) {
          showToast(`✨ ${message.text}`, 'info');
        } else {
          showToast(`💬 ${message.senderName || 'Traveler'}: ${message.text?.slice(0, 45) || 'New message'}`, 'info');
        }
      }
    }

    if (type === 'USER_TYPING' && eventUser) {
      const typingUser = eventUser;
      if (typingUser.id !== activeUser?.id && typingUser.name !== activeUser?.name) {
        setTypingUsers(prev => {
          if (isTyping) {
            if (typingTimeoutsRef.current[typingUser.id]) clearTimeout(typingTimeoutsRef.current[typingUser.id]);
            typingTimeoutsRef.current[typingUser.id] = setTimeout(() => {
              setTypingUsers(curr => curr.filter(u => u.id !== typingUser.id));
            }, 3500);
            return prev.some(u => u.id === typingUser.id) ? prev : [...prev, typingUser];
          } else {
            if (typingTimeoutsRef.current[typingUser.id]) clearTimeout(typingTimeoutsRef.current[typingUser.id]);
            return prev.filter(u => u.id !== typingUser.id);
          }
        });
      }
    }

    if (type === 'CURSOR_MOVE' && message) {
      if (message.userId !== activeUser?.id) {
        setRemoteCursors(prev => ({
          ...prev,
          [message.userId]: { ...message, timestamp: Date.now() },
        }));
      }
    }

    if (type === 'CARD_FOCUS' && message) {
      if (message.userId !== activeUser?.id) {
        setFocusedCards(prev => {
          const next = { ...prev };
          if (message.isFocused) {
            next[message.itemId] = { ...message, timestamp: Date.now() };
          } else {
            delete next[message.itemId];
          }
          return next;
        });
      }
    }

    if (type === 'MEMBER_JOINED') {
      const incomingMember = newMember;
      if (incomingMember) {
        setTrip(prev => {
          const base = prev || broadcastTrip;
          if (!base) return base;
          const prevMembers = base.members || [];
          const exists = prevMembers.some(
            m => (m.id && incomingMember.id && m.id === incomingMember.id) ||
                 (m.name && incomingMember.name && m.name.toLowerCase() === incomingMember.name.toLowerCase())
          );
          const updatedMembers = exists
            ? prevMembers.map(m => (m.id === incomingMember.id || m.name?.toLowerCase() === incomingMember.name?.toLowerCase()) ? { ...m, ...incomingMember, status: 'online' } : m)
            : [...prevMembers, { ...incomingMember, status: 'online' }];

          const prevChat = base.chat || [];
          const joinMsgText = `${incomingMember.name} joined the trip room as ${incomingMember.role || 'Planner'}! 🎉`;
          const hasJoinMsg = prevChat.some(m => m.isSystem && m.text?.includes(incomingMember.name));
          const updatedChat = hasJoinMsg ? prevChat : [
            ...prevChat,
            {
              id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tripId: base.id,
              senderId: 'system',
              senderName: 'Trip Concierge',
              senderAvatar: incomingMember.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              text: joinMsgText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            }
          ];

          const merged = {
            ...base,
            members: updatedMembers,
            chat: updatedChat,
          };

          try {
            localStorage.setItem('tt_active_trip', JSON.stringify(merged));
            const allStored = localStorage.getItem('tt_all_trips');
            const parsedAll = allStored ? JSON.parse(allStored) : [];
            const updatedAll = [merged, ...parsedAll.filter(t => t.id !== merged.id)];
            localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
          } catch (e) {}

          return merged;
        });

        setActiveCollaborators(prev => [...prev.filter(c => c.id !== incomingMember.id && c.name !== incomingMember.name), { ...incomingMember, status: 'online' }]);

        if (incomingMember.id !== activeUser?.id && incomingMember.name !== activeUser?.name) {
          setLastJoinedMember(incomingMember);
          showToast(`🎉 ${incomingMember.name} joined the trip room as ${incomingMember.role || 'Planner'}!`, 'success');
          try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
        }
      }
    }

    if (type === 'ITINERARY_SYNC' && broadcastTrip) {
      setTrip(prev => {
        if (!prev) return broadcastTrip;
        const currentMembers = prev.members || [];
        const incomingMembers = broadcastTrip.members || [];
        const mergedMembers = [...currentMembers];
        incomingMembers.forEach(im => {
          const idx = mergedMembers.findIndex(m => (m.id && im.id && m.id === im.id) || (m.name && im.name && m.name.toLowerCase() === im.name.toLowerCase()));
          if (idx >= 0) mergedMembers[idx] = { ...mergedMembers[idx], ...im };
          else mergedMembers.push(im);
        });
        const merged = {
          ...broadcastTrip,
          members: mergedMembers,
        };
        try {
          localStorage.setItem('tt_active_trip', JSON.stringify(merged));
          const allStored = localStorage.getItem('tt_all_trips');
          const parsedAll = allStored ? JSON.parse(allStored) : [];
          const updatedAll = [merged, ...parsedAll.filter(t => t.id !== merged.id)];
          localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
        } catch (e) {}
        return merged;
      });
      if (updatedBy && updatedBy.id !== activeUser?.id && updatedBy.name !== activeUser?.name) {
        showToast(`${updatedBy.name}: ${changeDescription || 'Updated itinerary'}`, 'info');
      }
    }
    if (type === 'MESSAGE_REACTION' && eventData.messageId) {
      setTrip(prev => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const msg = (next.chat || []).find(m => m.id === eventData.messageId);
        if (!msg) return prev;
        if (eventData.reactions) {
          msg.reactions = eventData.reactions;
        } else if (eventData.emoji) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[eventData.emoji]) msg.reactions[eventData.emoji] = [];
          const userIdx = msg.reactions[eventData.emoji].findIndex(u => (typeof u === 'string' ? u : u.id) === eventData.user?.id);
          if (userIdx >= 0) {
            msg.reactions[eventData.emoji].splice(userIdx, 1);
            if (msg.reactions[eventData.emoji].length === 0) delete msg.reactions[eventData.emoji];
          } else {
            msg.reactions[eventData.emoji].push(eventData.user || { id: 'unknown', name: 'Traveler' });
          }
        }
        try {
          localStorage.setItem('tt_active_trip', JSON.stringify(next));
          const allStored = localStorage.getItem('tt_all_trips');
          const parsedAll = allStored ? JSON.parse(allStored) : [];
          const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
          localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
        } catch (e) {}
        return next;
      });
    }
  }, [trip, activeUser, isChatOpen, showToast]);

  const handleIncomingRealtimeEventRef = useRef(null);
  handleIncomingRealtimeEventRef.current = handleIncomingRealtimeEvent;

  // 1. Cross-Tab BroadcastChannel Listener (Same-browser multi-tab - connects once and stays connected)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('triptandem_live_sync');
        broadcastChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (handleIncomingRealtimeEventRef.current) {
            handleIncomingRealtimeEventRef.current(event.data);
          }
        };
        return () => {
          try { channel.close(); } catch (e) {}
          broadcastChannelRef.current = null;
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel sync init:', e);
    }
  }, []);

  // 2. Cloud Relay WebSocket Listener (Cross-Device, Mobile, Cross-Browser & Incognito)
  useEffect(() => {
    const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const keys = Array.from(new Set([norm(trip?.inviteCode), norm(trip?.id)].filter(k => k && k.length >= 3)));
    if (keys.length === 0) return;

    setIsCloudRelayConnected(true);
    const unsubs = keys.map(key =>
      subscribeCloudRoom(key, (payload) => {
        if (handleIncomingRealtimeEventRef.current) {
          handleIncomingRealtimeEventRef.current(payload);
        }
      })
    );

    return () => {
      setIsCloudRelayConnected(false);
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, [trip?.inviteCode, trip?.id]);

  // 3. Resilient LocalStorage & Cloud Snapshot Auto-Persist on Trip Mutation
  useEffect(() => {
    if (!trip || !trip.id) return;
    try {
      localStorage.setItem('tt_active_trip', JSON.stringify(trip));
      const allStored = localStorage.getItem('tt_all_trips');
      const parsedAll = allStored ? JSON.parse(allStored) : [];
      const updatedAll = [trip, ...parsedAll.filter(t => t.id !== trip.id)];
      localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
    } catch (e) {}

    // Debounced authoritative snapshot publish to Cloud Relay (700ms)
    if (tripSyncTimerRef.current) clearTimeout(tripSyncTimerRef.current);
    tripSyncTimerRef.current = setTimeout(() => {
      publishTripSnapshot(trip);
    }, 700);

    return () => {
      if (tripSyncTimerRef.current) clearTimeout(tripSyncTimerRef.current);
    };
  }, [trip]);

  // Multi-tab storage event synchronization (listens to dedicated tt_live_event channel)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'tt_live_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.payload && handleIncomingRealtimeEventRef.current) {
            handleIncomingRealtimeEventRef.current(parsed.payload);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Reflect logged-in user profile across trip members
  useEffect(() => {
    if (!currentUser) return;
    setTrip((prev) => {
      if (!prev || !prev.members) return prev;
      const index = prev.members.findIndex(
        (m) => (m.id && currentUser.id && String(m.id) === String(currentUser.id)) ||
               (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
      );
      if (index >= 0) {
        const existing = prev.members[index];
        const updated = [...prev.members];
        updated[index] = {
          ...existing,
          name: currentUser.name || existing.name,
          avatar: currentUser.avatar || existing.avatar,
          color: currentUser.color || existing.color,
          email: currentUser.email || existing.email,
        };
        return { ...prev, members: updated };
      }
      return prev;
    });
  }, [currentUser]);

  // Sync Trip Room on Socket
  useEffect(() => {
    if (!socket || !trip?.id) return;

    const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');
    const joinPayload = { tripId: trip.id, user: activeUser, token: token || undefined };

    const emitJoin = () => {
      socket.emit('join_trip', joinPayload, (ack) => {
        if (ack && ack.success) {
          if (ack.activeUsers) setActiveCollaborators(ack.activeUsers);
          if (ack.trip && ack.trip.members) {
            setTrip(prev => {
              if (!prev) return ack.trip;
              const currentMembers = prev.members || [];
              const serverMembers = ack.trip.members || [];
              const merged = [...currentMembers];
              serverMembers.forEach(sm => {
                if (!merged.some(m => (m.id && sm.id && m.id === sm.id) || (m.name && sm.name && m.name.toLowerCase() === sm.name.toLowerCase()))) {
                  merged.push(sm);
                }
              });
              return { ...prev, members: merged };
            });
          }
        }
      });
    };

    if (socket.connected) {
      emitJoin();
    }
    socket.on('connect', emitJoin);

    const handlePresence = ({ activeUsers, joinedUser, leftUser }) => {
      if (activeUsers) setActiveCollaborators(activeUsers);
      if (joinedUser && joinedUser.id !== currentUser?.id) {
        showToast(`${joinedUser.name} joined the trip workspace 👋`, 'info');
        setTrip(prev => {
          if (!prev) return prev;
          const currentMembers = prev.members || [];
          const exists = currentMembers.some(
            m => (m.id && joinedUser.id && m.id === joinedUser.id) ||
                 (m.email && joinedUser.email && m.email.toLowerCase() === joinedUser.email.toLowerCase()) ||
                 (m.name && joinedUser.name && m.name.toLowerCase() === joinedUser.name.toLowerCase())
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
            const updated = {
              ...prev,
              members: [...currentMembers, newM],
            };
            try {
              localStorage.setItem('tt_active_trip', JSON.stringify(updated));
              const allStored = localStorage.getItem('tt_all_trips');
              const parsedAll = allStored ? JSON.parse(allStored) : [];
              const updatedAll = [updated, ...parsedAll.filter(t => t.id !== updated.id)];
              localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
            } catch (e) {}
            return updated;
          }
          return prev;
        });
      }
    };

    const handleItinerarySynced = ({ trip: syncedTrip, changeDescription, updatedBy }) => {
      if (syncedTrip) {
        setTrip(prev => {
          if (!prev) return syncedTrip;
          const currentMembers = prev.members || [];
          const incomingMembers = syncedTrip.members || [];
          const mergedMembers = [...currentMembers];
          incomingMembers.forEach(im => {
            const idx = mergedMembers.findIndex(m => (m.id && im.id && m.id === im.id) || (m.name && im.name && m.name.toLowerCase() === im.name.toLowerCase()));
            if (idx >= 0) mergedMembers[idx] = { ...mergedMembers[idx], ...im };
            else mergedMembers.push(im);
          });
          const merged = { ...syncedTrip, members: mergedMembers };
          try {
            localStorage.setItem('tt_active_trip', JSON.stringify(merged));
            const allStored = localStorage.getItem('tt_all_trips');
            const parsedAll = allStored ? JSON.parse(allStored) : [];
            const updatedAll = [merged, ...parsedAll.filter(t => t.id !== merged.id)];
            localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
          } catch (e) {}
          return merged;
        });
        if (updatedBy && updatedBy.id !== activeUser?.id && updatedBy.name !== activeUser?.name) {
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
        const updated = {
          ...prev,
          chat: [...chat, message],
        };
        try {
          localStorage.setItem('tt_active_trip', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (!isChatOpen) {
        setUnreadChatCount(prev => prev + 1);
      }

      if (message.senderId !== activeUser?.id && message.senderName !== activeUser?.name) {
        if (message.isSystem) {
          showToast(`✨ ${message.text}`, 'info');
        } else {
          showToast(`💬 ${message.senderName || 'Traveler'}: ${message.text?.slice(0, 45) || 'New message'}`, 'info');
        }
      }
    };

    const handleTyping = ({ user, isTyping }) => {
      if (!user || user.id === activeUser?.id || (user.name && user.name === activeUser?.name)) return;
      setTypingUsers(prev => {
        if (isTyping) {
          if (typingTimeoutsRef.current[user.id]) clearTimeout(typingTimeoutsRef.current[user.id]);
          typingTimeoutsRef.current[user.id] = setTimeout(() => {
            setTypingUsers(curr => curr.filter(u => u.id !== user.id));
          }, 3500);
          return prev.some(u => u.id === user.id) ? prev : [...prev, user];
        } else {
          if (typingTimeoutsRef.current[user.id]) clearTimeout(typingTimeoutsRef.current[user.id]);
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
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        const msg = (next.chat || []).find(m => m.id === messageId);
        if (msg) {
          if (reactions) {
            msg.reactions = reactions;
          } else {
            if (!msg.reactions) msg.reactions = {};
            if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
            const existingIdx = msg.reactions[emoji].findIndex(u => (typeof u === 'string' ? u : u.id) === user?.id);
            if (existingIdx >= 0) {
              msg.reactions[emoji].splice(existingIdx, 1);
              if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
            } else {
              msg.reactions[emoji].push({ id: user?.id || 'unknown', name: user?.name || 'Traveler' });
            }
          }
          try {
            localStorage.setItem('tt_active_trip', JSON.stringify(next));
          } catch (e) {}
        }
        return next;
      });
    };

    const handleMemberJoined = ({ trip: syncedTrip, newMember }) => {
      const incomingMember = newMember;
      if (incomingMember) {
        setTrip(prev => {
          const base = prev || syncedTrip;
          if (!base) return base;
          const members = base.members || [];
          const exists = members.some(
            m => (m.id && incomingMember.id && m.id === incomingMember.id) ||
                 (m.email && incomingMember.email && m.email.toLowerCase() === incomingMember.email.toLowerCase()) ||
                 (m.name && incomingMember.name && m.name.toLowerCase() === incomingMember.name.toLowerCase())
          );
          const updatedMembers = exists
            ? members.map(m => (m.id === incomingMember.id || m.name?.toLowerCase() === incomingMember.name?.toLowerCase()) ? { ...m, ...incomingMember, status: 'online' } : m)
            : [...members, { ...incomingMember, status: 'online' }];

          const prevChat = base.chat || [];
          const joinMsgText = `${incomingMember.name} joined the trip room as ${incomingMember.role || 'Planner'}! 🎉`;
          const hasJoinMsg = prevChat.some(m => m.isSystem && m.text?.includes(incomingMember.name));
          const updatedChat = hasJoinMsg ? prevChat : [
            ...prevChat,
            {
              id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              tripId: base.id,
              senderId: 'system',
              senderName: 'Trip Concierge',
              senderAvatar: incomingMember.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              text: joinMsgText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: true,
            }
          ];

          const merged = {
            ...base,
            members: updatedMembers,
            chat: updatedChat,
          };

          try {
            localStorage.setItem('tt_active_trip', JSON.stringify(merged));
            const allStored = localStorage.getItem('tt_all_trips');
            const parsedAll = allStored ? JSON.parse(allStored) : [];
            const updatedAll = [merged, ...parsedAll.filter(t => t.id !== merged.id)];
            localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
          } catch (e) {}

          return merged;
        });

        setActiveCollaborators(prev => [...prev.filter(c => c.id !== incomingMember.id && c.name !== incomingMember.name), { ...incomingMember, status: 'online' }]);
        if (incomingMember.id !== activeUser?.id && incomingMember.name !== activeUser?.name) {
          setLastJoinedMember(incomingMember);
          showToast(`🎉 ${incomingMember.name} joined the trip room as ${incomingMember.role || 'Planner'}!`, 'success');
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          } catch (e) {}
        }
      } else if (syncedTrip) {
        setTrip(syncedTrip);
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

    socket.on('cursor_moved', (payload) => {
      if (!payload || !payload.userId || payload.userId === activeUser?.id) return;
      setRemoteCursors(prev => ({
        ...prev,
        [payload.userId]: {
          ...payload,
          timestamp: Date.now(),
        },
      }));
    });

    socket.on('cursor_removed', ({ socketId, userId }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        if (userId && next[userId]) delete next[userId];
        Object.keys(next).forEach(k => {
          if (next[k].socketId === socketId) delete next[k];
        });
        return next;
      });
    });

    socket.on('card_focused', (payload) => {
      if (!payload || !payload.itemId) return;
      setFocusedCards(prev => {
        const next = { ...prev };
        if (payload.isFocused) {
          next[payload.itemId] = {
            userId: payload.userId,
            name: payload.name,
            color: payload.color,
            timestamp: Date.now(),
          };
        } else {
          delete next[payload.itemId];
        }
        return next;
      });
    });
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
      socket.off('connect', emitJoin);
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

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: next.id,
        inviteCode: next.inviteCode,
        trip: next,
        changeDescription: `Vote recorded for "${targetItem.title}"`,
        updatedBy: currentUser || activeUser,
      });
      publishTripSnapshot(next);

      return next;
    });
  };

  const addActivity = (dayNumber = 1, timeSlot = 'afternoon', activityData = {}) => {
    let nextTripSnapshot = null;
    let addedItemTitle = '';
    let targetDayNum = dayNumber;

    setTrip(prev => {
      let targetTrip = prev;
      if (!targetTrip) {
        try {
          const stored = localStorage.getItem('tt_active_trip');
          if (stored) targetTrip = JSON.parse(stored);
        } catch {}
      }
      if (!targetTrip) {
        targetTrip = createBlankTrip('Goa, India', 'My Collaborative Trip', 3, 30000, activeUser);
      }

      const next = JSON.parse(JSON.stringify(targetTrip));
      if (!Array.isArray(next.days) || next.days.length === 0) {
        next.days = [{ dayNumber: 1, dateFormatted: 'Day 1', theme: 'Explore & Discover', items: [] }];
      }

      let day = next.days.find(d => d.dayNumber === dayNumber);
      if (!day) {
        day = next.days[0];
      }
      if (!Array.isArray(day.items)) day.items = [];

      const currentUserId = activeUser?.id || currentUser?.id || 'user-1';

      const newItem = {
        id: `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        timeSlot: timeSlot || 'afternoon',
        startTime: activityData.startTime || '02:00 PM',
        duration: activityData.duration || '2h',
        title: activityData.title || activityData.venueName || 'New Activity',
        venueId: activityData.venueId || null,
        venueName: activityData.venueName || activityData.title,
        category: activityData.category || 'experience',
        image: activityData.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
        costPerPerson: Number(activityData.costPerPerson) || 0,
        location: activityData.location || next.destination,
        source: activityData.source || 'user',
        status: 'drafting',
        votes: { up: [currentUserId], down: [] },
        notes: activityData.notes || '',
        positionVersion: 1,
      };

      day.items.push(newItem);
      addedItemTitle = newItem.title;
      targetDayNum = day.dayNumber;

      // Rebalance category budget dynamically from actual itinerary items
      if (next.budget) {
        const newCategories = { accommodation: 0, food: 0, transport: 0, activities: 0, other: 0 };
        const memberCount = Math.max((next.members && next.members.length) || 1, 1);
        (next.days || []).forEach(d => {
          (d.items || []).forEach(i => {
            const cat = i.category === 'stay' ? 'accommodation' : (i.category === 'restaurant' || i.category === 'dining') ? 'food' : 'activities';
            newCategories[cat] = (newCategories[cat] || 0) + ((Number(i.costPerPerson) || 0) * memberCount);
          });
        });
        next.budget.categories = newCategories;
      }

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

      nextTripSnapshot = next;
      return next;
    });

    if (nextTripSnapshot) {
      if (socket) {
        socket.emit('itinerary_change', {
          tripId: nextTripSnapshot.id,
          trip: nextTripSnapshot,
          changeDescription: `Added "${addedItemTitle}" to Day ${targetDayNum}`,
          updatedBy: activeUser || currentUser,
        });
      }

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: nextTripSnapshot.id,
        inviteCode: nextTripSnapshot.inviteCode,
        trip: nextTripSnapshot,
        changeDescription: `Added "${addedItemTitle}" to Day ${targetDayNum}`,
        updatedBy: activeUser || currentUser,
      });
      publishTripSnapshot(nextTripSnapshot);
      showToast(`Added "${addedItemTitle}" to Day ${targetDayNum} as Draft! ✨`, 'success');
    }
  };

  const updateActivity = (itemId, updates) => {
    let nextTripSnapshot = null;

    setTrip(prev => {
      if (!prev || !prev.days) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      for (const day of next.days) {
        const item = (day.items || []).find(i => i.id === itemId);
        if (item) {
          Object.assign(item, updates);
          break;
        }
      }

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

      nextTripSnapshot = next;
      return next;
    });

    if (nextTripSnapshot) {
      if (socket) {
        socket.emit('itinerary_change', {
          tripId: nextTripSnapshot.id,
          trip: nextTripSnapshot,
          changeDescription: `Updated activity details`,
          updatedBy: activeUser || currentUser,
        });
      }

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: nextTripSnapshot.id,
        inviteCode: nextTripSnapshot.inviteCode,
        trip: nextTripSnapshot,
        changeDescription: `Updated activity details`,
        updatedBy: activeUser || currentUser,
      });
      publishTripSnapshot(nextTripSnapshot);
    }
  };

  const removeActivity = (itemId) => {
    let nextTripSnapshot = null;
    let removedName = '';

    setTrip(prev => {
      if (!prev || !prev.days) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      for (const day of next.days) {
        const idx = (day.items || []).findIndex(i => i.id === itemId);
        if (idx !== -1) {
          removedName = day.items[idx].title;
          day.items.splice(idx, 1);
          break;
        }
      }

      // Rebalance category budget dynamically from actual remaining itinerary items
      if (next.budget) {
        const newCategories = { accommodation: 0, food: 0, transport: 0, activities: 0, other: 0 };
        const memberCount = Math.max((next.members && next.members.length) || 1, 1);
        (next.days || []).forEach(d => {
          (d.items || []).forEach(i => {
            const cat = i.category === 'stay' ? 'accommodation' : (i.category === 'restaurant' || i.category === 'dining') ? 'food' : 'activities';
            newCategories[cat] = (newCategories[cat] || 0) + ((Number(i.costPerPerson) || 0) * memberCount);
          });
        });
        next.budget.categories = newCategories;
      }

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

      nextTripSnapshot = next;
      return next;
    });

    if (nextTripSnapshot) {
      if (socket) {
        socket.emit('itinerary_change', {
          tripId: nextTripSnapshot.id,
          trip: nextTripSnapshot,
          changeDescription: `Removed "${removedName}"`,
          updatedBy: activeUser || currentUser,
        });
      }

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: nextTripSnapshot.id,
        inviteCode: nextTripSnapshot.inviteCode,
        trip: nextTripSnapshot,
        changeDescription: `Removed "${removedName}"`,
        updatedBy: activeUser || currentUser,
      });
      publishTripSnapshot(nextTripSnapshot);
    }

    showToast(`Removed "${removedName}"`, 'info');
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

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: next.id,
        inviteCode: next.inviteCode,
        trip: next,
        changeDescription: `Reordered activity in Day ${dayNumber}`,
        updatedBy: currentUser || activeUser,
      });
      publishTripSnapshot(next);

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

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

      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: next.id,
        inviteCode: next.inviteCode,
        trip: next,
        changeDescription: `Moved "${movedItemTitle || 'Activity'}" to Day ${toDayNumber}`,
        updatedBy: currentUser || activeUser,
      });
      publishTripSnapshot(next);

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

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
      broadcastSync({
        type: 'ITINERARY_SYNC',
        tripId: next.id,
        inviteCode: next.inviteCode,
        trip: next,
        changeDescription: `Reordered Day ${dayNumber} items`,
        updatedBy: currentUser || activeUser,
      });
      publishTripSnapshot(next);
      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}
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

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

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
    const currentTrip = tripRef.current || trip;
    const sender = customSender || {
      id: activeUser.id,
      name: activeUser.name,
      avatar: activeUser.avatar,
      role: activeUser.role,
      isAi: false,
    };

    const newMsg = {
      id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
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
          paidBy: attachment.paidBy || sender.name || activeUser.name,
          splitWith: attachment.splitWith || (next.members || []).map(m => m.name),
          date: new Date().toISOString().split('T')[0],
          type: 'actual',
          receiptUrl: attachment.receiptUrl || null,
          notes: 'Logged directly via Trip Chat',
        };
        if (!next.budget) next.budget = { expenses: [] };
        next.budget.expenses = [...(next.budget.expenses || []), billExp];
      }

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

      return next;
    });

    if (socket && currentTrip?.id) {
      const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');
      socket.emit('send_message', {
        tripId: currentTrip.id,
        message: newMsg,
        token: token || undefined,
      });
    }

    // Cross-tab live broadcast
    if (currentTrip?.id) {
      broadcastSync({
        type: 'NEW_CHAT_MESSAGE',
        tripId: currentTrip.id,
        inviteCode: currentTrip.inviteCode,
        message: newMsg,
      });
    }
  };

  // Instagram / WhatsApp-style emoji reactions
  const reactToMessage = (messageId, emoji, customUser = null) => {
    const actor = customUser || activeUser;
    const currentTrip = tripRef.current || trip;
    if (!currentTrip || !currentTrip.chat) return;

    const targetMsg = (currentTrip.chat || []).find(m => m.id === messageId);
    if (!targetMsg) return;

    // Synchronously compute updated reactions so socket and broadcast NEVER receive null
    const nextReactions = JSON.parse(JSON.stringify(targetMsg.reactions || {}));
    if (!nextReactions[emoji]) nextReactions[emoji] = [];

    const userIdx = nextReactions[emoji].findIndex(
      u => (typeof u === 'string' ? u : u.id) === actor.id || (typeof u === 'object' && u.name && actor.name && u.name.toLowerCase() === actor.name.toLowerCase())
    );
    if (userIdx >= 0) {
      nextReactions[emoji].splice(userIdx, 1);
      if (nextReactions[emoji].length === 0) delete nextReactions[emoji];
    } else {
      nextReactions[emoji].push({ id: actor.id, name: actor.name });
    }

    const updatedReactions = nextReactions;

    setTrip(prev => {
      const next = JSON.parse(JSON.stringify(prev || currentTrip));
      const msg = (next.chat || []).find(m => m.id === messageId);
      if (!msg) return prev;
      msg.reactions = updatedReactions;

      try {
        localStorage.setItem('tt_active_trip', JSON.stringify(next));
        const allStored = localStorage.getItem('tt_all_trips');
        const parsedAll = allStored ? JSON.parse(allStored) : [];
        const updatedAll = [next, ...parsedAll.filter(t => t.id !== next.id)];
        localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
      } catch (e) {}

      return next;
    });

    if (socket && currentTrip?.id) {
      const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');
      socket.emit('message_reaction', {
        tripId: currentTrip.id,
        messageId,
        emoji,
        user: { id: actor.id, name: actor.name },
        reactions: updatedReactions,
        token: token || undefined,
      });
    }

    // Cross-tab and cloud relay broadcast for live reaction sync across all devices
    if (currentTrip?.id) {
      broadcastSync({
        type: 'MESSAGE_REACTION',
        tripId: currentTrip.id,
        inviteCode: currentTrip.inviteCode,
        messageId,
        emoji,
        user: { id: actor.id, name: actor.name },
        reactions: updatedReactions,
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
  const joinTripByCode = async (inviteCode, requestedRole = 'Planner', customUser = null) => {
    if (!inviteCode || !inviteCode.trim()) {
      showToast('Please enter an invite code to join a trip', 'error');
      return null;
    }
    const cleanCode = inviteCode.trim();
    const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const targetNorm = norm(cleanCode);

    const joiningUser = customUser || activeUser;
    const memberName = joiningUser?.name || 'Traveler';
    const memberRole = requestedRole || joiningUser?.role || 'Planner';

    let targetTrip = null;

    // 1. Authoritative Server Join via API
    try {
      const serverRes = await api.joinTripByCode(cleanCode, joiningUser, memberRole);
      if (serverRes) {
        targetTrip = serverRes;
      }
    } catch (err) {
      console.warn('Server trip join notification:', err);
    }

    // 2. Cross-Tab Live Broadcast Query (request authoritative trip from host tab)
    if (!targetTrip && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        await new Promise((resolve) => {
          const bc = new BroadcastChannel('triptandem_live_sync');
          const timeout = setTimeout(() => {
            try { bc.close(); } catch (err) {}
            resolve();
          }, 450);

          bc.onmessage = (e) => {
            if (e.data?.type === 'PROVIDE_TRIP_STATE' && e.data.trip) {
              const bTrip = e.data.trip;
              const bCodeNorm = norm(bTrip.inviteCode);
              const bIdNorm = norm(bTrip.id);
              if (bCodeNorm === targetNorm || bIdNorm === targetNorm || (targetNorm.length >= 4 && (bCodeNorm.includes(targetNorm) || targetNorm.includes(bCodeNorm)))) {
                targetTrip = JSON.parse(JSON.stringify(bTrip));
                clearTimeout(timeout);
                try { bc.close(); } catch (err) {}
                resolve();
              }
            }
          };

          bc.postMessage({ type: 'REQUEST_TRIP_STATE', inviteCode: cleanCode });
        });
      } catch (e) {}
    }

    // 3. Check stored trips in localStorage
    if (!targetTrip) {
      try {
        const storedAll = localStorage.getItem('tt_all_trips');
        if (storedAll) {
          const parsed = JSON.parse(storedAll);
          const found = parsed.find(
            t => norm(t.inviteCode) === targetNorm || norm(t.id) === targetNorm || (targetNorm.length >= 4 && norm(t.inviteCode).includes(targetNorm))
          );
          if (found) targetTrip = JSON.parse(JSON.stringify(found));
        }
      } catch (e) {}
    }

    if (!targetTrip) {
      try {
        const storedActive = localStorage.getItem('tt_active_trip');
        if (storedActive) {
          const parsedActive = JSON.parse(storedActive);
          if (norm(parsedActive.inviteCode) === targetNorm || norm(parsedActive.id) === targetNorm || (targetNorm.length >= 4 && norm(parsedActive.inviteCode).includes(targetNorm))) {
            targetTrip = JSON.parse(JSON.stringify(parsedActive));
          }
        }
      } catch (e) {}
    }

    // 4. Check current in-memory trip state
    if (!targetTrip && trip && (norm(trip.inviteCode) === targetNorm || norm(trip.id) === targetNorm || (targetNorm.length >= 4 && norm(trip.inviteCode).includes(targetNorm)))) {
      targetTrip = JSON.parse(JSON.stringify(trip));
    }

    // 5. Query Cloud Relay Live Room for active host (cross-device & incognito live P2P transfer)
    if (!targetTrip) {
      try {
        await new Promise((resolve) => {
          let unsub = null;
          const timeout = setTimeout(() => {
            if (unsub) unsub();
            resolve();
          }, 850);

          unsub = subscribeCloudRoom(cleanCode, (e) => {
            if (e?.type === 'PROVIDE_TRIP_STATE' && e.trip) {
              const bTrip = e.trip;
              const bCodeNorm = norm(bTrip.inviteCode);
              const bIdNorm = norm(bTrip.id);
              if (bCodeNorm === targetNorm || bIdNorm === targetNorm || (targetNorm.length >= 4 && (bCodeNorm.includes(targetNorm) || targetNorm.includes(bCodeNorm)))) {
                targetTrip = JSON.parse(JSON.stringify(bTrip));
                clearTimeout(timeout);
                if (unsub) unsub();
                resolve();
              }
            }
          });

          broadcastCloudEvent(cleanCode, {
            type: 'REQUEST_TRIP_STATE',
            inviteCode: cleanCode,
          });
        });
      } catch (e) {}
    }

    // 6. Query Cloud Relay Snapshot (for cross-device / incognito sessions)
    if (!targetTrip) {
      try {
        const cloudSnapshot = await fetchTripSnapshot(cleanCode);
        if (cloudSnapshot && (cloudSnapshot.title || cloudSnapshot.destination)) {
          targetTrip = JSON.parse(JSON.stringify(cloudSnapshot));
        }
      } catch (e) {}
    }

    // 7. If STILL not found anywhere, create a clean blank trip canvas
    if (!targetTrip) {
      targetTrip = createBlankTrip('Custom Destination', `Trip (${cleanCode})`, 3, 30000, joiningUser);
      targetTrip.inviteCode = cleanCode;
      targetTrip.id = `trip-${targetNorm.toLowerCase().slice(0, 16)}`;
    }

    const newMemberObj = {
      id: joiningUser?.id || `user-guest-${Date.now().toString(36)}`,
      name: memberName,
      email: joiningUser?.email || `${memberName.toLowerCase().replace(/[^a-z0-9]/g, '')}@triptandem.travel`,
      role: memberRole,
      avatar: joiningUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      color: joiningUser?.color || '#FF6B45',
      status: 'online',
    };

    if (!Array.isArray(targetTrip.members)) targetTrip.members = [];

    const alreadyMember = targetTrip.members.some(
      m => (m.id && newMemberObj.id && m.id === newMemberObj.id) ||
           (m.name && newMemberObj.name && m.name.toLowerCase() === newMemberObj.name.toLowerCase())
    );

    if (!alreadyMember) {
      targetTrip.members.push(newMemberObj);
    } else {
      targetTrip.members = targetTrip.members.map(m =>
        (m.id === newMemberObj.id || m.name?.toLowerCase() === newMemberObj.name?.toLowerCase())
          ? { ...m, ...newMemberObj, status: 'online' }
          : m
      );
    }

    // Create system join message and push to chat
    const joinMsg = {
      id: `msg-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: targetTrip.id,
      senderId: 'system',
      senderName: 'Trip Concierge',
      senderAvatar: newMemberObj.avatar,
      text: `${memberName} joined the trip room as ${memberRole}! 🎉 Let's collaborate.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    };

    if (!targetTrip.chat) targetTrip.chat = [];
    if (!targetTrip.chat.some(m => m.id === joinMsg.id || (m.isSystem && m.text?.includes(memberName)))) {
      targetTrip.chat.push(joinMsg);
    }

    setTrip(targetTrip);
    try {
      localStorage.setItem('tt_active_trip', JSON.stringify(targetTrip));
      const allStored = localStorage.getItem('tt_all_trips');
      const parsedAll = allStored ? JSON.parse(allStored) : [];
      const updatedAll = [targetTrip, ...parsedAll.filter(t => t.id !== targetTrip.id)];
      localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
    } catch (e) {}

    setActiveCollaborators(prev => [...prev.filter(c => c.id !== newMemberObj.id && c.name !== newMemberObj.name), newMemberObj]);
    setLastJoinedMember(newMemberObj);

    // Emit live socket events
    if (socket) {
      const token = localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token');
      socket.emit('join_trip', { tripId: targetTrip.id, user: joiningUser, token: token || undefined });
      socket.emit('member_join', { tripId: targetTrip.id, member: newMemberObj, trip: targetTrip, token: token || undefined });
      socket.emit('send_message', { tripId: targetTrip.id, message: joinMsg, token: token || undefined });
      socket.emit('itinerary_change', {
        tripId: targetTrip.id,
        trip: targetTrip,
        changeDescription: `${memberName} joined the trip room`,
        updatedBy: joiningUser,
        token: token || undefined,
      });
    }

    // Cross-tab & Cloud Relay broadcast
    broadcastSync({
      type: 'MEMBER_JOINED',
      tripId: targetTrip.id,
      inviteCode: targetTrip.inviteCode,
      newMember: newMemberObj,
      trip: targetTrip,
    });
    broadcastSync({
      type: 'NEW_CHAT_MESSAGE',
      tripId: targetTrip.id,
      inviteCode: targetTrip.inviteCode,
      message: joinMsg,
    });
    publishTripSnapshot(targetTrip);

    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    showToast(`🎉 Joined "${targetTrip.title}" as ${memberRole}!`, 'success');
    return targetTrip;
  };

  // Create a brand new blank trip canvas
  const createNewBlankTrip = async ({ destination, title, daysCount = 3, budgetTotal = 30000 }) => {
    let created = null;
    try {
      created = await api.createTrip({
        destination,
        title,
        daysCount: Number(daysCount),
        budgetTotal: Number(budgetTotal),
        createdBy: activeUser,
      });
    } catch (e) {
      console.warn('Backend create trip notice, creating local blank canvas:', e);
    }

    if (!created) {
      created = createBlankTrip(destination, title, daysCount, budgetTotal, activeUser);
    }

    setTrip(created);
    setActiveDayIndex(0);
    publishTripSnapshot(created);

    try {
      localStorage.setItem('tt_active_trip', JSON.stringify(created));
      const allStored = localStorage.getItem('tt_all_trips');
      const parsedAll = allStored ? JSON.parse(allStored) : [];
      const updatedAll = [created, ...parsedAll.filter(t => t.id !== created.id)];
      localStorage.setItem('tt_all_trips', JSON.stringify(updatedAll));
    } catch (e) {}

    // Broadcast cross-tab and cloud relay
    broadcastSync({
      type: 'TRIP_CREATED',
      tripId: created.id,
      inviteCode: created.inviteCode,
      trip: created,
    });

    return created;
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
        user: activeUser,
        isTyping: Boolean(isTyping),
      });
    }
    if (trip?.id) {
      broadcastSync({
        type: 'USER_TYPING',
        tripId: trip.id,
        inviteCode: trip.inviteCode,
        user: activeUser,
        isTyping: Boolean(isTyping),
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
    let totalPlannedCost = 0;
    const membersCount = Math.max((trip.members && trip.members.length) || 1, 1);
    (trip.days || []).forEach(day => {
      (day.items || []).forEach(item => {
        totalPlannedCost += (Number(item.costPerPerson) || 0) * membersCount;
      });
    });
    const actualLoggedExpenses = (trip.budget?.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCommitted = Math.max(totalPlannedCost, actualLoggedExpenses);
    const targetLimit = Number(trip.budget?.totalTarget) || 0;
    if (targetLimit > 0 && totalCommitted > targetLimit) {
      const diff = totalCommitted - targetLimit;
      list.push({
        id: 'conflict-budget',
        type: 'budget_overrun',
        title: 'Budget Alert',
        description: `Current estimated itinerary total (₹${totalCommitted.toLocaleString()}) exceeds target by ₹${diff.toLocaleString()}.`,
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
        activeUser,
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
        isCreateTripModalOpen,
        setIsCreateTripModalOpen,
        createNewBlankTrip,
        isSocketConnected: isSocketConnected || isCloudRelayConnected,
        isCloudRelayConnected,
        unreadChatCount,
        setUnreadChatCount,
        lastJoinedMember,
        clearLastJoinedMember,
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
