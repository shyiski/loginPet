import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const APP_NAME = process.env.APP_NAME || 'LoginPet';

/**
 * Generate a new TOTP secret and QR code for scanning in authenticator apps
 */
export async function generateTwoFactorSecret(userEmail) {
  const secret = authenticator.generateSecret();
  const otpauthUri = authenticator.keyuri(userEmail, APP_NAME, secret);

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });

  return {
    secret,
    otpauthUri,
    qrCodeDataUrl
  };
}

/**
 * Verify a 6-digit TOTP code against a secret
 */
export function verifyTwoFactorCode(token, secret) {
  if (!token || !secret) return false;
  // Clean token from spaces/dashes
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  try {
    return authenticator.check(cleanToken, secret);
  } catch (error) {
    console.error('[2FA] Error verifying token:', error.message);
    return false;
  }
}

/**
 * Generate a list of human-friendly backup recovery codes (e.g., ABCD-EFGH)
 * Returns plain codes (shown once to user) and hashed codes (saved to DB)
 */
export async function generateBackupCodes(count = 6) {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    // Generate 8 random bytes hex or base32-like characters
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;

    const hash = await bcrypt.hash(code, 8);

    plainCodes.push(code);
    hashedCodes.push(hash);
  }

  return {
    plainCodes,
    hashedCodes
  };
}

/**
 * Verify if provided code matches any of the stored backup code hashes
 */
export async function verifyBackupCode(inputCode, storedCodes) {
  const cleanInput = String(inputCode).trim().toUpperCase();

  for (const item of storedCodes) {
    const isMatch = await bcrypt.compare(cleanInput, item.code_hash);
    if (isMatch) {
      return { valid: true, backupCodeId: item.id };
    }
  }

  return { valid: false, backupCodeId: null };
}
