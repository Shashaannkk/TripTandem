/**
 * TripTandem Zero-Config Cloud Collaboration Relay
 * Powered by open CORS pub/sub and snapshot engine.
 * Works seamlessly across separate devices, mobile phones, cross-browser windows, and incognito sessions!
 */

const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const SNAPSHOT_PREFIX = 'tt_trip_';
const ROOM_PREFIX = 'tt_room_';

/**
 * Publishes an authoritative trip snapshot (all days, places, activities, budget, members)
 * to the cloud relay so any collaborator on any device or incognito tab can access it.
 */
export async function publishTripSnapshot(trip) {
  if (!trip) return false;
  try {
    const keys = Array.from(new Set([norm(trip.inviteCode), norm(trip.id)].filter(Boolean)));
    if (keys.length === 0) return false;

    const payload = JSON.stringify({
      type: 'TRIP_SNAPSHOT',
      trip,
      timestamp: Date.now(),
    });

    await Promise.all(
      keys.map(key =>
        fetch(`https://ntfy.sh/${SNAPSHOT_PREFIX}${key}`, {
          method: 'POST',
          headers: {
            'Title': 'TripSnapshot',
            'Priority': '3',
            'Cache': 'yes',
            'X-Cache': 'yes',
          },
          body: payload,
          keepalive: true,
        }).catch(err => {
          console.warn(`[CloudRelay] Snapshot publish error for key ${key}:`, err);
        })
      )
    );
    return true;
  } catch (e) {
    console.warn('[CloudRelay] publishTripSnapshot failed:', e);
    return false;
  }
}

/**
 * Fetches the trip snapshot from the cloud relay by invite code or trip ID.
 * Retrieves all activities, days, places, and budget details created by the trip host.
 * Includes automatic retry with small delay to handle instant link navigation.
 */
export async function fetchTripSnapshot(code, retries = 2) {
  const key = norm(code);
  if (!key) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const url = attempt === 0
        ? `https://ntfy.sh/${SNAPSHOT_PREFIX}${key}/json?poll=1&since=24h`
        : `https://ntfy.sh/${SNAPSHOT_PREFIX}${key}/json?poll=1`;

      const res = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          const lines = text.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const ev = JSON.parse(lines[i]);
              if (ev.event === 'message') {
                if (ev.attachment && ev.attachment.url) {
                  const fileRes = await fetch(ev.attachment.url);
                  if (fileRes.ok) {
                    const fileData = await fileRes.json();
                    if (fileData?.trip) return fileData.trip;
                  }
                }
                if (ev.message) {
                  const data = JSON.parse(ev.message);
                  if (data?.trip) return data.trip;
                }
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      console.warn(`[CloudRelay] fetchTripSnapshot attempt ${attempt} error for ${code}:`, e);
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  return null;
}

/**
 * Broadcasts a live real-time event (MEMBER_JOINED, NEW_CHAT_MESSAGE, USER_TYPING, ITINERARY_SYNC)
 * across all connected devices and browser sessions in the trip room.
 */
export async function broadcastCloudEvent(code, payload) {
  const key = norm(code);
  if (!key || !payload) return false;

  try {
    const bodyStr = JSON.stringify(payload);
    await fetch(`https://ntfy.sh/${ROOM_PREFIX}${key}`, {
      method: 'POST',
      headers: {
        'Title': payload.type || 'RoomEvent',
        'Priority': '3',
        'Cache': 'yes',
        'X-Cache': 'yes',
      },
      body: bodyStr,
      keepalive: true,
    });
    return true;
  } catch (e) {
    console.warn('[CloudRelay] broadcastCloudEvent error:', e);
    return false;
  }
}

/**
 * Subscribes to live WebSocket events for a specific trip room.
 * Delivers real-time notifications when members join, send chat messages, or start typing.
 */
export function subscribeCloudRoom(code, onEvent) {
  const key = norm(code);
  if (!key || typeof onEvent !== 'function') return () => {};

  let ws = null;
  let isClosed = false;
  let reconnectTimer = null;

  const connect = () => {
    if (isClosed) return;
    try {
      ws = new WebSocket(`wss://ntfy.sh/${ROOM_PREFIX}${key}/ws`);

      ws.onopen = () => {
        // Connected to room
      };

      ws.onmessage = async (event) => {
        try {
          const ev = JSON.parse(event.data);
          if (ev.event === 'message') {
            let payload = null;
            if (ev.attachment && ev.attachment.url) {
              const fileRes = await fetch(ev.attachment.url);
              if (fileRes.ok) {
                payload = await fileRes.json();
              }
            } else if (ev.message) {
              payload = JSON.parse(ev.message);
            }
            if (payload && !isClosed) {
              onEvent(payload);
            }
          }
        } catch (e) {
          // Ignore invalid message framing
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = () => {
        if (!isClosed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    } catch (e) {
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 4000);
      }
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
    }
  };
}
