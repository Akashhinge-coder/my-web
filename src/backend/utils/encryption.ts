import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Ensures the APP_ENCRYPTION_KEY is available and valid.
 * It expects a 32-byte hex string (64 characters).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.APP_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('APP_ENCRYPTION_KEY is not defined in environment variables.');
  }
  
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(`APP_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters). Current length: ${key.length}`);
  }
  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * The output format is: iv:tag:encryptedData (all hex encoded)
 */
export function encryptString(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string that was encrypted using encryptString().
 * Expects format: iv:tag:encryptedData
 */
export function decryptString(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected iv:tag:encryptedData');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
