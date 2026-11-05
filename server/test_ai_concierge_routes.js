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
  console.log('  🧪 TRIPTANDEM AI CONCIERGE — ROUTE-LEVEL INTEGRATION TEST SUITE       ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  await startServer();

  try {
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
      assert(data.sourceEvents && data.sourceEvents.length > 0, 'Must cite source events');
      assert.strictEqual(data.sourceEvents[0], `venue_${data.suggestedVenueId}`);
    });

    // 2. Strict budget ceiling constraint filtering
    await test('AI Ask respects strict budget ceiling constraint', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find dinner under 800',
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
          question: 'Find vegetarian restaurants near our activity',
          dietaryConstraints: ['vegetarian'],
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      if (!data.noMatch) {
        const tags = (data.venueDetails.dietaryTags || []).map(t => t.toLowerCase());
        assert(tags.some(t => t.includes('vegetarian')), `Venue must be vegetarian, got: ${tags.join(',')}`);
        assert.strictEqual(data.constraintsSatisfied.dietaryMatch, true);
      }
    });

    // 4. Impossible constraint returns clear noMatch: true without inventing venues
    await test('AI Ask returns clear no-match for impossible constraints without inventing venues', async () => {
      const res = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Find a 5-star dinner under ₹5 with vegan and kosher certification',
          budgetCeiling: 5, // Impossible budget
          dietaryConstraints: ['vegan', 'kosher'],
          tripId: 'trip-goa-2026',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.noMatch, true, 'Must return noMatch: true');
      assert.strictEqual(data.suggestedVenueId, null, 'Must have null suggestedVenueId');
      assert.strictEqual(data.venueDetails, null, 'Must not invent fake venue details');
      assert(data.answer.includes('No catalogued venues'), 'Answer must clearly explain no match found');
    });

    // 5. User-facing Concierge route (/api/ai/concierge) returns grounded suggestions
    await test('User-facing AI Concierge (/api/ai/concierge) cites real catalogued venues', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Suggest hotels and stays in Goa',
          tripId: 'trip-goa-2026',
          partySize: 4,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success, 'Response must be success');
      const data = json.data;
      assert(data.suggestions.length > 0, 'Must return verified suggestions');
      data.suggestions.forEach(s => {
        assert(s.venueId, 'Each suggestion must link to real venueId');
        assert(!s.venueName.includes('undefined'), 'Must not have undefined venueName');
        assert(s.source, 'Must have source attribution');
      });
    });

    // 6. User-facing Concierge returns noMatch: true for uncatalogued destination
    await test('User-facing AI Concierge returns clear no-match for unknown destination', async () => {
      const res = await fetch(`${baseUrl}/api/ai/concierge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Plan a trip to Atlantis Moon Base',
          tripId: 'trip-nonexistent-12345',
          partySize: 2,
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert.strictEqual(json.data.noMatch, true, 'Must return noMatch: true');
      assert.strictEqual(json.data.suggestions.length, 0, 'Must return 0 suggestions without inventing venues');
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
