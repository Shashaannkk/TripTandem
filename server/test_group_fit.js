import assert from 'assert';
import { RecommendationService } from './src/services/recommendationService.js';
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
  console.log('  🧪 TRIPTANDEM — GROUP FIT & ITINERARY INTEGRATION TEST               ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const trip = {
    id: 'trip-group-fit-test',
    title: 'Goa Friends Group Adventure',
    destination: 'Goa, India',
    members: [
      { id: 'user-1', name: 'Alex Morgan', role: 'Leader' },
      { id: 'user-2', name: 'Rohan Sharma', role: 'Planner' },
      { id: 'user-3', name: 'Aisha Patel', role: 'Viewer' },
    ],
    budget: { totalTarget: 45000, expenses: [] },
    days: [
      { dayNumber: 1, items: [{ id: 'item-1', title: 'Hotel Checkin', venueId: 'v-hotel-1' }] },
      { dayNumber: 2, items: [] },
      { dayNumber: 3, items: [] },
    ],
  };

  const recs = await RecommendationService.getRecommendationsForGroup(trip, { limit: 5 });

  await test('Hybrid recommender returns non-empty ranked candidate list', () => {
    assert(Array.isArray(recs) && recs.length > 0, 'Must return recommendations');
  });

  await test('Every candidate includes groupFitScore and groupFitPercentage', () => {
    recs.forEach(rec => {
      assert(typeof rec.groupFitScore === 'number', 'groupFitScore must be a number');
      assert(rec.groupFitScore >= 0 && rec.groupFitScore <= 100, `groupFitScore ${rec.groupFitScore} out of bounds`);
      assert(typeof rec.groupFitPercentage === 'number', 'groupFitPercentage must be a number');
    });
  });

  await test('groupFitBreakdown includes alignment for all trip members', () => {
    recs.forEach(rec => {
      assert(Array.isArray(rec.groupFitBreakdown), 'groupFitBreakdown must be an array');
      assert.strictEqual(rec.groupFitBreakdown.length, 3, 'Must have 3 member breakdowns');
      const names = rec.groupFitBreakdown.map(m => m.name);
      assert(names.includes('Alex Morgan'));
      assert(names.includes('Rohan Sharma'));
      assert(names.includes('Aisha Patel'));
      rec.groupFitBreakdown.forEach(b => {
        assert(['High', 'Moderate', 'Neutral'].includes(b.alignment), `Invalid alignment: ${b.alignment}`);
        assert(b.fitScore >= 0 && b.fitScore <= 100, 'fitScore out of bounds');
      });
    });
  });

  await test('itinerarySlot provides suggestedDay, suggestedTimeSlot, and proposedTime', () => {
    recs.forEach(rec => {
      assert(rec.itinerarySlot, 'itinerarySlot must be present');
      assert([1, 2, 3].includes(rec.itinerarySlot.suggestedDay), 'suggestedDay must be valid day');
      assert(
        ['morning', 'afternoon', 'evening', 'night'].includes(rec.itinerarySlot.suggestedTimeSlot),
        `Invalid timeSlot: ${rec.itinerarySlot.suggestedTimeSlot}`
      );
      assert(typeof rec.itinerarySlot.proposedTime === 'string', 'proposedTime must be a string');
      assert(typeof rec.itinerarySlot.duration === 'string', 'duration must be a string');
    });
  });

  console.log(`\nResults: ${passed}/${total} tests passed.\n`);
  process.exit(passed === total ? 0 : 1);
}

run();

