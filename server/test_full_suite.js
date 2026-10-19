// Comprehensive test suite for Priority 1 - 9 deliverables
const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('=== TRIPTANDEM SEARCH & PROVIDER TEST SUITE ===\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Health & Provider Statuses
  await test('Provider Statuses exposes Google Places & StayingAPI safely', async () => {
    const res = await fetch(`${BASE_URL}/api/venues/providers/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const google = (data.data || []).find(p => p.provider === 'google_places');
    const staying = (data.data || []).find(p => p.provider === 'staying_api');
    if (!google || !google.configured) throw new Error('Google Places is not configured');
    if (!staying || !staying.configured) throw new Error('StayingAPI is not configured');
  });

  // 2. Autocomplete
  await test('Autocomplete endpoint returns live & curated recommendations', async () => {
    const res = await fetch(`${BASE_URL}/api/venues/autocomplete?query=Mumba`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.data || data.data.length === 0) throw new Error('No autocomplete data returned');
    const hasMumbai = data.data.some(r => r.name.toLowerCase().includes('mumbai'));
    if (!hasMumbai) throw new Error('Did not find Mumbai in results');
  });

  // 3. Google Places API (New) Live Place Discovery
  await test('Google Places API (New) text search returns genuine live places with attribution', async () => {
    const res = await fetch(`${BASE_URL}/api/venues/google/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Goa', category: 'hotel', limit: 3 })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.data || data.data.length === 0) {
      throw new Error('Google Places did not return places');
    }
    const sample = data.data[0];
    if (!sample.id || !sample.name || !sample.address) {
      throw new Error('Place missing required normalized schema fields');
    }
  });

  // 4. Hotel Offers - Normal flow
  await test('StayingAPI hotel offers responds with valid normalized structure', async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 10);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 14);
    const checkIn = d1.toISOString().split('T')[0];
    const checkOut = d2.toISOString().split('T')[0];

    const res = await fetch(`${BASE_URL}/api/venues/hotels/offers?destination=Goa&checkIn=${checkIn}&checkOut=${checkOut}&guests=2&rooms=1`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.data || data.data.provider !== 'StayingAPI') {
      throw new Error(`Expected provider StayingAPI, got ${data.data?.provider}`);
    }
    if (typeof data.data.totalFound !== 'number') throw new Error('Missing totalFound number');
  });

  // 5. Date Validation - Past Check-in Rejection
  await test('Hotel offers rejects past check-in dates (400)', async () => {
    const pastIn = '2020-01-01';
    const pastOut = '2020-01-05';
    const res = await fetch(`${BASE_URL}/api/venues/hotels/offers?destination=Goa&checkIn=${pastIn}&checkOut=${pastOut}`);
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('past')) throw new Error(`Expected past date error message, got: ${data.message}`);
  });

  // 6. Date Validation - Check-out before or equal to check-in
  await test('Hotel offers rejects check-out on or before check-in (400)', async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 5);
    const inDate = d1.toISOString().split('T')[0];
    const res = await fetch(`${BASE_URL}/api/venues/hotels/offers?destination=Goa&checkIn=${inDate}&checkOut=${inDate}`);
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('strictly later')) throw new Error(`Expected checkout strictly later message, got: ${data.message}`);
  });

  // 7. Date Validation - Beyond 365 Days Max Booking Window
  await test('Hotel offers enforces 365-day maximum booking window (400)', async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() + 400); // 400 days in advance
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 405);
    const inDate = d1.toISOString().split('T')[0];
    const outDate = d2.toISOString().split('T')[0];

    const res = await fetch(`${BASE_URL}/api/venues/hotels/offers?destination=Goa&checkIn=${inDate}&checkOut=${outDate}`);
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('365 days')) throw new Error(`Expected 365-day error message, got: ${data.message}`);
  });

  // 8. Missing Required Parameters
  await test('Hotel offers validates missing parameters (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/venues/hotels/offers`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('required')) throw new Error(`Expected required parameters error, got: ${data.message}`);
  });

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
