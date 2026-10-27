# TripTandem — REST API & Socket.IO Reference

## Authentication & Authorization Architecture

All protected endpoints require a valid JWT Access Token passed in the `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```
Access tokens are signed using a server-side secret (`JWT_SECRET`) and expire after **1 hour**. Refresh tokens have a **7-day** lifespan, are rotated on every refresh, and are securely delivered via an `HttpOnly`, `SameSite=Lax` cookie.

### Standard Response Envelope
Successful responses return JSON payloads with standard HTTP 200/201 status codes.
Errors return consistent structured payloads:
```json
{
  "error": "Descriptive human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "conflict": false
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 `POST /api/auth/google`
Authenticates a user via Google OAuth credential token or direct email login.

- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "token": "google_id_token_string",
  "email": "user@domain.com",
  "name": "Jane Doe",
  "avatar": "https://..."
}
```
- **Success Response (200 OK):** Sets `refreshToken` cookie.
```json
{
  "user": {
    "id": "user-1",
    "name": "Jane Doe",
    "email": "user@domain.com",
    "role": "Planner"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.2 `POST /api/auth/refresh`
Rotates the session refresh token and issues a fresh 1-hour access token. Prevents token replay attacks by invalidating the prior token.

- **Headers:** `Cookie: refreshToken=<token>` or body `{ "refreshToken": "<token>" }`
- **Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt-..."
}
```
- **Error Responses:**
  - `401 Unauthorized`: Missing refresh token.
  - `403 Forbidden`: Expired, invalid, or replayed refresh token.

### 1.3 `POST /api/auth/logout`
Revokes the refresh token from the database/session store and clears the `refreshToken` cookie.

- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 1.4 `GET /api/auth/me`
Retrieves the profile of the currently verified user.

- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):** Full user profile including UPI ID and emergency contact.

---

## 2. Trips Endpoints (`/api/trips`)

### 2.1 `GET /api/trips`
Lists trips where the authenticated user is a registered member.

- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):** Array of trip objects.

### 2.2 `POST /api/trips`
Creates a new collaborative trip workspace. The creator is assigned the `Leader` role.

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "title": "Goa Sunkissed Coastal Trail",
  "destination": "Goa, India",
  "startDate": "2026-11-12",
  "endDate": "2026-11-15",
  "daysCount": 4,
  "budget": { "totalTarget": 45000 }
}
```
- **Success Response (201 Created):** Full created trip object with generated `inviteCode`.

### 2.3 `GET /api/trips/:id`
Retrieves the complete workspace state (members, itinerary days, expenses, chat, budget).

- **Headers:** `Authorization: Bearer <token>`
- **Access Control:** Authenticated user must be a member of the trip.
- **Success Response (200 OK):** Full trip workspace object.

### 2.4 `PATCH /api/trips/:id/lock`
Locks or unlocks the workspace to freeze additions or edits before trip departure.

- **Headers:** `Authorization: Bearer <token>`
- **Access Control:** `Leader` or `Admin` role required.
- **Request Body:**
```json
{ "isRoomLocked": true }
```
- **Success Response (200 OK):** `{ "success": true, "isRoomLocked": true }`

### 2.5 `PATCH /api/trips/:id/members/:memberId/role`
Updates a collaborator's role within the trip room.

- **Headers:** `Authorization: Bearer <token>`
- **Access Control:** `Leader` or `Admin` role required.
- **Request Body:**
```json
{ "role": "Planner" }
```
- **Success Response (200 OK):** Updated members array.

### 2.6 `PATCH /api/trips/:id/items/:itemId`
Performs optimistic concurrency updates or reordering on an itinerary activity.

- **Headers:** `Authorization: Bearer <token>`
- **Access Control:** `Planner`, `Leader`, or `Admin` role required.
- **Request Body:**
```json
{
  "positionVersion": 2,
  "dayNumber": 1,
  "targetIndex": 2,
  "startTime": "02:00 PM"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "item": {
    "id": "item-goa-2",
    "positionVersion": 3,
    "title": "Traditional Goan Lunch"
  },
  "newVersion": 3
}
```
- **Conflict Response (409 Conflict):**
```json
{
  "success": false,
  "conflict": true,
  "error": "Concurrent edit conflict: activity was modified by another collaborator (server v3, client v2).",
  "currentServerVersion": 3,
  "authoritativeItem": { ... }
}
```

### 2.7 `GET /api/trips/:id/analytics`
Calculates authentic event-driven session collaboration metrics from the trip event log.

- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
```json
{
  "tripId": "trip-goa-2026",
  "summary": {
    "activePlanningDays": 4,
    "totalEvents": 42,
    "peakActivityPeriod": "Evening (18:00 - 21:00)",
    "aiQuestionsAsked": 8,
    "conflictsResolved": 3,
    "totalVotesCast": 14,
    "uniqueActiveMembers": 4
  },
  "actionsByMember": [
    { "userId": "user-1", "name": "Alex Morgan", "actionCount": 18, "percentage": 43 }
  ],
  "budgetMetrics": {
    "totalSpent": 24000,
    "zeroSumVerified": true,
    "memberShares": [ ... ]
  }
}
```

### 2.8 `GET /api/trips/:id/recommendations`
Runs the hybrid group recommendation engine balancing members' dietary tags, max budget, and collaborative travel history.

- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `limit`: Number of candidates (default: 6)
  - `maxPrice`: Optional hard budget ceiling (INR)
  - `requiredDietary`: Optional dietary filter (`vegan`, `vegetarian`, `seafood`, etc.)
- **Success Response (200 OK):**
```json
{
  "tripId": "trip-goa-2026",
  "recommendations": [
    {
      "id": "v-goa-1",
      "name": "Fisherman's Wharf Panaji",
      "category": "restaurant",
      "price": 1200,
      "rating": 4.8,
      "matchPercentage": 94,
      "finalScore": 0.94,
      "explanation": "Matched because 3/4 members enjoy seafood and it fits the ₹1500/meal budget ceiling.",
      "dietaryTags": ["seafood", "gluten-free"]
    }
  ]
}
```

---

## 3. Venues Endpoints (`/api/venues`)

### 3.1 `GET /api/venues`
Searches curated destination venues with filtering.

- **Query Parameters:** `destination`, `category`, `maxPrice`, `dietary`
- **Success Response (200 OK):** Array of venue records.

### 3.2 `POST /api/venues/dataset/upload`
Uploads and validates bulk destination venue catalog records.

- **Headers:** `Authorization: Bearer <token>`
- **Access Control:** Strictly restricted to `Admin` role.
- **Request Body:**
```json
{
  "destination": "Goa",
  "venues": [
    {
      "name": "Martin's Corner",
      "category": "restaurant",
      "price": 950,
      "location": { "type": "Point", "coordinates": [73.9123, 15.2891] },
      "dietaryTags": ["seafood", "pork", "vegetarian"]
    }
  ]
}
```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Non-admin caller (`Viewer`, `Planner`, `Leader`).
  - `400 Bad Request`: Schema validation failure (invalid coordinates, negative price, unsupported dietary tag).

---

## 4. Socket.IO Real-Time Event Protocol

The WebSocket layer runs on top of Socket.IO and requires token authentication during handshake.

### 4.1 Handshake Authentication
```javascript
const socket = io('https://server.domain', {
  auth: {
    token: accessToken
  }
});
```
Sockets without a verified access token are rejected immediately during the handshake middleware:
`io.use((socket, next) => ...)`

### 4.2 Room Isolation
Clients join their specific trip room:
```javascript
socket.emit('join_trip', { tripId: 'trip-goa-2026' });
```
The server checks that `socket.user` is a legitimate registered member of `trip-goa-2026` before invoking `socket.join(tripId)`.

### 4.3 Client-to-Server Events

| Event Name | Role Required | Payload Schema | Description |
|---|---|---|---|
| `trip.board.update` | `Planner`, `Leader`, `Admin` | `{ tripId, itemId, dayNumber, targetIndex, positionVersion }` | Atomically reorders an item with optimistic concurrency. |
| `itinerary_change` | `Planner`, `Leader`, `Admin` | `{ tripId, trip, changeDescription }` | Broadcasts new itinerary card addition. |
| `lock_trip` | `Leader`, `Admin` | `{ tripId, isRoomLocked }` | Locks or unlocks collaborative workspace. |
| `vote_cast` | `Viewer`, `Planner`, `Leader`, `Admin` | `{ tripId, itemId, voteType }` | Casts an upvote or downvote on an activity. |
| `send_message` | `Viewer`, `Planner`, `Leader`, `Admin` | `{ tripId, text, isAi }` | Dispatches group chat message. |
| `add_reaction` | `Viewer`, `Planner`, `Leader`, `Admin` | `{ tripId, messageId, emoji }` | Toggles emoji reaction on chat message. |

### 4.4 Server-to-Client Broadcast Events

| Event Name | Target | Payload | Description |
|---|---|---|---|
| `trip.board.updated` | Trip Room | `{ itemId, newVersion, updatedDay, actor }` | Broadcast upon accepted board reordering. |
| `trip.board.conflict` | Sender Socket | `{ conflict: true, currentServerVersion, authoritativeItem }` | Emitted to losing client when concurrency conflict occurs. |
| `trip_updated` | Trip Room | `{ trip, changeDescription, updatedBy }` | Emitted when overall trip state changes. |
| `new_message` | Trip Room | `ChatMessage` object | Dispatched on chat message. |
| `reaction_updated` | Trip Room | `{ messageId, reactions }` | Dispatched on chat reaction toggle. |
| `error` | Sender Socket | `{ message, code }` | Emitted when an unauthorized or invalid event is received. |

