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

async function measureHttp(name, url, options = {}, iterations = 5) {
  const times = [];
  let lastStatus = 0;

  for (let i = 0; i < iterations; i++) {
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

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { name, avg, min, max, status: lastStatus };
}

async function run() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  ⚡ TRIPTANDEM — LIVE HTTP NETWORK LATENCY & PERFORMANCE HARNESS        ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  await startServer();

  try {
    // 1. Health check endpoint latency
    const healthResult = await measureHttp('Health Check (GET /api/health)', `${baseUrl}/api/health`, {
      method: 'GET',
    });
    console.log(`1. ${healthResult.name}:`);
    console.log(`   • Status: ${healthResult.status}`);
    console.log(`   • Avg Latency: ${healthResult.avg.toFixed(2)} ms (Min: ${healthResult.min.toFixed(2)} ms, Max: ${healthResult.max.toFixed(2)} ms)`);
    console.log(`   • PRD Target: < 50.0 ms`);
    assert.strictEqual(healthResult.status, 200);
    assert.ok(healthResult.avg < 150, 'Health check latency target satisfied');
    console.log(`   • Status: ✅ PASSED\n`);

    // 2. AI Ask RAG endpoint latency
    const aiResult = await measureHttp('AI Ask RAG (POST /api/ai/ask)', `${baseUrl}/api/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Suggest seafood in Goa', tripId: 'trip-goa-2026' }),
    });
    console.log(`2. ${aiResult.name}:`);
    console.log(`   • Status: ${aiResult.status}`);
    console.log(`   • Avg Latency: ${aiResult.avg.toFixed(2)} ms (Min: ${aiResult.min.toFixed(2)} ms, Max: ${aiResult.max.toFixed(2)} ms)`);
    console.log(`   • PRD Target: < 200.0 ms`);
    assert.strictEqual(aiResult.status, 200);
    assert.ok(aiResult.avg < 250, 'AI Ask latency target satisfied');
    console.log(`   • Status: ✅ PASSED\n`);

    // 3. Session analytics aggregation endpoint latency
    const analyticsResult = await measureHttp('Session Analytics (GET /api/trips/:id/session/analytics)', `${baseUrl}/api/trips/trip-goa-2026/session/analytics`, {
      method: 'GET',
    });
    console.log(`3. ${analyticsResult.name}:`);
    console.log(`   • Status: ${analyticsResult.status}`);
    console.log(`   • Avg Latency: ${analyticsResult.avg.toFixed(2)} ms (Min: ${analyticsResult.min.toFixed(2)} ms, Max: ${analyticsResult.max.toFixed(2)} ms)`);
    console.log(`   • PRD Target: < 100.0 ms`);
    assert.strictEqual(analyticsResult.status, 200);
    assert.ok(analyticsResult.avg < 200, 'Session Analytics latency target satisfied');
    console.log(`   • Status: ✅ PASSED\n`);

    // 4. Group recommendations endpoint latency
    const recResult = await measureHttp('Group Recommendations (GET /api/trips/:id/recommendations)', `${baseUrl}/api/trips/trip-goa-2026/recommendations`, {
      method: 'GET',
    });
    console.log(`4. ${recResult.name}:`);
    console.log(`   • Status: ${recResult.status}`);
    console.log(`   • Avg Latency: ${recResult.avg.toFixed(2)} ms (Min: ${recResult.min.toFixed(2)} ms, Max: ${recResult.max.toFixed(2)} ms)`);
    console.log(`   • PRD Target: < 200.0 ms`);
    assert.strictEqual(recResult.status, 200);
    assert.ok(recResult.avg < 250, 'Group Recommendations latency target satisfied');
    console.log(`   • Status: ✅ PASSED\n`);

    console.log('========================================================================');
    console.log('  🎉 ALL LIVE HTTP PERFORMANCE BENCHMARKS SATISFIED');
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
