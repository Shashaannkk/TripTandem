import assert from 'assert';
import mongoose from 'mongoose';
import { dataService } from './src/services/dataService.js';
import { connectDB, closeDB } from './src/db.js';

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🧪 TRIPTANDEM — REAL CONCURRENCY & CONFLICT DETECTION TEST            ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  // Test 1: In-memory optimistic concurrency conflict detection
  await test('Simultaneous concurrent edits reject stale version in in-memory mode', async () => {
    const trip = await dataService.createTrip({
      title: 'Concurrency Test Trip',
      destination: 'Goa',
      days: [
        {
          dayNumber: 1,
          items: [
            {
              id: 'item-conc-1',
              dayNumber: 1,
              title: 'Initial Beach Walk',
              timeSlot: 'morning',
              positionVersion: 1,
            },
          ],
        },
      ],
      members: [{ id: 'user-a', name: 'User A', role: 'Planner' }],
    });

    // Simulate User A and User B both reading positionVersion = 1
    const userAUpdate = dataService.updateItemWithConcurrency(trip.id, 'item-conc-1', {
      positionVersion: 1,
      title: 'User A Beach Walk',
    });

    const userBUpdate = dataService.updateItemWithConcurrency(trip.id, 'item-conc-1', {
      positionVersion: 1,
      title: 'User B Water Sports',
    });

    const [resA, resB] = await Promise.all([userAUpdate, userBUpdate]);

    // Exactly one must succeed and one must conflict
    const successCount = [resA, resB].filter(r => r.success).length;
    const conflictCount = [resA, resB].filter(r => r.conflict).length;

    assert.strictEqual(successCount, 1, 'Exactly one concurrent update must succeed');
    assert.strictEqual(conflictCount, 1, 'The competing update must report a conflict');

    const conflictRes = resA.conflict ? resA : resB;
    assert.strictEqual(conflictRes.currentServerVersion, 2, 'Server version must be incremented to 2');
    assert.ok(conflictRes.error.includes('Concurrent edit conflict'), 'Must have descriptive conflict error');
  });

  // Test 2: Live MongoDB concurrency & conflict handling
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/triptandem';
  process.env.MONGODB_URI = mongoUri;

  let dbConnected = false;
  try {
    await connectDB();
    dbConnected = true;
  } catch (e) {
    console.log(`ℹ️ [Database] Local MongoDB unavailable (${e.message}). Skipping DB concurrency step.`);
  }

  if (dbConnected) {
    await test('Simultaneous concurrent edits reject stale version in persistent MongoDB', async () => {
      const trip = await dataService.createTrip({
        id: `trip-conc-${Date.now()}`,
        title: 'DB Concurrency Trip',
        destination: 'Goa',
        days: [
          {
            dayNumber: 1,
            items: [
              {
                id: 'item-db-conc-1',
                dayNumber: 1,
                title: 'Live DB Scuba',
                timeSlot: 'afternoon',
                positionVersion: 1,
              },
            ],
          },
        ],
        members: [{ id: 'user-db-a', name: 'User DB A', role: 'Planner' }],
      });

      // User A and User B both attempt to update version 1 concurrently
      const [resA, resB] = await Promise.all([
        dataService.updateItemWithConcurrency(trip.id, 'item-db-conc-1', {
          positionVersion: 1,
          title: 'User A DB Scuba Session',
        }),
        dataService.updateItemWithConcurrency(trip.id, 'item-db-conc-1', {
          positionVersion: 1,
          title: 'User B DB Dolphin Spotting',
        }),
      ]);

      const successCount = [resA, resB].filter(r => r.success).length;
      const conflictCount = [resA, resB].filter(r => r.conflict).length;

      assert.strictEqual(successCount, 1, 'Exactly one concurrent DB save must succeed');
      assert.strictEqual(conflictCount, 1, 'Concurrent DB save with stale version must conflict');

      const conflictRes = resA.conflict ? resA : resB;
      assert.strictEqual(conflictRes.currentServerVersion, 2, 'Authoritative server version is 2');
      assert.ok(conflictRes.authoritativeTrip, 'Must return authoritative trip');

      // Verify authoritative trip item in DB has new version 2
      const fetched = await dataService.getTripById(trip.id);
      const dbItem = fetched.days[0].items.find(i => i.id === 'item-db-conc-1');
      assert.strictEqual(dbItem.positionVersion, 2);

      await closeDB();
    });
  }

  console.log(`\nResults: ${passed}/${total} concurrency tests passed.\n`);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
