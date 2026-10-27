import { v4 as uuidv4 } from 'uuid';
import { isDBConnected } from '../db.js';
import { store } from '../store.js';
import { User } from '../models/User.js';
import { Trip } from '../models/Trip.js';
import { VenueMetadata } from '../models/VenueMetadata.js';
import { Interaction } from '../models/Interaction.js';
import { EventLog } from '../models/EventLog.js';

// Ensure in-memory store has events and interactions collections
if (!store.events) store.events = [];
if (!store.interactions) store.interactions = [];
if (!store.refreshTokens) store.refreshTokens = new Map(); // userId -> [{ token, expiresAt }]

export const dataService = {
  // -------------------------------------------------------------
  // USERS
  // -------------------------------------------------------------
  async listUsers() {
    if (isDBConnected()) {
      return await User.find({}).lean();
    }
    return store.users;
  },

  async getUserById(id) {
    if (isDBConnected()) {
      return await User.findOne({ id }).lean();
    }
    return store.users.find(u => u.id === id) || null;
  },

  async getUserByEmail(email, includePassword = false) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    if (isDBConnected()) {
      const q = User.findOne({ email: normalized });
      if (includePassword) q.select('+passwordHash');
      return await q.lean();
    }
    const found = store.users.find(u => u.email.toLowerCase() === normalized);
    return found ? (includePassword ? found : { ...found, passwordHash: undefined }) : null;
  },

  async createUser(userData) {
    const id = userData.id || `user-${uuidv4().slice(0, 8)}`;
    const userObj = {
      ...userData,
      id,
      email: userData.email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    if (isDBConnected()) {
      const doc = await User.create(userObj);
      return doc.toObject();
    }

    store.users.push(userObj);
    return userObj;
  },

  async updateUser(id, updates) {
    if (isDBConnected()) {
      const updated = await User.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
      return updated;
    }
    const user = store.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  },

  // Refresh Token Session Management
  async saveRefreshToken(userId, token, expiresAt) {
    if (isDBConnected()) {
      await User.updateOne(
        { id: userId },
        { $push: { refreshTokens: { token, expiresAt, createdAt: new Date() } } }
      );
      return;
    }
    if (!store.refreshTokens.has(userId)) {
      store.refreshTokens.set(userId, []);
    }
    store.refreshTokens.get(userId).push({ token, expiresAt });
  },

  async verifyRefreshToken(userId, token) {
    if (isDBConnected()) {
      const user = await User.findOne({ id: userId, 'refreshTokens.token': token });
      if (!user) return false;
      const record = user.refreshTokens.find(rt => rt.token === token);
      if (!record || new Date(record.expiresAt) < new Date()) {
        // Expired or invalid
        await User.updateOne({ id: userId }, { $pull: { refreshTokens: { token } } });
        return false;
      }
      return true;
    }
    const list = store.refreshTokens.get(userId) || [];
    const idx = list.findIndex(r => r.token === token);
    if (idx === -1) return false;
    const record = list[idx];
    if (new Date(record.expiresAt) < new Date()) {
      list.splice(idx, 1);
      return false;
    }
    return true;
  },

  async removeRefreshToken(userId, token) {
    if (isDBConnected()) {
      await User.updateOne({ id: userId }, { $pull: { refreshTokens: { token } } });
      return;
    }
    const list = store.refreshTokens.get(userId) || [];
    const idx = list.findIndex(r => r.token === token);
    if (idx !== -1) list.splice(idx, 1);
  },

  async removeAllRefreshTokens(userId) {
    if (isDBConnected()) {
      await User.updateOne({ id: userId }, { $set: { refreshTokens: [] } });
      return;
    }
    store.refreshTokens.delete(userId);
  },

  // -------------------------------------------------------------
  // TRIPS
  // -------------------------------------------------------------
  async listTrips() {
    if (isDBConnected()) {
      return await Trip.find({}).lean();
    }
    return store.trips;
  },

  async getTripById(id) {
    if (isDBConnected()) {
      return await Trip.findOne({ id }).lean();
    }
    return store.trips.find(t => t.id === id) || null;
  },

  async getTripByInviteCode(code) {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    if (isDBConnected()) {
      return await Trip.findOne({
        $or: [{ inviteCode: normalized }, { id: normalized.toLowerCase() }],
      }).lean();
    }
    return (
      store.trips.find(
        t => (t.inviteCode || '').toUpperCase() === normalized || t.id.toUpperCase() === normalized
      ) || null
    );
  },

  async createTrip(tripData) {
    const tripObj = {
      ...tripData,
      id: tripData.id || `trip-${uuidv4().slice(0, 8)}`,
      inviteCode: tripData.inviteCode || `TANDEM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    if (isDBConnected()) {
      const doc = await Trip.create(tripObj);
      return doc.toObject();
    }

    store.trips.push(tripObj);
    return tripObj;
  },

  async updateTrip(id, updates) {
    if (isDBConnected()) {
      return await Trip.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    }
    const trip = store.trips.find(t => t.id === id);
    if (!trip) return null;
    Object.assign(trip, updates);
    return trip;
  },

  async addMemberToTrip(tripId, memberObj) {
    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return null;
      const existing = trip.members.find(m => m.id === memberObj.id || m.email === memberObj.email);
      if (!existing) {
        trip.members.push(memberObj);
        if (!trip.participantIds) trip.participantIds = [];
        if (!trip.participantIds.includes(memberObj.id)) trip.participantIds.push(memberObj.id);
        await trip.save();
      }
      return trip.toObject();
    }

    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    if (!trip.members) trip.members = [];
    const idx = trip.members.findIndex(m => m.id === memberObj.id || m.email === memberObj.email);
    if (idx === -1) {
      trip.members.push(memberObj);
      if (!trip.participantIds) trip.participantIds = [];
      if (!trip.participantIds.includes(memberObj.id)) trip.participantIds.push(memberObj.id);
    } else {
      trip.members[idx] = { ...trip.members[idx], ...memberObj };
    }
    return trip;
  },

  async updateMemberRole(tripId, memberId, newRole) {
    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return null;
      const member = trip.members.find(m => m.id === memberId);
      if (member) {
        member.role = newRole;
        await trip.save();
      }
      return trip.toObject();
    }

    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    const member = (trip.members || []).find(m => m.id === memberId);
    if (member) {
      member.role = newRole;
    }
    return trip;
  },

  async removeMemberFromTrip(tripId, memberId) {
    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return null;
      trip.members = trip.members.filter(m => m.id !== memberId);
      if (trip.participantIds) {
        trip.participantIds = trip.participantIds.filter(id => id !== memberId);
      }
      await trip.save();
      return trip.toObject();
    }

    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    const idx = (trip.members || []).findIndex(m => m.id === memberId);
    if (idx !== -1) {
      trip.members.splice(idx, 1);
    }
    if (trip.participantIds) {
      trip.participantIds = trip.participantIds.filter(id => id !== memberId);
    }
    return trip;
  },

  // -------------------------------------------------------------
  // ITINERARY ITEMS & OPTIMISTIC CONCURRENCY
  // -------------------------------------------------------------
  async addItemToTrip(tripId, dayNumber, itemData) {
    const newItem = {
      id: itemData.id || `item-${uuidv4().slice(0, 8)}`,
      timeSlot: itemData.timeSlot || 'afternoon',
      startTime: itemData.startTime || '02:00 PM',
      endTime: itemData.endTime || '04:00 PM',
      duration: itemData.duration || '2h',
      title: itemData.title || 'New Activity',
      venueId: itemData.venueId || null,
      venueName: itemData.venueName || itemData.title,
      category: itemData.category || 'experience',
      image: itemData.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
      costPerPerson: Number(itemData.costPerPerson) || 0,
      location: itemData.location || '',
      source: itemData.source || 'user',
      status: itemData.status || 'drafting',
      lifecycleStage: itemData.lifecycleStage || 'drafting',
      positionVersion: 1,
      order: itemData.order || 0,
      votes: { up: [], down: [] },
      notes: itemData.notes || '',
    };

    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return null;
      let day = trip.days.find(d => d.dayNumber === Number(dayNumber));
      if (!day) {
        day = { dayNumber: Number(dayNumber), items: [] };
        trip.days.push(day);
      }
      day.items.push(newItem);
      await trip.save();
      return { item: newItem, trip: trip.toObject() };
    }

    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    let day = trip.days.find(d => d.dayNumber === Number(dayNumber));
    if (!day) {
      day = { dayNumber: Number(dayNumber), items: [] };
      trip.days.push(day);
    }
    day.items.push(newItem);
    return { item: newItem, trip };
  },

  /**
   * Apply an item update with strict positionVersion optimistic concurrency
   */
  async updateItemWithConcurrency(tripId, itemId, incomingUpdate) {
    const { positionVersion: clientVersion, dayNumber, dayIndex, ...fields } = incomingUpdate;

    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return { success: false, error: 'Trip not found' };

      let targetItem = null;
      let currentDay = null;

      for (const d of trip.days) {
        const it = d.items.find(i => i.id === itemId);
        if (it) {
          targetItem = it;
          currentDay = d;
          break;
        }
      }

      if (!targetItem) return { success: false, error: 'Activity not found' };

      // Concurrency check
      const serverVersion = targetItem.positionVersion || 1;
      if (clientVersion !== undefined && clientVersion !== null && Number(clientVersion) !== serverVersion) {
        return {
          success: false,
          conflict: true,
          error: `Concurrent edit conflict: activity was modified by another collaborator (server v${serverVersion}, client v${clientVersion}).`,
          currentServerVersion: serverVersion,
          authoritativeItem: targetItem.toObject ? targetItem.toObject() : targetItem,
          authoritativeTrip: trip.toObject(),
        };
      }

      // Increment version atomically
      targetItem.positionVersion = serverVersion + 1;
      Object.assign(targetItem, fields);

      // Handle move between days if dayNumber or dayIndex changed
      const targetDayNumber = dayNumber ?? (dayIndex !== undefined ? dayIndex + 1 : currentDay.dayNumber);
      if (targetDayNumber && targetDayNumber !== currentDay.dayNumber) {
        currentDay.items = currentDay.items.filter(i => i.id !== itemId);
        let targetDay = trip.days.find(d => d.dayNumber === Number(targetDayNumber));
        if (!targetDay) {
          targetDay = { dayNumber: Number(targetDayNumber), items: [] };
          trip.days.push(targetDay);
        }
        targetItem.dayNumber = Number(targetDayNumber);
        targetDay.items.push(targetItem);
      }

      await trip.save();
      return {
        success: true,
        item: targetItem.toObject ? targetItem.toObject() : targetItem,
        trip: trip.toObject(),
        newVersion: targetItem.positionVersion,
      };
    }

    // In-memory store handling
    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return { success: false, error: 'Trip not found' };

    let targetItem = null;
    let currentDay = null;

    for (const d of trip.days) {
      const it = (d.items || []).find(i => i.id === itemId);
      if (it) {
        targetItem = it;
        currentDay = d;
        break;
      }
    }

    if (!targetItem) return { success: false, error: 'Activity not found' };

    const serverVersion = targetItem.positionVersion || 1;
    if (clientVersion !== undefined && clientVersion !== null && Number(clientVersion) !== serverVersion) {
      return {
        success: false,
        conflict: true,
        error: `Concurrent edit conflict: activity was modified by another collaborator (server v${serverVersion}, client v${clientVersion}).`,
        currentServerVersion: serverVersion,
        authoritativeItem: { ...targetItem },
        authoritativeTrip: trip,
      };
    }

    // Atomically increment version and apply fields
    targetItem.positionVersion = serverVersion + 1;
    Object.assign(targetItem, fields);

    // Support moving activities between days
    const targetDayNumber = dayNumber ?? (dayIndex !== undefined ? dayIndex + 1 : currentDay.dayNumber);
    if (targetDayNumber && targetDayNumber !== currentDay.dayNumber) {
      currentDay.items = currentDay.items.filter(i => i.id !== itemId);
      let targetDay = trip.days.find(d => d.dayNumber === Number(targetDayNumber));
      if (!targetDay) {
        targetDay = { dayNumber: Number(targetDayNumber), items: [] };
        trip.days.push(targetDay);
      }
      targetItem.dayNumber = Number(targetDayNumber);
      targetDay.items.push(targetItem);
    }

    return {
      success: true,
      item: { ...targetItem },
      trip,
      newVersion: targetItem.positionVersion,
    };
  },

  async removeItemFromTrip(tripId, itemId) {
    if (isDBConnected()) {
      const trip = await Trip.findOne({ id: tripId });
      if (!trip) return null;
      for (const day of trip.days) {
        day.items = day.items.filter(i => i.id !== itemId);
      }
      await trip.save();
      return trip.toObject();
    }

    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    for (const day of trip.days) {
      day.items = (day.items || []).filter(i => i.id !== itemId);
    }
    return trip;
  },

  // -------------------------------------------------------------
  // EVENTS & ANALYTICS
  // -------------------------------------------------------------
  async recordEvent({ tripId, type, actorId, metadata = {} }) {
    const event = {
      id: `evt-${uuidv4().slice(0, 8)}`,
      tripId,
      type,
      actorId: actorId || 'system',
      timestamp: new Date().toISOString(),
      metadata,
    };

    if (isDBConnected()) {
      try {
        await EventLog.create(event);
      } catch (e) {
        console.warn('Failed to persist EventLog:', e.message);
      }
    }

    // Always maintain in-memory log
    if (!store.events) store.events = [];
    store.events.push(event);

    return event;
  },

  async getEventsForTrip(tripId) {
    if (isDBConnected()) {
      const events = await EventLog.find({ tripId }).sort({ timestamp: 1 }).lean();
      if (events && events.length > 0) return events;
    }
    return (store.events || []).filter(e => e.tripId === tripId);
  },

  // -------------------------------------------------------------
  // INTERACTIONS (For Hybrid Group Recommender)
  // -------------------------------------------------------------
  async recordInteraction(data) {
    const interaction = {
      id: data.id || `act-${uuidv4().slice(0, 8)}`,
      userId: data.userId,
      tripId: data.tripId || null,
      venueId: data.venueId,
      destination: data.destination || '',
      category: data.category || 'attraction',
      interactionType: data.interactionType || 'like',
      weight: data.weight || 1,
      coTraveledWith: data.coTraveledWith || [],
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
    };

    if (isDBConnected()) {
      try {
        await Interaction.create(interaction);
      } catch (e) {
        console.warn('Failed to persist Interaction:', e.message);
      }
    }

    if (!store.interactions) store.interactions = [];
    store.interactions.push(interaction);
    return interaction;
  },

  async getAllInteractions() {
    if (isDBConnected()) {
      const list = await Interaction.find({}).lean();
      if (list && list.length > 0) return list;
    }
    return store.interactions || [];
  },

  async getUserInteractions(userId) {
    if (isDBConnected()) {
      return await Interaction.find({ userId }).lean();
    }
    return (store.interactions || []).filter(i => i.userId === userId);
  },

  // -------------------------------------------------------------
  // VENUES
  // -------------------------------------------------------------
  async listVenues() {
    if (isDBConnected()) {
      const list = await VenueMetadata.find({}).lean();
      if (list && list.length > 0) return list;
    }
    return store.venues;
  },

  async getVenueById(id) {
    if (isDBConnected()) {
      const v = await VenueMetadata.findOne({ id }).lean();
      if (v) return v;
    }
    return store.venues.find(v => v.id === id || v.venueId === id) || null;
  },

  async addVenues(newVenues) {
    if (isDBConnected()) {
      await VenueMetadata.insertMany(newVenues, { ordered: false }).catch(() => {});
    }
    store.venues.push(...newVenues);
    return store.venues.length;
  },
};

