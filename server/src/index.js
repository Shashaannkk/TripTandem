import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import venuesRoutes from './routes/venuesRoutes.js';
import tripsRoutes from './routes/tripsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import authRoutes from './routes/authRoutes.js';
import weatherRoutes from './routes/weatherRoutes.js';
import { setupSocketIO } from './socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

setupSocketIO(io);

// Middleware
app.use(cors());
app.use(express.json());

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
server.listen(PORT, () => {
  console.log(`✨ TripTandem Backend Server listening on http://localhost:${PORT}`);
});
