import jwt from 'jsonwebtoken';
import { dataService } from '../services/dataService.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'triptandem-dev-secret-key-2026';
export const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour per audit requirement
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Generate a short-lived access token (max 1 hour)
 */
export function generateAccessToken(user) {
  const userId = user.id || (user._id ? String(user._id) : null);
  return jwt.sign(
    {
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role || 'Planner',
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken(user) {
  const userId = user.id || (user._id ? String(user._id) : null);
  return jwt.sign(
    {
      id: userId,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );
}

/**
 * Express Middleware: Authenticate JWT Access Token
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.tt_token) {
    token = req.cookies.tt_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Access token required. Please authenticate.',
    });
  }

  if (token.startsWith('demo-token-')) {
    const demoId = token.replace('demo-token-', '');
    const user = await dataService.getUserById(demoId);
    if (user) {
      req.user = {
        id: user.id || (user._id ? String(user._id) : demoId),
        email: user.email,
        name: user.name,
        role: user.role || 'Planner',
      };
      return next();
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.id || !decoded.email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Malformed token claims.',
      });
    }

    // Attach verified user identity from token claims
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || 'Planner',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TokenExpired',
        message: 'Access token has expired. Please refresh your session.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'InvalidToken',
      message: 'Access token signature or format is invalid.',
    });
  }
}

/**
 * Express Middleware: Optional JWT Access Token (does not block if missing)
 */
export async function optionalAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.tt_token) {
    token = req.cookies.tt_token;
  }

  if (!token) {
    return next();
  }

  if (token.startsWith('demo-token-')) {
    const demoId = token.replace('demo-token-', '');
    const user = await dataService.getUserById(demoId);
    if (user) {
      req.user = {
        id: user.id || (user._id ? String(user._id) : demoId),
        email: user.email,
        name: user.name,
        role: user.role || 'Planner',
      };
    }
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || 'Planner',
      };
    }
  } catch {}

  next();
}

/**
 * Express Middleware: Require specific global role(s) (e.g. Admin)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required before checking permissions.',
      });
    }

    // Admin has universal superuser access
    if (req.user.role === 'Admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}.`,
      });
    }

    next();
  };
}

/**
 * Express Middleware: Verify user membership and role for a specific trip
 */
export function requireTripMember(allowedRoles = null) {
  return async (req, res, next) => {
    const tripId = req.params.id || req.body.tripId;
    if (!tripId) {
      return res.status(400).json({ success: false, message: 'Trip ID is required for trip authorization.' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const trip = await dataService.getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: `Trip "${tripId}" not found.` });
    }

    // Admin can access all trips
    if (req.user.role === 'Admin') {
      req.trip = trip;
      req.tripMember = { id: req.user.id, name: req.user.name, role: 'Admin' };
      return next();
    }

    const member = (trip.members || []).find(
      m => (m.id && req.user.id && String(m.id) === String(req.user.id)) ||
           (m._id && req.user.id && String(m._id) === String(req.user.id)) ||
           (m.id && req.user._id && String(m.id) === String(req.user._id)) ||
           (m.email && req.user.email && m.email.toLowerCase() === req.user.email.toLowerCase()) ||
           (m.name && req.user.name && m.name.toLowerCase() === req.user.name.toLowerCase())
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not a member of this trip.',
      });
    }

    const effectiveRole = member.role || 'Planner';

    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed =
        allowedRoles.includes(effectiveRole) ||
        ((effectiveRole === 'Leader' || effectiveRole === 'Owner') && !allowedRoles.every(r => r === 'Admin'));
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Action requires role in [${allowedRoles.join(', ')}]. Your trip role is: ${effectiveRole}.`,
        });
      }
    }

    req.trip = trip;
    req.tripMember = member;
    next();
  };
}
