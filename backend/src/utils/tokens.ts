import crypto from 'crypto';
import { nanoid } from 'nanoid';

export function generateEditToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  if (tokenHash.length !== hash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

export function generateShareId(): string {
  return nanoid(12);
}
