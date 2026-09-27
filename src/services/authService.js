import bcrypt from 'bcryptjs';
import { userRepo, backupCodesRepo, authLogsRepo } from '../db/index.js';
import {
  generateAuthToken,
  generateTemp2FAToken,
  verifyTemp2FAToken
} from '../middleware/authMiddleware.js';
import {
  generateTwoFactorSecret,
  verifyTwoFactorCode,
  generateBackupCodes,
  verifyBackupCode
} from './totpService.js';

export const authService = {
  /**
   * Register a new user with Email & Password (username optional)
   */
  async register({ email, password, username, reqInfo = {} }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await userRepo.findByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const finalUsername = (username && username.trim()) ? username.trim() : cleanEmail.split('@')[0];

    const newUser = await userRepo.create({
      email: cleanEmail,
      username: finalUsername,
      passwordHash
    });

    await authLogsRepo.create({
      userId: newUser.id,
      action: 'REGISTER',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: `User registered: ${newUser.email}`
    });

    const token = generateAuthToken(newUser);
    return { user: newUser, token };
  },

  /**
   * Google OAuth / Single Sign-On simulation
   */
  async loginGoogle({ email, name, googleId, avatarUrl, reqInfo = {} }) {
    if (!email) {
      throw new Error('Google account email is required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const { user, isNew } = await userRepo.findOrCreateGoogleUser({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      googleId,
      avatarUrl
    });

    await authLogsRepo.create({
      userId: user.id,
      action: isNew ? 'REGISTER_GOOGLE' : 'LOGIN_GOOGLE',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: `Google authentication: ${user.email} (new: ${isNew})`
    });

    const token = generateAuthToken(user);
    return { user, token, isNew };
  },

  /**
   * Update User Profile (Username & Gender: M / F)
   */
  async updateProfile(userId, { username, gender, avatarUrl, reqInfo = {} }) {
    if (!userId) {
      throw new Error('User is not authorized');
    }

    if (gender && !['M', 'F'].includes(gender)) {
      throw new Error('Invalid gender. Allowed values: M or F');
    }

    const updatedUser = await userRepo.updateProfile(userId, {
      username: username ? username.trim() : undefined,
      gender: gender || null,
      avatarUrl: avatarUrl || undefined
    });

    await authLogsRepo.create({
      userId,
      action: 'PROFILE_UPDATED',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: `Profile updated: name=${updatedUser.username}, gender=${updatedUser.gender || 'not specified'}`
    });

    return { user: updatedUser };
  },

  /**
   * Standard Login (Step 1: Check email/username & password)
   */
  async login({ identifier, email, password, reqInfo = {} }) {
    const loginKey = (identifier || email || '').trim();
    if (!loginKey || !password) {
      throw new Error('Username or email and password are required');
    }

    const user = await userRepo.findByEmailOrUsername(loginKey);
    if (!user) {
      await authLogsRepo.create({
        userId: null,
        action: 'LOGIN_FAILED',
        ip: reqInfo.ip,
        userAgent: reqInfo.userAgent,
        details: `Login failed: user not found (${loginKey})`
      });
      throw new Error('Invalid username/email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await authLogsRepo.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        ip: reqInfo.ip,
        userAgent: reqInfo.userAgent,
        details: 'Invalid password attempt'
      });
      throw new Error('Invalid username/email or password');
    }

    // Check if 2FA is active
    if (user.two_factor_enabled === 1 || user.two_factor_enabled === true) {
      await authLogsRepo.create({
        userId: user.id,
        action: 'LOGIN_PASSWORD_OK',
        ip: reqInfo.ip,
        userAgent: reqInfo.userAgent,
        details: 'Password verified, waiting for 2FA'
      });

      const tempToken = generateTemp2FAToken(user.id);
      return {
        requires2FA: true,
        tempToken,
        email: user.email,
        username: user.username
      };
    }

    // 2FA not enabled, login directly
    await authLogsRepo.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: 'Password login successful (no 2FA)'
    });

    const safeUser = await userRepo.findById(user.id);
    const token = generateAuthToken(safeUser);
    return {
      requires2FA: false,
      token,
      user: safeUser
    };
  },

  /**
   * 2FA Verification (Step 2: Check TOTP code or Backup code)
   */
  async verify2FALogin({ tempToken, code, isBackupCode = false, reqInfo = {} }) {
    if (!tempToken || !code) {
      throw new Error('Temporary token and 2FA code are required');
    }

    const payload = verifyTemp2FAToken(tempToken);
    if (!payload) {
      throw new Error('2FA session has expired or is invalid. Please log in again.');
    }

    const user = await userRepo.findByIdWithSecret(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // If logging in via Backup Code
    if (isBackupCode) {
      const unusedCodes = await backupCodesRepo.getUnusedCodes(user.id);
      const { valid, backupCodeId } = await verifyBackupCode(code, unusedCodes);

      if (!valid) {
        await authLogsRepo.create({
          userId: user.id,
          action: '2FA_FAILED',
          ip: reqInfo.ip,
          userAgent: reqInfo.userAgent,
          details: 'Failed 2FA attempt using backup code'
        });
        throw new Error('Invalid or already used backup code');
      }

      await backupCodesRepo.markAsUsed(backupCodeId);
      await authLogsRepo.create({
        userId: user.id,
        action: '2FA_SUCCESS',
        ip: reqInfo.ip,
        userAgent: reqInfo.userAgent,
        details: `2FA authenticated via backup code (code id #${backupCodeId})`
      });

      const safeUser = await userRepo.findById(user.id);
      const token = generateAuthToken(safeUser);
      return {
        user: safeUser,
        token,
        usedBackupCode: true
      };
    }

    // Otherwise, verify 6-digit TOTP
    const isValid = verifyTwoFactorCode(code, user.two_factor_secret);
    if (!isValid) {
      await authLogsRepo.create({
        userId: user.id,
        action: '2FA_FAILED',
        ip: reqInfo.ip,
        userAgent: reqInfo.userAgent,
        details: 'Invalid 6-digit TOTP code'
      });
      throw new Error('Invalid 2FA verification code');
    }

    await authLogsRepo.create({
      userId: user.id,
      action: '2FA_SUCCESS',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: '2FA authenticated successfully via TOTP app'
    });

    const safeUser = await userRepo.findById(user.id);
    const token = generateAuthToken(safeUser);
    return {
      user: safeUser,
      token,
      usedBackupCode: false
    };
  },

  /**
   * Start 2FA Setup: Generate new secret + QR code
   */
  async setup2FA(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const { secret, otpauthUri, qrCodeDataUrl } = await generateTwoFactorSecret(user.email);
    await userRepo.saveTemp2FASecret(userId, secret);

    return {
      secret,
      otpauthUri,
      qrCodeDataUrl
    };
  },

  /**
   * Confirm and enable 2FA after scanning QR code
   */
  async confirm2FA(userId, code, reqInfo = {}) {
    const user = await userRepo.findByIdWithSecret(userId);
    if (!user || !user.two_factor_secret) {
      throw new Error('2FA setup was not started');
    }

    const isValid = verifyTwoFactorCode(code, user.two_factor_secret);
    if (!isValid) {
      throw new Error('Invalid code. Please check your device time and try again.');
    }

    // Enable 2FA in database
    await userRepo.enable2FA(userId);

    // Generate and store backup recovery codes
    const { plainCodes, hashedCodes } = await generateBackupCodes(6);
    await backupCodesRepo.replaceCodes(userId, hashedCodes);

    await authLogsRepo.create({
      userId,
      action: '2FA_ENABLED',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: '2FA enabled and new backup codes generated'
    });

    const updatedUser = await userRepo.findById(userId);

    return {
      success: true,
      backupCodes: plainCodes,
      user: updatedUser
    };
  },

  /**
   * Disable 2FA
   */
  async disable2FA(userId, password, reqInfo = {}) {
    const user = await userRepo.findByIdWithSecret(userId);
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid password to disable 2FA');
    }

    await userRepo.disable2FA(userId);

    // Invalidate any backup codes
    await backupCodesRepo.replaceCodes(userId, []);

    await authLogsRepo.create({
      userId,
      action: '2FA_DISABLED',
      ip: reqInfo.ip,
      userAgent: reqInfo.userAgent,
      details: '2FA disabled by user'
    });

    const updatedUser = await userRepo.findById(userId);
    return { success: true, user: updatedUser };
  }
};
