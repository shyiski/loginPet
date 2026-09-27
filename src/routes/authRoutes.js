import { Router } from 'express';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { backupCodesRepo, userRepo } from '../db/index.js';
import { ipRateLimiter, checkAccountLockout } from '../middleware/rateLimiter.js';

const router = Router();

function getReqInfo(req) {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || 'Unknown'
  };
}

/**
 * Register with Email & Password
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const result = await authService.register({
      email,
      username,
      password,
      reqInfo: getReqInfo(req)
    });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Google Sign In / Registration
 * POST /api/auth/google
 */
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, avatarUrl } = req.body;
    const result = await authService.loginGoogle({
      email,
      name,
      googleId,
      avatarUrl,
      reqInfo: getReqInfo(req)
    });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      isNew: result.isNew,
      message: result.isNew ? 'Google registration successful' : 'Google login successful'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update Profile (Username & Gender)
 * PUT /api/auth/profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { username, gender, avatarUrl } = req.body;
    const result = await authService.updateProfile(req.user.id, {
      username,
      gender,
      avatarUrl,
      reqInfo: getReqInfo(req)
    });

    res.json({
      success: true,
      user: result.user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login (Step 1)
 * POST /api/auth/login
 */
router.post('/login', ipRateLimiter, checkAccountLockout, async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;
    const result = await authService.login({
      identifier: identifier || email || username,
      password,
      reqInfo: getReqInfo(req)
    });

    if (result.requires2FA) {
      return res.json({
        requires2FA: true,
        tempToken: result.tempToken,
        email: result.email,
        message: 'Two-factor authentication code required'
      });
    }

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      requires2FA: false,
      user: result.user,
      token: result.token,
      message: 'Login successful'
    });
  } catch (error) {
    const status = error.statusCode || 401;
    res.status(status).json({
      error: error.message,
      isLocked: Boolean(error.isLocked),
      remainingMinutes: error.remainingMinutes
    });
  }
});

/**
 * Verify 2FA (Step 2)
 * POST /api/auth/verify-2fa
 */
router.post('/verify-2fa', ipRateLimiter, checkAccountLockout, async (req, res) => {
  try {
    const { tempToken, code, isBackupCode } = req.body;
    const result = await authService.verify2FALogin({
      tempToken,
      code,
      isBackupCode: Boolean(isBackupCode),
      reqInfo: getReqInfo(req)
    });

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      usedBackupCode: result.usedBackupCode,
      message: result.usedBackupCode
        ? 'Authenticated using backup code'
        : 'Two-factor authentication verified'
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({
      error: error.message,
      isLocked: Boolean(error.isLocked),
      remainingMinutes: error.remainingMinutes
    });
  }
});

/**
 * Current User Profile
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  const unusedCodes = await backupCodesRepo.getUnusedCodes(req.user.id);
  res.json({
    user: req.user,
    backupCodesRemaining: unusedCodes.length
  });
});

/**
 * Get All Registered Users
 * GET /api/auth/users
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await userRepo.getAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Start 2FA Setup
 * POST /api/auth/2fa/setup
 */
router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const data = await authService.setup2FA(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Confirm and Enable 2FA
 * POST /api/auth/2fa/confirm
 */
router.post('/2fa/confirm', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await authService.confirm2FA(req.user.id, code, getReqInfo(req));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
router.post('/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to disable 2FA' });
    }
    const result = await authService.disable2FA(req.user.id, password, getReqInfo(req));
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Logout
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
