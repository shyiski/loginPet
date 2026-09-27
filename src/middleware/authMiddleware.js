import jwt from 'jsonwebtoken';
import { userRepo } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_super_key_98765';

/**
 * Generate standard authorization JWT token (after full login)
 */
export function generateAuthToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Generate short-lived temporary token for step 2 (2FA verification)
 */
export function generateTemp2FAToken(userId) {
  return jwt.sign(
    {
      userId,
      is2faPending: true
    },
    JWT_SECRET,
    { expiresIn: '5m' } // 5 minutes validity
  );
}

/**
 * Verify temp 2FA token
 */
export function verifyTemp2FAToken(tempToken) {
  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (!decoded.is2faPending || !decoded.userId) return null;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to protect routes that require authenticated session
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Reject temporary 2FA tokens on fully authenticated endpoints
    if (decoded.is2faPending) {
      return res.status(401).json({ error: 'Two-factor authentication required' });
    }

    const user = await userRepo.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
