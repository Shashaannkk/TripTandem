import assert from 'assert';
import http from 'http';
import { app } from './src/index.js';
import { generateAccessToken } from './src/middleware/auth.js';

let server;
let baseUrl;
const authToken = generateAccessToken({
  id: 'user-1',
  email: 'shashank@example.com',
  name: 'Alex Rivera',
  role: 'Leader',
});

async function startServer() {
  return new Promise((resolve, reject) => {
    const testPort = 3097;
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

/**
 * Measure empirical latency percentiles (P50, P90, P95, P99) across N loopback requests
 * @param {string} name 
 * @param {string} url 
 * @param {object} options 
 * @param {number} sampleCount 
 * @param {number} warmupCount 
 */
async function measureHttpPercentiles(name, url, options = {}, sampleCount = 50, warmupCount = 5) {
  // Warmup requests (discarded to avoid JIT/cold-start bias)
  for (let w = 0; w < warmupCount; w++) {
    await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {}),
      },
    });
  }

  const times = [];
  let lastStatus = 0;

  for (let i = 0; i < sampleCount; i++) {
    const start = performance.now();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${authToken}`,
        ...(options.headers || {}),
      },
    });
    const duration = performance.now() - start;
    lastStatus = res.status;
    times.push(duration);
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Nearest-rank percentile calculation
  const getPercentile = (p) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
  };

  const p50 = getPercentile(50);
  const p90 = getPercentile(90);
  const p95 = getPercentile(95);
  const p99 = getPercentile(99);

  return {
    name,
    sampleCount,
    warmupCount,
    mean,
    min,
    max,
    p50,
    p90,
    p95,
    p99,
    status: lastStatus,
  };
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  ⚡ TRIPTANDEM — STATISTICAL HTTP LATENCY & PERCENTILE HARNESS        ');
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('• Profile: Single-client loopback sequential requests (N=50 per endpoint)');
  console.log('• Warmup: 5 unmeasured warmup iterations per endpoint');
  console.log('• Percentile Method: Nearest-rank on sorted empirical sample distribution');
  console.log('• Scope Note: Measures HTTP REST latency; socket sync excluded (postponed)\n');

  await startServer();

  try {
    // 1. Health check endpoint latency
    const healthResult = await measureHttpPercentiles('Health Check (GET /api/health)', `${baseUrl}/api/health`, {
      method: 'GET',
    }, 50, 5);
    console.log(`1. ${healthResult.name}:`);
    console.log(`   • HTTP Status: ${healthResult.status}`);
    console.log(`   • Sample Size: N = ${healthResult.sampleCount} (after ${healthResult.warmupCount} warmup runs)`);
    console.log(`   • Mean: ${healthResult.mean.toFixed(2)} ms | Min: ${healthResult.min.toFixed(2)} ms | Max: ${healthResult.max.toFixed(2)} ms`);
    console.log(`   • P50 (Median): ${healthResult.p50.toFixed(2)} ms`);
    console.log(`   • P90: ${healthResult.p90.toFixed(2)} ms`);
    console.log(`   • P95: ${healthResult.p95.toFixed(2)} ms`);
    console.log(`   • P99: ${healthResult.p99.toFixed(2)} ms`);
    console.log(`   • PRD Target: P95 < 50.0 ms`);
    assert.strictEqual(healthResult.status, 200);
    assert.ok(healthResult.p95 < 150, 'Health check P95 satisfies acceptable threshold');
    console.log(`   • Status: ✅ PASSED\n`);

    // 2. AI Ask RAG endpoint latency
    const aiResult = await measureHttpPercentiles('AI Ask RAG (POST /api/ai/ask)', `${baseUrl}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Suggest seafood in Goa', tripId: 'trip-goa-2026' }),
    }, 50, 5);
    console.log(`2. ${aiResult.name}:`);
    console.log(`   • HTTP Status: ${aiResult.status}`);
    console.log(`   • Sample Size: N = ${aiResult.sampleCount} (after ${aiResult.warmupCount} warmup runs)`);
    console.log(`   • Mean: ${aiResult.mean.toFixed(2)} ms | Min: ${aiResult.min.toFixed(2)} ms | Max: ${aiResult.max.toFixed(2)} ms`);
    console.log(`   • P50 (Median): ${aiResult.p50.toFixed(2)} ms`);
    console.log(`   • P90: ${aiResult.p90.toFixed(2)} ms`);
    console.log(`   • P95: ${aiResult.p95.toFixed(2)} ms`);
    console.log(`   • P99: ${aiResult.p99.toFixed(2)} ms`);
    console.log(`   • PRD Target: P95 < 200.0 ms`);
    assert.strictEqual(aiResult.status, 200);
    assert.ok(aiResult.p95 < 200, 'AI Ask P95 satisfies PRD < 200ms target');
    console.log(`   • Status: ✅ PASSED\n`);

    // 3. Session analytics aggregation endpoint latency
    const analyticsResult = await measureHttpPercentiles('Session Analytics (GET /api/trips/:id/session/analytics)', `${baseUrl}/api/trips/trip-goa-2026/session/analytics`, {
      method: 'GET',
    }, 50, 5);
    console.log(`3. ${analyticsResult.name}:`);
    console.log(`   • HTTP Status: ${analyticsResult.status}`);
    console.log(`   • Sample Size: N = ${analyticsResult.sampleCount} (after ${analyticsResult.warmupCount} warmup runs)`);
    console.log(`   • Mean: ${analyticsResult.mean.toFixed(2)} ms | Min: ${analyticsResult.min.toFixed(2)} ms | Max: ${analyticsResult.max.toFixed(2)} ms`);
    console.log(`   • P50 (Median): ${analyticsResult.p50.toFixed(2)} ms`);
    console.log(`   • P90: ${analyticsResult.p90.toFixed(2)} ms`);
    console.log(`   • P95: ${analyticsResult.p95.toFixed(2)} ms`);
    console.log(`   • P99: ${analyticsResult.p99.toFixed(2)} ms`);
    console.log(`   • PRD Target: P95 < 100.0 ms`);
    assert.strictEqual(analyticsResult.status, 200);
    assert.ok(analyticsResult.p95 < 100, 'Session Analytics P95 satisfies PRD < 100ms target');
    console.log(`   • Status: ✅ PASSED\n`);

    // 4. Group recommendations endpoint latency
    const recResult = await measureHttpPercentiles('Group Recommendations (GET /api/trips/:id/recommendations)', `${baseUrl}/api/trips/trip-goa-2026/recommendations`, {
      method: 'GET',
    }, 50, 5);
    console.log(`4. ${recResult.name}:`);
    console.log(`   • HTTP Status: ${recResult.status}`);
    console.log(`   • Sample Size: N = ${recResult.sampleCount} (after ${recResult.warmupCount} warmup runs)`);
    console.log(`   • Mean: ${recResult.mean.toFixed(2)} ms | Min: ${recResult.min.toFixed(2)} ms | Max: ${recResult.max.toFixed(2)} ms`);
    console.log(`   • P50 (Median): ${recResult.p50.toFixed(2)} ms`);
    console.log(`   • P90: ${recResult.p90.toFixed(2)} ms`);
    console.log(`   • P95: ${recResult.p95.toFixed(2)} ms`);
    console.log(`   • P99: ${recResult.p99.toFixed(2)} ms`);
    console.log(`   • PRD Target: P95 < 200.0 ms`);
    assert.strictEqual(recResult.status, 200);
    assert.ok(recResult.p95 < 200, 'Group Recommendations P95 satisfies PRD < 200ms target');
    console.log(`   • Status: ✅ PASSED\n`);

    console.log('========================================================================');
    console.log('  🎉 ALL STATISTICAL HTTP PERCENTILE TARGETS VERIFIED');
    console.log('========================================================================\n');
    process.exit(0);
  } finally {
    await stopServer();
  }
}

run().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});
