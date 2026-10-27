import mongoose from 'mongoose';

let isConnected = false;
let isConfigured = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    console.log('ℹ️ [Database] MONGODB_URI not configured. Operating in zero-config In-Memory storage mode.');
    isConfigured = false;
    isConnected = false;
    return false;
  }

  isConfigured = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    // Log host safely without exposing credentials
    const host = conn.connection.host || 'cluster';
    const dbName = conn.connection.name || 'triptandem';
    console.log(`✅ [Database] Storage mode: MongoDB (connected to ${host}/${dbName})`);
    return true;
  } catch (err) {
    isConnected = false;
    console.error('❌ [Database] Failed to connect to configured MongoDB URI:', err.message);
    // Explicit rule: "Do not silently switch to in-memory mode after a configured production database fails to connect."
    throw new Error(`MongoDB connection failed: ${err.message}`);
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function isDBConfigured() {
  return isConfigured;
}

export async function closeDB() {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('🔌 [Database] MongoDB connection closed.');
  }
}

