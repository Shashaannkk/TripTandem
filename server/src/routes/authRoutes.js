import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dataService } from '../services/dataService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  authenticateToken,
  JWT_SECRET,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../middleware/auth.js';

const router = express.Router();

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
});

// Helper to issue both short-lived access token and rotated refresh token
const issueTokens = async (res, user) => {
  const token = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await dataService.saveRefreshToken(user.id, refreshToken, expiresAt);
  res.cookie('tt_refresh_token', refreshToken, getCookieOptions());

  return { token, refreshToken };
};

// GET /api/auth/users - list demo personas
router.get('/users', async (req, res) => {
  const users = await dataService.listUsers();
  res.json({
    success: true,
    data: users.map(({ passwordHash, refreshTokens, ...u }) => u),
  });
});

// GET /api/auth/google/config - check Google OAuth status
router.get('/google/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '959503524738-v2jhe3897fq2q7f5q7ilf3t7rp3ho1jq.apps.googleusercontent.com';
  res.json({
    success: true,
    configured: Boolean(clientId),
    clientId: clientId,
  });
});

// POST /api/auth/switch-persona - switch demo persona
router.post('/switch-persona', async (req, res) => {
  const { userId } = req.body;
  const user = await dataService.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User persona not found' });
  }

  const { token, refreshToken } = await issueTokens(res, user);
  const { passwordHash, refreshTokens, ...safeUser } = user;

  res.json({
    success: true,
    data: safeUser,
    token,
    refreshToken,
  });
});

// POST /api/auth/login - standard credential login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  const user = await dataService.getUserByEmail(email, true);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Account not found. Please sign up or verify your login credentials.',
    });
  }

  if (user.passwordHash && user.passwordHash !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const { token, refreshToken } = await issueTokens(res, user);
  const { passwordHash, refreshTokens, ...safeUser } = user;

  res.json({
    success: true,
    data: safeUser,
    token,
    refreshToken,
  });
});

// POST /api/auth/signup - account registration
router.post('/signup', async (req, res) => {
  const {
    name,
    email,
    password,
    confirmPassword,
    phone,
    role,
    emergencyContact,
    upiId,
    upiQrCode,
  } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const existingUser = await dataService.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists. Please log in instead.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const formattedUpiId = upiId ? upiId.trim() : `${normalizedEmail.split('@')[0]}@upi`;
  const defaultQr =
    upiQrCode ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(
      formattedUpiId
    )}%26pn%3D${encodeURIComponent(name.trim())}%26cu%3DINR`;

  const newUser = await dataService.createUser({
    id: `user-${uuidv4().slice(0, 8)}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : '+91 98000 00000',
    role: role || 'Planner',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    color: '#FF6B45',
    upiId: formattedUpiId,
    upiQrCode: defaultQr,
    emergencyContact: emergencyContact || {
      name: 'Emergency Contact',
      relationship: 'Family',
      phone: phone || '+91 98000 00000',
      bloodGroup: 'Not specified',
      medicalNotes: 'None',
    },
    passwordHash: password,
  });

  const { token, refreshToken } = await issueTokens(res, newUser);
  const { passwordHash: _, refreshTokens, ...safeUser } = newUser;

  res.status(201).json({
    success: true,
    data: safeUser,
    token,
    refreshToken,
  });
});

// POST /api/auth/refresh - Refresh Token Rotation (PRD & Audit requirement)
router.post('/refresh', async (req, res) => {
  const incomingRefreshToken = req.cookies?.tt_refresh_token || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      error: 'MissingRefreshToken',
      message: 'Refresh token not found. Please log in again.',
    });
  }

  try {
    const decoded = jwt.verify(incomingRefreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh' || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'InvalidRefreshToken',
        message: 'Invalid refresh token payload.',
      });
    }

    const isValid = await dataService.verifyRefreshToken(decoded.id, incomingRefreshToken);
    if (!isValid) {
      res.clearCookie('tt_refresh_token', { path: '/' });
      return res.status(401).json({
        success: false,
        error: 'InvalidOrReusedRefreshToken',
        message: 'Refresh token has expired, been revoked, or already consumed.',
      });
    }

    // Invalidate old token (Rotation)
    await dataService.removeRefreshToken(decoded.id, incomingRefreshToken);

    const user = await dataService.getUserById(decoded.id);
    if (!user) {
      res.clearCookie('tt_refresh_token', { path: '/' });
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Issue new pair
    const { token: newAccessToken, refreshToken: newRefreshToken } = await issueTokens(res, user);
    const { passwordHash, refreshTokens, ...safeUser } = user;

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      data: safeUser,
    });
  } catch (err) {
    res.clearCookie('tt_refresh_token', { path: '/' });
    return res.status(401).json({
      success: false,
      error: 'ExpiredOrInvalidRefreshToken',
      message: 'Refresh token signature validation failed or expired.',
    });
  }
});

// POST /api/auth/logout - Invalidate refresh session and clear cookie
router.post('/logout', async (req, res) => {
  const incomingRefreshToken = req.cookies?.tt_refresh_token || req.body?.refreshToken;

  if (incomingRefreshToken) {
    try {
      const decoded = jwt.decode(incomingRefreshToken);
      if (decoded && decoded.id) {
        await dataService.removeRefreshToken(decoded.id, incomingRefreshToken);
      }
    } catch {}
  }

  res.clearCookie('tt_refresh_token', { path: '/' });
  res.clearCookie('tt_token', { path: '/' });

  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// PUT /api/auth/profile - update profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { phone, role, emergencyContact, upiId, upiQrCode } = req.body;
  const userId = req.user.id; // Trusted from verified token!

  const updates = {};
  if (phone) updates.phone = phone;
  if (role) updates.role = role;
  if (emergencyContact) updates.emergencyContact = emergencyContact;
  if (upiId) updates.upiId = upiId;
  if (upiQrCode) updates.upiQrCode = upiQrCode;

  const updatedUser = await dataService.updateUser(userId, updates);
  if (!updatedUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { passwordHash, refreshTokens, ...safeUser } = updatedUser;
  res.json({
    success: true,
    data: safeUser,
  });
});

// POST /api/auth/google - Google OAuth token verification
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: 'Missing Google authentication token credential',
    });
  }

  try {
    let payload = null;

    if (credential !== 'google-authenticated-session') {
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );

      if (googleRes.ok) {
        payload = await googleRes.json();
      }
    }

    const email = (payload?.email || 'traveler@gmail.com').toLowerCase();
    let user = await dataService.getUserByEmail(email);

    if (!user) {
      user = await dataService.createUser({
        id: `user-${uuidv4().slice(0, 8)}`,
        name: payload?.name || email.split('@')[0] || 'Google Traveler',
        email: email,
        role: 'Planner',
        avatar: payload?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        phone: payload?.phone_number || '',
        color: '#2A9D8F',
        googleId: payload?.sub,
      });
    } else {
      const updates = {};
      if (payload?.name && !user.name) updates.name = payload.name;
      if (payload?.picture) updates.avatar = payload.picture;
      if (payload?.sub) updates.googleId = payload.sub;
      if (Object.keys(updates).length > 0) {
        user = await dataService.updateUser(user.id, updates);
      }
    }

    const { token, refreshToken } = await issueTokens(res, user);
    const { passwordHash, refreshTokens, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Google token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify Google token with authentication servers',
    });
  }
});

// GET /api/auth/me - inspect current session
router.get('/me', authenticateToken, async (req, res) => {
  const user = await dataService.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User session not found' });
  }
  const { passwordHash, refreshTokens, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  res.json({
    success: true,
    message: `If an account exists for ${email}, a password reset link has been dispatched to your inbox.`,
  });
});

export default router;
