/**
 * TripTandem Admin Ingestion & Visualizer Integration Test
 * Verifies the complete end-to-end flow used by AdminDatasetUploadModal:
 * 1. Schema constraint validation & error reporting (422)
 * 2. Successful Admin dataset ingestion & persistence (201)
 * 3. Persisted database catalog retrieval via GET /api/venues/:destination/venues
 * 4. Role-based authorization enforcement (403 for non-Admin)
 */

import assert from 'assert';
import http from 'http';
import { app } from './src/index.js';
import { generateAccessToken } from './src/middleware/auth.js';

let server;
let baseUrl;

const adminToken = generateAccessToken({
  id: 'admin-user',
  email: 'admin@triptandem.travel',
  name: 'System Admin',
  role: 'Admin',
});

const plannerToken = generateAccessToken({
  id: 'planner-user',
  email: 'planner@triptandem.travel',
  name: 'Trip Planner',
  role: 'Planner',
});

async function startServer() {
  return new Promise((resolve, reject) => {
    const testPort = 3094;
    server = http.createServer(app);
    server.listen(testPort, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${testPort}`;
      resolve();
    });
    server.on('error', reject);
  });
}

async function stopServer() {
  if (server) {
    await new Promise((r) => server.close(r));
  }
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🧪 TRIPTANDEM — ADMIN INGESTION & VISUALIZER INTEGRATION TEST        ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  await startServer();

  try {
    // 1. Test Schema Validation Errors (422 Unprocessable Entity)
    console.log('1. Testing PRD schema constraint validation error reporting...');
    const invalidPayload = {
      destination: 'Udaipur, Rajasthan',
      venues: [
        {
          name: 'Invalid Price Venue',
          pricePerPerson: -250, // Invalid: must be positive
          coordinates: { lat: 24.5854, lng: 73.6844 },
          hours: { open: '12:00', close: '23:00' },
          dietaryTags: ['vegetarian'],
        },
        {
          name: 'Invalid Coordinates Venue',
          pricePerPerson: 1000,
          coordinates: { lat: 195.0, lng: 73.6844 }, // Invalid: lat must be [-90, 90]
          hours: { open: '12:00', close: '23:00' },
          dietaryTags: ['vegetarian'],
        },
        {
          name: 'Invalid Dietary Tag Venue',
          pricePerPerson: 1200,
          coordinates: { lat: 24.5854, lng: 73.6844 },
          hours: { open: '12:00', close: '23:00' },
          dietaryTags: ['paleo-synthetic-unapproved'], // Invalid tag vocabulary
        },
      ],
    };

    const errRes = await fetch(`${baseUrl}/api/venues/dataset/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(invalidPayload),
    });

    assert.strictEqual(errRes.status, 422, 'Must return HTTP 422 on schema violation');
    const errData = await errRes.json();
    assert.strictEqual(errData.success, false);
    assert(errData.errors && errData.errors.length >= 3, 'Must return structured errors array matching UI');
    console.log(`   • Correctly caught ${errData.errors.length} validation errors:`);
    errData.errors.forEach((e) => console.log(`     - ${e}`));
    console.log('   • Status: ✅ PASSED\n');

    // 2. Test Non-Admin Role Rejection (403 Forbidden)
    console.log('2. Testing RBAC enforcement for non-Admin users...');
    const rbacRes = await fetch(`${baseUrl}/api/venues/dataset/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${plannerToken}`,
      },
      body: JSON.stringify({ destination: 'Udaipur', venues: [] }),
    });
    assert.strictEqual(rbacRes.status, 403, 'Planner must be rejected with 403 Forbidden');
    console.log('   • Status: ✅ PASSED\n');

    // 3. Test Successful Dataset Ingestion (201 Created)
    console.log('3. Testing valid dataset ingestion & persistence...');
    const targetDestination = 'Udaipur, Rajasthan';
    const validVenues = [
      {
        name: 'Tribute by the Lake',
        category: 'dinner',
        pricePerPerson: 1200,
        dietaryTags: ['vegetarian', 'vegan', 'halal'],
        hours: { open: '12:00', close: '23:00' },
        coordinates: { lat: 24.5854, lng: 73.6844 },
        description: 'Fine dining overlooking Lake Pichola with dedicated vegan menu.',
      },
      {
        name: 'Fateh Prakash Palace Sunset Terrace',
        category: 'stay',
        pricePerPerson: 6500,
        dietaryTags: ['vegetarian', 'jain'],
        hours: { open: '07:00', close: '23:00' },
        coordinates: { lat: 24.5762, lng: 73.6828 },
        description: 'Historic luxury heritage wing with royal courtyard and palace views.',
      },
    ];

    const uploadRes = await fetch(`${baseUrl}/api/venues/dataset/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ destination: targetDestination, venues: validVenues }),
    });

    assert.strictEqual(uploadRes.status, 201, 'Must return HTTP 201 Created');
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadData.success, true);
    assert.strictEqual(uploadData.ingestedCount, 2);
    console.log(`   • Ingested ${uploadData.ingestedCount} venues for "${targetDestination}"`);
    console.log('   • Status: ✅ PASSED\n');

    // 4. Test Persisted Catalog Retrieval (Used by UI "Persisted DB Catalog" tab)
    console.log('4. Testing catalog view retrieval for persisted records...');
    const getRes = await fetch(`${baseUrl}/api/venues/${encodeURIComponent(targetDestination)}/venues`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(getRes.status, 200, 'Must return HTTP 200 OK');
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert(getData.venues && getData.venues.length >= 2, 'Must return persisted venues list');

    const tribute = getData.venues.find((v) => v.name === 'Tribute by the Lake');
    assert(tribute, 'Persisted venue "Tribute by the Lake" must be present');
    assert.strictEqual(tribute.pricePerPerson, 1200);
    assert.strictEqual(tribute.hours.open, '12:00');
    assert.strictEqual(tribute.hours.close, '23:00');

    const palace = getData.venues.find((v) => v.name === 'Fateh Prakash Palace Sunset Terrace');
    assert(palace, 'Persisted venue "Fateh Prakash Palace Sunset Terrace" must be present');
    assert.strictEqual(palace.pricePerPerson, 6500);

    console.log(`   • Successfully verified persisted venue: "${tribute.name}" (₹${tribute.pricePerPerson})`);
    console.log(`   • Successfully verified persisted venue: "${palace.name}" (₹${palace.pricePerPerson})`);
    console.log('   • Status: ✅ PASSED\n');

    console.log('========================================================================');
    console.log('  🎉 ALL ADMIN INGESTION & VISUALIZER INTEGRATION TESTS PASSED (4/4)');
    console.log('========================================================================\n');
    process.exit(0);
  } finally {
    await stopServer();
  }
}

run().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});

