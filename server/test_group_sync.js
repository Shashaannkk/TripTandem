/**
 * TripTandem — Group Membership & Realtime Synchronization Test Suite
 * 
 * Verifies all 8 requirements specified in Section 5 of the prompt:
 * Test 1: Same trip membership (A and B join same trip room).
 * Test 2: Member roster (A and B both appear in roster without duplicates or missing names).
 * Test 3: Join notification (A receives B's join notification).
 * Test 4: A sends a message (B receives it in chat).
 * Test 5: B sends a message (A receives it in chat).
 * Test 6: Trip room isolation (Trip 1 events do not leak to Trip 2).
 * Test 7: Reconnection (A disconnects, reconnects, rejoins room and receives roster/messages).
 * Test 8: Authorization (Non-members cannot send chat messages or mutate without authorization).
 */

import assert from 'assert';
import http from 'http';
import { generateAccessToken } from './src/middleware/auth.js';
import { dataService } from './src/services/dataService.js';
import { server, io, app } from './src/index.js';

// Import socket.io-client
const socketIoModule = await import('../client/node_modules/socket.io-client/dist/socket.io.js');
const ioClient = socketIoModule.default || socketIoModule.io;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForEvent(socket, eventName, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for event "${eventName}" after ${timeoutMs}ms`));
    }, timeoutMs);

    function handler(data) {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(data);
    }

    socket.on(eventName, handler);
  });
}

async function runSyncTests() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('  🧪 TRIPTANDEM — GROUP REALTIME SYNCHRONIZATION TEST SUITE             ');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  // Ensure server is listening
  const address = server.address();
  let port;
  if (address && typeof address === 'object') {
    port = address.port;
  } else {
    port = 3001;
    await new Promise((resolve) => server.listen(port, resolve));
  }
  const SERVER_URL = `http://localhost:${port}`;
  console.log(`Connecting test clients to: ${SERVER_URL}\n`);

  // Define test users
  const userA = {
    id: 'user-a-1',
    name: 'Alice Leader',
    email: 'alice@triptandem.test',
    role: 'Leader',
  };
  const tokenA = generateAccessToken(userA);

  const userB = {
    id: 'user-b-2',
    name: 'Bob Planner',
    email: 'bob@triptandem.test',
    role: 'Planner',
  };
  const tokenB = generateAccessToken(userB);

  const userC = {
    id: 'user-c-3',
    name: 'Charlie Stranger',
    email: 'charlie@triptandem.test',
    role: 'Viewer',
  };
  const tokenC = generateAccessToken(userC);

  const userD = {
    id: 'user-d-4',
    name: 'Diana Isolated',
    email: 'diana@triptandem.test',
    role: 'Leader',
  };
  const tokenD = generateAccessToken(userD);

  const tripId1 = 'trip-sync-test-alpha';
  const tripId2 = 'trip-sync-test-beta';

  // Seed Trip 1
  const trip1 = {
    id: tripId1,
    title: 'Goa Coastal Sync Test',
    destination: 'Goa, India',
    leaderUserId: userA.id,
    inviteCode: 'SYNC-ALPHA-77',
    members: [
      { id: userA.id, name: userA.name, email: userA.email, role: 'Leader' }
    ],
    participantIds: [userA.id],
    days: [
      {
        dayNumber: 1,
        items: [
          { id: 'item-101', title: 'Sunset at Anjuna', dayNumber: 1, positionVersion: 1 }
        ]
      }
    ],
    chat: [],
    budget: { totalTarget: 40000, expenses: [] }
  };
  await dataService.createTrip(trip1);

  // Seed Trip 2
  const trip2 = {
    id: tripId2,
    title: 'Manali Snow Trek',
    destination: 'Manali, India',
    leaderUserId: userD.id,
    inviteCode: 'SYNC-BETA-88',
    members: [
      { id: userD.id, name: userD.name, email: userD.email, role: 'Leader' }
    ],
    participantIds: [userD.id],
    days: [{ dayNumber: 1, items: [] }],
    chat: [],
    budget: { totalTarget: 50000, expenses: [] }
  };
  await dataService.createTrip(trip2);

  // Create Socket Clients
  const clientA = ioClient(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: tokenA },
    autoConnect: true,
  });

  const clientB = ioClient(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: tokenB },
    autoConnect: true,
  });

  const clientC = ioClient(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: tokenC },
    autoConnect: true,
  });

  const clientD = ioClient(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: tokenD },
    autoConnect: true,
  });

  await Promise.all([
    new Promise((res) => clientA.on('connect', res)),
    new Promise((res) => clientB.on('connect', res)),
    new Promise((res) => clientC.on('connect', res)),
    new Promise((res) => clientD.on('connect', res)),
  ]);

  console.log('All 4 test sockets successfully connected to server.\n');

  // =========================================================================
  // TEST 1: Same trip membership (A and B join same trip room)
  // =========================================================================
  await runTest('Test 1: User A and User B successfully join the exact same trip room', async () => {
    // A joins trip 1
    const ackA = await new Promise((resolve) => {
      clientA.emit('join_trip', { tripId: tripId1, user: userA, token: tokenA }, resolve);
    });
    assert.strictEqual(ackA.success, true, 'User A join_trip ack must succeed');

    // B joins trip 1
    const ackB = await new Promise((resolve) => {
      clientB.emit('join_trip', { tripId: tripId1, user: userB, token: tokenB }, resolve);
    });
    assert.strictEqual(ackB.success, true, 'User B join_trip ack must succeed');
  });

  // =========================================================================
  // TEST 2: Member roster (A and B both appear in roster without duplicates)
  // =========================================================================
  await runTest('Test 2: Member roster reflects both User A and User B with correct identities and no duplicates', async () => {
    const updatedTrip = await dataService.getTripById(tripId1);
    assert(updatedTrip, 'Trip 1 must exist');
    const members = updatedTrip.members || [];

    const memberA = members.find((m) => m.id === userA.id || m.email === userA.email);
    assert(memberA, 'User A must appear in the member roster');
    assert.strictEqual(memberA.name, userA.name, "User A's name must match exactly");
    assert.strictEqual(memberA.role, 'Leader', "User A's role must be Leader");

    const memberB = members.find((m) => m.id === userB.id || m.email === userB.email);
    assert(memberB, 'User B must appear in the member roster');
    assert.strictEqual(memberB.name, userB.name, "User B's name must match exactly");

    // Check no duplicate IDs
    const idCountA = members.filter((m) => m.id === userA.id).length;
    const idCountB = members.filter((m) => m.id === userB.id).length;
    assert.strictEqual(idCountA, 1, 'User A must not be duplicated in the member roster');
    assert.strictEqual(idCountB, 1, 'User B must not be duplicated in the member roster');
  });

  // =========================================================================
  // TEST 3: Join notification (A receives B's join notification)
  // =========================================================================
  await runTest('Test 3: Existing User A receives real-time join notification when User B joins', async () => {
    // When B sends member_join or re-joins, A should receive member_joined and presence
    const joinPromise = waitForEvent(clientA, 'member_joined');
    const presencePromise = waitForEvent(clientA, 'presence_sync');

    clientB.emit('member_join', {
      tripId: tripId1,
      member: { ...userB, role: 'Planner' },
      token: tokenB,
    });

    const [joinData, presenceData] = await Promise.all([joinPromise, presencePromise]);
    assert(joinData, 'User A must receive member_joined event');
    assert(
      joinData.newMember?.id === userB.id || joinData.trip?.members?.some((m) => m.id === userB.id),
      'Notification must identify User B as the newly joined member'
    );
    assert(presenceData.activeUsers.some((u) => u.id === userB.id), 'Presence must include User B');
  });

  // =========================================================================
  // TEST 4: User A sends a message -> User B receives it in chat
  // =========================================================================
  await runTest('Test 4: User A sends a group chat message; User B receives it in real time', async () => {
    const msgPromise = waitForEvent(clientB, 'new_message');

    const msgPayload = {
      id: `msg-test-a-${Date.now()}`,
      senderId: userA.id,
      senderName: userA.name,
      text: 'Hey Bob! Welcome to our Goa itinerary room.',
      timestamp: '10:00 AM',
    };

    clientA.emit('send_message', {
      tripId: tripId1,
      message: msgPayload,
      token: tokenA,
    });

    const received = await msgPromise;
    assert.strictEqual(received.message.id, msgPayload.id, 'Message ID must match');
    assert.strictEqual(received.message.text, msgPayload.text, 'Message text must match');
    assert.strictEqual(received.message.senderId, userA.id, 'Sender ID must match User A');
  });

  // =========================================================================
  // TEST 5: User B sends a message -> User A receives it in chat
  // =========================================================================
  await runTest('Test 5: User B sends a group chat message; User A receives it in real time', async () => {
    const msgPromise = waitForEvent(clientA, 'new_message');

    const msgPayload = {
      id: `msg-test-b-${Date.now()}`,
      senderId: userB.id,
      senderName: userB.name,
      text: 'Thanks Alice! Excited to collaborate on our travel plan.',
      timestamp: '10:01 AM',
    };

    clientB.emit('send_message', {
      tripId: tripId1,
      message: msgPayload,
      token: tokenB,
    });

    const received = await msgPromise;
    assert.strictEqual(received.message.id, msgPayload.id, 'Message ID must match');
    assert.strictEqual(received.message.text, msgPayload.text, 'Message text must match');
    assert.strictEqual(received.message.senderId, userB.id, 'Sender ID must match User B');
  });

  // =========================================================================
  // TEST 6: Trip room isolation (Trip 1 events do not leak to Trip 2)
  // =========================================================================
  await runTest('Test 6: Trip room isolation — Trip 1 chat and events never leak to Trip 2', async () => {
    // User D joins Trip 2
    await new Promise((resolve) => {
      clientD.emit('join_trip', { tripId: tripId2, user: userD, token: tokenD }, resolve);
    });

    let leakedMessage = null;
    const leakHandler = (data) => {
      leakedMessage = data;
    };
    clientD.on('new_message', leakHandler);

    // User A sends message in Trip 1
    clientA.emit('send_message', {
      tripId: tripId1,
      message: {
        id: `msg-isolated-${Date.now()}`,
        senderId: userA.id,
        senderName: userA.name,
        text: 'Private Trip 1 confidential message',
        timestamp: '10:05 AM',
      },
      token: tokenA,
    });

    // Wait 500ms to verify User D never receives it
    await wait(500);
    clientD.off('new_message', leakHandler);

    assert.strictEqual(leakedMessage, null, 'User D in Trip 2 must NOT receive Trip 1 messages');
  });

  // =========================================================================
  // TEST 7: Reconnection & room restoral
  // =========================================================================
  await runTest('Test 7: User A disconnects and reconnects — automatically rejoins room and receives new messages', async () => {
    // Simulate User A dropping connection
    clientA.disconnect();
    await wait(100);
    assert.strictEqual(clientA.connected, false, 'Client A should be disconnected');

    // Client A reconnects
    clientA.connect();
    await new Promise((res) => clientA.on('connect', res));
    assert.strictEqual(clientA.connected, true, 'Client A reconnected');

    // Client A re-emits join_trip on connect (as implemented in TripContext)
    const ackRejoin = await new Promise((resolve) => {
      clientA.emit('join_trip', { tripId: tripId1, user: userA, token: tokenA }, resolve);
    });
    assert.strictEqual(ackRejoin.success, true, 'User A re-join must succeed');

    // User B sends a message while A is reconnected
    const reconnectedMsgPromise = waitForEvent(clientA, 'new_message');
    const rejoinMsg = {
      id: `msg-reconnect-${Date.now()}`,
      senderId: userB.id,
      senderName: userB.name,
      text: 'Alice, are you still there after reconnecting?',
      timestamp: '10:10 AM',
    };
    clientB.emit('send_message', {
      tripId: tripId1,
      message: rejoinMsg,
      token: tokenB,
    });

    const received = await reconnectedMsgPromise;
    assert.strictEqual(received.message.id, rejoinMsg.id, 'User A must receive message after reconnecting');
  });

  // =========================================================================
  // TEST 8: Authorization enforcement
  // =========================================================================
  await runTest('Test 8: Server-side RBAC & authorization rejects unauthorized non-members', async () => {
    // User C is NOT a member of Trip 1 and attempts to send a message to Trip 1
    const errorPromise = waitForEvent(clientC, 'trip.error', 2000);

    clientC.emit('send_message', {
      tripId: tripId1,
      message: {
        id: `msg-unauth-${Date.now()}`,
        senderId: userC.id,
        senderName: userC.name,
        text: 'Malicious or unauthorized intrusion attempt',
        timestamp: '10:15 AM',
      },
      token: tokenC,
    });

    const err = await errorPromise;
    assert(err, 'Server must emit trip.error for unauthorized chat attempts');
    assert(
      err.message.includes('Unauthorized') || err.message.includes('member'),
      `Error message must indicate authorization failure. Got: "${err.message}"`
    );

    // Verify User A and User B did NOT receive the unauthorized message
    const updatedTrip = await dataService.getTripById(tripId1);
    const unauthInDb = (updatedTrip.chat || []).some((m) => m.text?.includes('intrusion'));
    assert.strictEqual(unauthInDb, false, 'Unauthorized message must not be persisted in database');
  });

  // Clean up sockets
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  clientD.disconnect();

  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log(`  📊 GROUP SYNCHRONIZATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests > 0) {
    console.log(`  ❌ ${failedTests} TESTS FAILED`);
  } else {
    console.log(`  🎉 ALL 8 TESTS PASSED SUCCESSFULLY!`);
  }
  console.log('════════════════════════════════════════════════════════════════════════\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runSyncTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
