import { AppError } from '../errors';

const crypto = require('crypto') as any;

const SCRYPT_KEYLEN = 64;

async function scryptBuffer(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (error: Error | null, derivedKey: Buffer) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Buffer.from(derivedKey));
    });
  });
}

export function normalizePhoneNumberOrThrow(phoneInput: unknown): { normalized: string; display: string } {
  if (typeof phoneInput !== 'string') {
    throw new AppError('VALIDATION_FAILED', 'Phone number is required');
  }

  const display = phoneInput.trim();
  if (!display) {
    throw new AppError('VALIDATION_FAILED', 'Phone number is required');
  }

  let compact = display.replace(/[\s\-().]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith('+')) compact = `+${compact}`;

  if (!/^\+[0-9]{8,15}$/.test(compact)) {
    throw new AppError('VALIDATION_FAILED', 'Invalid phone number format');
  }

  return { normalized: compact, display };
}

export function validatePasswordStrengthOrThrow(passwordInput: unknown): string {
  if (typeof passwordInput !== 'string' || !passwordInput.length) {
    throw new AppError('PASSWORD_REQUIRED', 'Password is required');
  }

  const password = passwordInput.trim();
  if (password.length < 8) {
    throw new AppError('PASSWORD_TOO_WEAK', 'Password must be at least 8 characters long');
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    throw new AppError('PASSWORD_TOO_WEAK', 'Password must contain letters and numbers');
  }

  return password;
}

export async function hashPassword(password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
  const passwordSalt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptBuffer(password, passwordSalt);
  return {
    passwordHash: derived.toString('hex'),
    passwordSalt,
  };
}

export async function verifyPassword(password: string, passwordSalt: string, passwordHash: string): Promise<boolean> {
  const derivedBuffer = await scryptBuffer(password, passwordSalt);
  const hashBuffer = Buffer.from(passwordHash, 'hex');
  if (derivedBuffer.length !== hashBuffer.length) return false;
  return crypto.timingSafeEqual(derivedBuffer, hashBuffer);
}
