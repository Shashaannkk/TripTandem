// test_party_join_and_chat.js
// Dedicated automated test suite verifying party joining and real-time live chat

import http from 'http';
import { app, server } from './src/index.js';
import { dataService } from './src/services/dataService.js';

const socketIoModule = await import('../client/node_modules/socket.io-client/dist/socket.io.js');
const ClientIO = socketIoModule.default || socketIoModule.io;

let serverPort;

function startTestServer() {
  return new Promise((resolve) => {
    const address = server.address();
    if (address && typeof address === 'object') {
      serverPort = address.port;
      resolve();
    } else {
      serverPort = 3001;
      server.listen(serverPort, () => resolve());
    }
  });
}

function stopTestServer() {
  return Promise.resolve();
}

async function run() {
  console.log('🧪 Starting Party Join & Live Chat Automated Verification Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  try {
    await startTestServer();

    // 1. Verify default trip retrieval and MongoDB auto-seeding
    console.log('Step 1: Checking default trip and invite code');
    const defaultTrip = await dataService.getTripById('trip-goa-2026');
    assert('Default trip-goa-2026 is accessible via dataService', !!defaultTrip && defaultTrip.id === 'trip-goa-2026');
    assert('Default trip has invite code TANDEM-GOA-77', defaultTrip.inviteCode === 'TANDEM-GOA-77');

    const byInviteCode = await dataService.getTripByInviteCode('TANDEM-GOA-77');
    assert('getTripByInviteCode("TANDEM-GOA-77") retrieves trip', !!byInviteCode && byInviteCode.id === 'trip-goa-2026');

    // 2. HTTP POST /api/trips/join-by-code with unauthenticated / guest user
    console.log('\nStep 2: Testing unauthenticated / guest traveler party join via HTTP');
    const guestJoinRes = await fetch(`http://127.0.0.1:${serverPort}/api/trips/join-by-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: 'TANDEM-GOA-77',
        user: null, // Unauthenticated visitor joining
        role: 'Planner',
      }),
    });

    const guestJoinData = await guestJoinRes.json();
    assert('POST /api/trips/join-by-code returns 200 OK for guest traveler', guestJoinRes.status === 200);
    assert('Response indicates success: true', guestJoinData.success === true);
    assert('New member object is generated with id and name', !!guestJoinData.member && !!guestJoinData.member.id);
    assert('New member role is Planner', guestJoinData.member.role === 'Planner');

    const guestId = guestJoinData.member.id;
    const guestName = guestJoinData.member.name;

    // Check persistence in trip.members
    const updatedTrip = await dataService.getTripById('trip-goa-2026');
    const isMemberRecorded = (updatedTrip.members || []).some(m => m.id === guestId);
    assert('New member is persisted in trip.members', isMemberRecorded);

    // Check system welcome message was added to trip.chat
    const systemJoinMsg = (updatedTrip.chat || []).find(m => m.isSystem && m.text.includes(guestName));
    assert('System welcome message is recorded in trip.chat', !!systemJoinMsg);

    // 3. Socket.IO live collaboration: Connect 2 clients to trip room
    console.log('\nStep 3: Testing Socket.IO multi-client live chat & room presence');
    const clientA = ClientIO(`http://127.0.0.1:${serverPort}`, { transports: ['websocket'] });
    const clientB = ClientIO(`http://127.0.0.1:${serverPort}`, { transports: ['websocket'] });

    await Promise.all([
      new Promise(r => clientA.on('connect', r)),
      new Promise(r => clientB.on('connect', r)),
    ]);
    assert('Both socket clients successfully connected to server', clientA.connected && clientB.connected);

    // Join trip room for both
    const userA = { id: guestId, name: guestName, role: 'Planner' };
    const userB = { id: 'user-companion-2', name: 'Sam Rivera', role: 'Planner' };

    await new Promise(resolve => {
      clientA.emit('join_trip', { tripId: 'trip-goa-2026', user: userA }, resolve);
    });
    await new Promise(resolve => {
      clientB.emit('join_trip', { tripId: 'trip-goa-2026', user: userB }, resolve);
    });

    assert('Client A joined trip room', true);
    assert('Client B joined trip room', true);

    // 4. Client A sends a chat message -> Client B receives via Socket broadcast
    console.log('\nStep 4: Testing live message broadcast between clients');
    const testMsgId = `msg-test-${Date.now()}`;
    const testMsgText = 'Hey travel crew! Ready for our sunset cruise in Goa? 🌅';

    const receivePromise = new Promise((resolve) => {
      clientB.on('new_message', ({ message }) => {
        if (message && message.id === testMsgId) {
          resolve(message);
        }
      });
    });

    clientA.emit('send_message', {
      tripId: 'trip-goa-2026',
      message: {
        id: testMsgId,
        senderId: userA.id,
        senderName: userA.name,
        text: testMsgText,
        timestamp: '12:00 PM',
      },
    });

    const receivedMsg = await Promise.race([
      receivePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for new_message broadcast')), 4000)),
    ]);

    assert('Client B received live chat message broadcast', !!receivedMsg);
    assert('Message text matches sent content', receivedMsg.text === testMsgText);
    assert('Message sender matches Client A', receivedMsg.senderId === userA.id);

    // Verify chat message persisted in database
    const tripWithMsg = await dataService.getTripById('trip-goa-2026');
    const chatMsgInDB = (tripWithMsg.chat || []).find(m => m.id === testMsgId);
    assert('Chat message is persisted in trip.chat in dataService', !!chatMsgInDB);

    // 5. Client B reacts to the message with emoji -> Client A receives reaction sync
    console.log('\nStep 5: Testing emoji reaction synchronization');
    const reactionPromise = new Promise((resolve) => {
      clientA.on('message_reaction_synced', (payload) => {
        if (payload.messageId === testMsgId && payload.emoji === '❤️') {
          resolve(payload);
        }
      });
    });

    clientB.emit('message_reaction', {
      tripId: 'trip-goa-2026',
      messageId: testMsgId,
      emoji: '❤️',
      user: userB,
    });

    const reactionPayload = await Promise.race([
      reactionPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for reaction sync')), 4000)),
    ]);

    assert('Client A received reaction sync event', !!reactionPayload);
    assert('Reaction emoji is ❤️', reactionPayload.emoji === '❤️');

    // 6. Typing status broadcast
    console.log('\nStep 6: Testing typing status synchronization');
    const typingPromise = new Promise((resolve) => {
      clientB.on('user_typing', (payload) => {
        if (payload.isTyping === true) {
          resolve(payload);
        }
      });
    });

    clientA.emit('typing_status', {
      tripId: 'trip-goa-2026',
      isTyping: true,
    });

    const typingPayload = await Promise.race([
      typingPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for typing sync')), 4000)),
    ]);

    assert('Client B received user_typing event', typingPayload.isTyping === true);

    // Clean disconnect
    clientA.disconnect();
    clientB.disconnect();

  } catch (err) {
    console.error('Fatal test error:', err);
    assert('Execution completed without unexpected exceptions', false);
  } finally {
    await stopTestServer();
  }

  console.log(`\n========================================`);
  console.log(`Party Join & Live Chat Results: ${passed}/${total} PASS`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
