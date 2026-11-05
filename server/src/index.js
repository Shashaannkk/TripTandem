import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { connectDB } from './db.js';
import venuesRoutes from './routes/venuesRoutes.js';
import tripsRoutes from './routes/tripsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import { setupSocketIO } from './socket.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS origin denied in production mode'));
      }
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true); // Dev resilient
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true,
  },
});

setupSocketIO(io);
app.set('io', io);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied in production mode'));
    }
    return callback(null, true); // Permissive for local dev + credentials
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// API Routes (v1 & legacy compatible)
app.use('/api/venues', venuesRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);

// Strict PRD Section 7.3 v1 Routes
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/v1/destinations', venuesRoutes);
app.use('/api/v1/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'TripTandem Travel API',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3001;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Server] Port ${PORT} already in use; attaching to existing instance.`);
  } else {
    console.error('[Server] Unexpected server error:', err);
  }
});

// Connect to MongoDB if MONGODB_URI is provided
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✨ TripTandem Backend Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Fatal database startup failure:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('Refusing to start production server without persistent database connection.');
      process.exit(1);
    }
    server.listen(PORT, () => {
      console.log(`✨ TripTandem Backend Server listening on http://localhost:${PORT} (Development in-memory fallback)`);
    });
  });

export { app, server, io };
