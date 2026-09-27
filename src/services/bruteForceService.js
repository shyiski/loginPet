import { authLogsRepo } from '../db/index.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory tracker for failed attempts and lockouts
// Key: 'id:' + identifier (normalized) OR 'ip:' + ipAddress
const attemptsStore = new Map();

function getStoreKey(prefix, value) {
  if (!value) return null;
  return `${prefix}:${String(value).trim().toLowerCase()}`;
}

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of attemptsStore.entries()) {
    if (record.lockoutUntil && record.lockoutUntil <= now) {
      attemptsStore.delete(key);
    } else if (!record.lockoutUntil && record.firstAttempt && (now - record.firstAttempt > LOCKOUT_DURATION_MS)) {
      attemptsStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanExpiredEntries, 5 * 60 * 1000).unref();

export const bruteForceService = {
  MAX_ATTEMPTS: MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES: 15,

  /**
   * Check if identifier (email/username) or IP is currently locked out
   */
  checkLockout(identifier, ip) {
    cleanExpiredEntries();
    const now = Date.now();

    const idKey = getStoreKey('id', identifier);
    const ipKey = getStoreKey('ip', ip);

    const idRecord = idKey ? attemptsStore.get(idKey) : null;
    const ipRecord = ipKey ? attemptsStore.get(ipKey) : null;

    // Check if either is locked
    const activeLock = (idRecord?.lockoutUntil > now ? idRecord : null) ||
                       (ipRecord?.lockoutUntil > now ? ipRecord : null);

    if (activeLock) {
      const remainingMs = activeLock.lockoutUntil - now;
      const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return {
        isLocked: true,
        remainingMinutes,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        message: `Too many failed attempts. Temporary lockout active. Please try again in ${remainingMinutes} minute(s).`
      };
    }

    // Calculate remaining attempts before lockout
    const idAttempts = idRecord?.count || 0;
    const ipAttempts = ipRecord?.count || 0;
    const currentMaxAttempts = Math.max(idAttempts, ipAttempts);
    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - currentMaxAttempts);

    return {
      isLocked: false,
      remainingAttempts,
      currentAttempts: currentMaxAttempts
    };
  },

  /**
   * Record a failed login attempt for both identifier and IP
   */
  async recordFailure(identifier, ip, reqInfo = {}) {
    cleanExpiredEntries();
    const now = Date.now();

    const keys = [getStoreKey('id', identifier), getStoreKey('ip', ip)].filter(Boolean);
    let highestCount = 0;
    let isNowLocked = false;
    let remainingMinutes = 15;

    for (const key of keys) {
      let record = attemptsStore.get(key);
      if (!record || (now - record.firstAttempt > LOCKOUT_DURATION_MS)) {
        record = { count: 0, firstAttempt: now, lockoutUntil: null };
      }

      record.count += 1;
      highestCount = Math.max(highestCount, record.count);

      if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.lockoutUntil = now + LOCKOUT_DURATION_MS;
        isNowLocked = true;
      }

      attemptsStore.set(key, record);
    }

    if (isNowLocked) {
      // Log BRUTE_FORCE_BLOCKED to database audit logs
      try {
        await authLogsRepo.create({
          userId: null,
          action: 'BRUTE_FORCE_BLOCKED',
          ip: ip || reqInfo.ip,
          userAgent: reqInfo.userAgent,
          details: `Temporary 15-minute block triggered after ${MAX_FAILED_ATTEMPTS} failed attempts (Target: ${identifier || 'unknown'}, IP: ${ip || 'unknown'})`
        });
      } catch (err) {
        console.error('Failed to log brute force block event:', err);
      }

      return {
        isLocked: true,
        remainingMinutes: 15,
        message: `Account or IP is locked for 15 minutes due to 5 failed attempts.`
      };
    }

    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - highestCount);
    return {
      isLocked: false,
      remainingAttempts,
      message: `Invalid username/email or password. ${remainingAttempts} attempt(s) remaining before a 15-minute lockout.`
    };
  },

  /**
   * Reset failed attempts upon successful authentication
   */
  recordSuccess(identifier, ip) {
    const idKey = getStoreKey('id', identifier);
    const ipKey = getStoreKey('ip', ip);
    if (idKey) attemptsStore.delete(idKey);
    if (ipKey) attemptsStore.delete(ipKey);
  }
};
