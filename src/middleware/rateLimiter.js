import rateLimit from 'express-rate-limit';
import { bruteForceService } from '../services/bruteForceService.js';

/**
 * Standard IP-based rate limiter to protect against volumetric flooding
 */
export const ipRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 requests per IP per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again in 15 minutes.'
  }
});

/**
 * Account & IP Lockout Guard middleware for /login and /verify-2fa
 * Rejects immediately with 429 if the user or IP is currently in a 15-minute lockout
 */
export function checkAccountLockout(req, res, next) {
  const identifier = req.body.identifier || req.body.email || req.body.username;
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

  const status = bruteForceService.checkLockout(identifier, ip);
  if (status.isLocked) {
    return res.status(429).json({
      error: status.message,
      remainingMinutes: status.remainingMinutes,
      isLocked: true
    });
  }

  next();
}
