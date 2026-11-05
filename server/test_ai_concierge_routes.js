import assert from 'assert';
import http from 'http';
import { app } from './src/index.js';
import { dataService } from './src/services/dataService.js';

let server;
let baseUrl;
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

async function startServer() {
  return new Promise((resolve, reject) => {
    const testPort = 3098;
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
    await new Promise((res) => server.close(res));
  }
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🧪 TRIPTANDEM AI CONCIERGE — FULL CONSTRAINT & GROUNDING REGRESSION   ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  await startServer();

  try {
    // -------------------------------------------------------------------------
    // A. AI Ask (/api/ai/ask) Regression Tests
    // -------------------------------------------------------------------------

    // 1. Grounded RAG query returns real catalogued venue with citations
    await test('AI Ask returns real catalogued venue record with citation', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find a dining spot in Goa',
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, false);
      assert(data.suggestedVenueId, 'Must return suggestedVenueId');
      assert(data.venueDetails, 'Must return venueDetails');
      assert(data.venueDetails.name, 'Must have venue name');
      assert(data.citations && data.citations.length > 0, 'Must include citations array');
      assert.strictEqual(data.citations[0].venueId, data.suggestedVenueId, 'Citation must match suggested venue ID');
    });

    // 2. Strict budget ceiling constraint filtering
    await test('AI Ask respects strict budget ceiling constraint', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find dinner under 800 in Goa',
          budgetCeiling: 800,
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      if (!data.noMatch) {
        assert(data.venueDetails.pricePerPerson <= 800, `Price ${data.venueDetails.pricePerPerson} must be <= 800`);
        assert.strictEqual(data.constraintsSatisfied.budgetCeiling, true);
      }
    });

    // 3. Strict dietary requirements filtering
    await test('AI Ask respects strict vegetarian dietary requirement', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find vegetarian restaurants near our activity in Goa',
          dietaryConstraints: ['vegetarian'],
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      if (!data.noMatch) {
        const tags = (data.venueDetails.dietaryTags || []).map(t => t.toLowerCase());
        assert(tags.some(t => t.includes('vegetarian') || t.includes('veg')), `Venue must be vegetarian, got: ${tags.join(',')}`);
        assert.strictEqual(data.constraintsSatisfied.dietaryMatch, true);
      }
    });

    // 4. Strict anchor proximity radius constraint
    await test('AI Ask respects anchor proximity radius constraint', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find a spot in Goa close to anchor',
          tripId: 'trip-goa-2026',
          anchorCoords: { lat: 15.492, lng: 73.773 },
          radiusKm: 25.0,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, false);
      assert.strictEqual(data.constraintsSatisfied.proximityRadiusKm, true);
    });

    // 5. Strict opening hours window plus buffer constraint
    await test('AI Ask respects opening hours window plus buffer constraint', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find a place in Goa open at 20:00 (8:00 PM)',
          tripId: 'trip-goa-2026',
          requestedTime: '20:00',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, false);
      assert.strictEqual(data.constraintsSatisfied.openingHoursMatch, true);
    });

    // 6. Impossible constraints return clear noMatch: true without inventing venues
    await test('AI Ask returns clear no-match for impossible constraints without inventing venues', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find a 5-star dinner under ₹5 with vegan and kosher certification in Goa',
          budgetCeiling: 5,
          dietaryConstraints: ['vegan', 'kosher'],
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, true, 'Must return noMatch: true');
      assert.strictEqual(data.suggestedVenueId, null, 'Must have null suggestedVenueId');
      assert.strictEqual(data.venueDetails, null, 'Must not invent fake venue details');
      assert.strictEqual(data.citations.length, 0, 'Must have 0 citations on noMatch');
    });

    // 7. Unknown destination returns clear noMatch: true without substituting Goa
    await test('AI Ask returns clear no-match for unknown destination without substituting Goa', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find seafood dinner in Atlantis Moon Base',
          tripId: 'trip-nonexistent-777',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, true, 'Must return noMatch: true for uncatalogued destination');
      assert.strictEqual(data.suggestedVenueId, null);
    });

    // -------------------------------------------------------------------------
    // B. User-Facing Concierge (/api/ai/concierge) Regression Tests
    // -------------------------------------------------------------------------

    // 8. User-facing Concierge cites real catalogued venues
    await test('User-facing AI Concierge cites real catalogued venues and citations', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Suggest stays in Goa',
          tripId: 'trip-goa-2026',
          partySize: 4,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success, 'Response must be success');
      const data = json.data;
      assert.strictEqual(data.noMatch, false);
      assert(data.suggestions.length > 0, 'Must return verified suggestions');
      assert(data.citations && data.citations.length > 0, 'Must return real citations');
      data.suggestions.forEach(s => {
        assert(s.venueId, 'Each suggestion must link to real venueId');
        assert(!s.venueName.includes('undefined'), 'Must not have undefined venueName');
        assert(s.source, 'Must have source attribution');
      });
    });

    // 9. User-facing Concierge respects category filtering (hotels query returns only stays)
    await test('User-facing AI Concierge respects requested category strictly', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Suggest hotels and resorts in Goa',
          tripId: 'trip-goa-2026',
          partySize: 2,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert.strictEqual(json.data.noMatch, false);
      json.data.suggestions.forEach(s => {
        const cat = s.category.toLowerCase();
        assert(cat === 'stay' || cat === 'hotel' || cat === 'resort' || cat === 'beaches', `Category must be lodging, got: ${cat}`);
      });
    });

    // 10. User-facing Concierge respects budget ceiling
    await test('User-facing AI Concierge respects strict budget ceiling', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Suggest dining in Goa under 1000',
          budgetCeiling: 1000,
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      if (!json.data.noMatch) {
        json.data.suggestions.forEach(s => {
          assert(s.estimatedCostPerPerson <= 1000, `Estimated cost ${s.estimatedCostPerPerson} must be <= 1000`);
        });
      }
    });

    // 11. User-facing Concierge returns noMatch for impossible budget ceiling
    await test('User-facing AI Concierge returns clear no-match for impossible budget ceiling', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Find luxury 5-star hotel in Goa under 10',
          budgetCeiling: 10,
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert.strictEqual(json.data.noMatch, true, 'Must return noMatch: true');
      assert.strictEqual(json.data.suggestions.length, 0);
      assert.strictEqual(json.data.citations.length, 0);
    });

    // 12. User-facing Concierge returns noMatch for uncatalogued destination without fallback
    await test('User-facing AI Concierge returns clear no-match for unknown destination', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Plan a weekend trip to Xyzkjhdskj Moon City 99999',
          tripId: 'trip-nonexistent-999',
          partySize: 2,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert.strictEqual(json.data.noMatch, true, 'Must return noMatch: true');
      assert.strictEqual(json.data.suggestions.length, 0, 'Must return 0 suggestions without inventing venues');
      assert.strictEqual(json.data.citations.length, 0);
    });

  } finally {
    await stopServer();
  }

  console.log(`\nResults: ${passed}/${total} AI Concierge route tests passed.\n`);
  process.exit(passed === total ? 0 : 1);
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
