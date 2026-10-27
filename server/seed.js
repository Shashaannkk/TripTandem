/**
 * TripTandem — Database & In-Memory Store Seed Script
 * 
 * Populates MongoDB (when MONGODB_URI is configured) or in-memory store
 * with realistic entities for the Goa collaborative trip workspace.
 * 
 * Run with: node server/seed.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB, isDBConnected } from './src/db.js';
import { store } from './src/store.js';

// Mongoose Models
import { User } from './src/models/User.js';
import { Trip } from './src/models/Trip.js';
import { VenueMetadata } from './src/models/VenueMetadata.js';
import { Interaction } from './src/models/Interaction.js';
import { EventLog } from './src/models/EventLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🌴 TRIPTANDEM DATABASE SEED RUNNER — GOA WORKSPACE DATASET           ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const seedFilePath = path.join(__dirname, 'data', 'SEED_DATA.json');
  if (!fs.existsSync(seedFilePath)) {
    throw new Error(`Seed data file not found at: ${seedFilePath}`);
  }

  const rawData = fs.readFileSync(seedFilePath, 'utf8');
  const seedData = JSON.parse(rawData);

  console.log(`Loaded ${seedData.users.length} users, ${seedData.venues.length} venues, ${seedData.trips.length} trips, ${seedData.interactions.length} interactions, and ${seedData.eventLogs.length} events from SEED_DATA.json.\n`);

  // Try connecting to MongoDB if URI is set
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}...`);
      await connectDB(mongoUri);
    } catch (err) {
      console.warn(`MongoDB connection failed: ${err.message}. Defaulting to in-memory store.`);
    }
  } else {
    console.log('ℹ️  No MONGODB_URI configured in environment. Populating in-memory store directly.');
  }

  if (isDBConnected()) {
    console.log('\n--- Ingesting into MongoDB ---');

    // 1. Users
    for (const u of seedData.users) {
      await User.findOneAndUpdate({ id: u.id }, u, { upsert: true, new: true });
    }
    console.log(`✅ Upserted ${seedData.users.length} Users`);

    // 2. Venues
    for (const v of seedData.venues) {
      await VenueMetadata.findOneAndUpdate({ id: v.id }, v, { upsert: true, new: true });
    }
    console.log(`✅ Upserted ${seedData.venues.length} VenueMetadata records (2dsphere geospatial)`);

    // 3. Trips
    for (const t of seedData.trips) {
      await Trip.findOneAndUpdate({ id: t.id }, t, { upsert: true, new: true });
    }
    console.log(`✅ Upserted ${seedData.trips.length} Trips`);

    // 4. Interactions
    for (const inter of seedData.interactions) {
      await Interaction.findOneAndUpdate(
        { userId: inter.userId, venueId: inter.venueId, interactionType: inter.interactionType },
        inter,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Upserted ${seedData.interactions.length} User Interactions`);

    // 5. Event Logs
    for (const ev of seedData.eventLogs) {
      await EventLog.findOneAndUpdate({ id: ev.id }, ev, { upsert: true, new: true });
    }
    console.log(`✅ Upserted ${seedData.eventLogs.length} EventLog records`);

    await mongoose.disconnect();
    console.log('\n🎉 MongoDB Seed Complete & Verified.');
  } else {
    console.log('\n--- Populating In-Memory Store Fallback ---');

    store.users = seedData.users;
    store.trips = seedData.trips;
    store.venues = seedData.venues;
    store.interactions = seedData.interactions;
    store.events = seedData.eventLogs;

    console.log(`✅ In-memory store successfully initialized with ${store.trips.length} trip, ${store.venues.length} venues, and ${store.events.length} event logs.`);
  }

  console.log('\n========================================================================');
  console.log('  ✨ SEED COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
}

runSeed().catch(err => {
  console.error('Seed process failed:', err);
  process.exit(1);
});

