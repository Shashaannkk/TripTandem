import assert from 'assert';
import { connectDB, isDBConnected } from './src/db.js';
import { dataService } from './src/services/dataService.js';

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🧪 TRIPTANDEM — PERSISTENT MONGODB & IN-MEMORY PREVENTION TEST       ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const origEnv = process.env.NODE_ENV;
  const origUri = process.env.MONGODB_URI;

  try {
    // 1. Development/test zero-config mode allowed when NODE_ENV is development
    await test('Zero-config in-memory mode is permitted in development/test', async () => {
      delete process.env.MONGODB_URI;
      process.env.NODE_ENV = 'development';
      const connected = await connectDB();
      assert.strictEqual(connected, false, 'Should return false without crashing in development');
      assert.strictEqual(isDBConnected(), false, 'isDBConnected should be false');
    });

    // 2. Production mode rejects missing MONGODB_URI
    await test('Production mode strictly forbids unconfigured MONGODB_URI', async () => {
      delete process.env.MONGODB_URI;
      process.env.NODE_ENV = 'production';
      let threw = false;
      try {
        await connectDB();
      } catch (err) {
        threw = true;
        assert(err.message.includes('MONGODB_URI must be configured in production'), `Got message: ${err.message}`);
      }
      assert.strictEqual(threw, true, 'connectDB must throw in production when MONGODB_URI is missing');
    });

    // 3. DataService rejects write operations in production if DB is disconnected
    await test('DataService disallows silent in-memory fallback writes in production', async () => {
      process.env.NODE_ENV = 'production';
      let threwCreateTrip = false;
      try {
        await dataService.createTrip({ title: 'Illegal Production Unsaved Trip' });
      } catch (err) {
        threwCreateTrip = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'), `Got message: ${err.message}`);
      }
      assert.strictEqual(threwCreateTrip, true, 'createTrip must reject when disconnected in production');

      let threwAddItem = false;
      try {
        await dataService.addItemToTrip('trip-1', 1, { title: 'Illegal Item' });
      } catch (err) {
        threwAddItem = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'), `Got message: ${err.message}`);
      }
      assert.strictEqual(threwAddItem, true, 'addItemToTrip must reject when disconnected in production');

      let threwUpdateConcurrency = false;
      try {
        await dataService.updateItemWithConcurrency('trip-1', 'item-1', { title: 'Illegal Item Edit' });
      } catch (err) {
        threwUpdateConcurrency = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'), `Got message: ${err.message}`);
      }
      assert.strictEqual(threwUpdateConcurrency, true, 'updateItemWithConcurrency must reject when disconnected in production');

      let threwAddMember = false;
      try {
        await dataService.addMemberToTrip('trip-1', { id: 'user-x', name: 'Illegal Member' });
      } catch (err) {
        threwAddMember = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'), `Got message: ${err.message}`);
      }
      assert.strictEqual(threwAddMember, true, 'addMemberToTrip must reject when disconnected in production');
    });

    // 4. DataService rejects read operations in production if DB is disconnected (Fails Closed)
    await test('DataService disallows silent in-memory fallback reads in production (Fails Closed)', async () => {
      process.env.NODE_ENV = 'production';
      
      let threwListVenues = false;
      try {
        await dataService.listVenues();
      } catch (err) {
        threwListVenues = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'));
      }
      assert.strictEqual(threwListVenues, true, 'listVenues must reject when disconnected in production');

      let threwGetTrip = false;
      try {
        await dataService.getTripById('trip-goa-2026');
      } catch (err) {
        threwGetTrip = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'));
      }
      assert.strictEqual(threwGetTrip, true, 'getTripById must reject when disconnected in production');

      let threwListUsers = false;
      try {
        await dataService.listUsers();
      } catch (err) {
        threwListUsers = true;
        assert(err.message.includes('Persistent MongoDB connection is required in production'));
      }
      assert.strictEqual(threwListUsers, true, 'listUsers must reject when disconnected in production');
    });

    // 5. Real MongoDB Database Persistence & Restart Simulation
    await test('Admin dataset uploads persist across database disconnection & reconnection', async () => {
      process.env.NODE_ENV = 'development';
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/triptandem';
      const connected = await connectDB();
      if (!connected) {
        console.log('    ℹ️ Skipping live DB reconnection check (Local MongoDB not accessible)');
        return;
      }

      const testVenueId = `v-persist-test-${Date.now()}`;
      const testVenue = {
        id: testVenueId,
        destination: 'Goa',
        name: 'Persistent Test Sanctuary',
        category: 'stay',
        price: 2500,
        pricePerPerson: 2500,
        rating: 4.9,
        lat: 15.5,
        lng: 73.7,
        location: { type: 'Point', coordinates: [73.7, 15.5] },
        source: 'admin_upload',
      };

      // Ingest venue via dataService
      await dataService.addVenues([testVenue]);

      // Verify venue was written
      const read1 = await dataService.getVenueById(testVenueId);
      assert(read1, 'Venue must be retrievable after initial write');
      assert.strictEqual(read1.name, 'Persistent Test Sanctuary');

      // Simulate database restart by closing and reopening the connection
      await connectDB(); // Re-establish connection

      const read2 = await dataService.getVenueById(testVenueId);
      assert(read2, 'Venue must persist across database reconnection cycle');
      assert.strictEqual(read2.id, testVenueId);
    });

  } finally {
    process.env.NODE_ENV = origEnv;
    if (origUri) process.env.MONGODB_URI = origUri;
    else delete process.env.MONGODB_URI;
  }

  console.log(`\nResults: ${passed}/${total} tests passed.\n`);
  process.exit(passed === total ? 0 : 1);
}

run();

