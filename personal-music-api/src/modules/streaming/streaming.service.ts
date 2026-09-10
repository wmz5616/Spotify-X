import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';

@Injectable()
export class StreamingService {
  private tokens = new Map<string, { songId: number; expiresAt: number }>();
  private readonly secret = process.env.JWT_SECRET || 'spotify-x-stream-secret-2026';

  /**
   * Create a signed stream token for a song (valid for 2 hours by default)
   * @param songId 
   * @param ttlSeconds Default 7200 seconds (2 hours)
   */
  createToken(songId: number, ttlSeconds = 7200): string {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const signature = createHmac('sha256', this.secret)
      .update(`${songId}:${expiresAt}`)
      .digest('hex');
    const token = `${expiresAt}.${signature}`;
    this.tokens.set(token, { songId: Number(songId), expiresAt });
    return token;
  }

  /**
   * Validate a stream token (supports stateless HMAC and in-memory fallback)
   * @param token 
   * @param songId 
   */
  validateToken(token: string, songId: number): boolean {
    if (!token) return false;

    // 1. Try stateless HMAC validation (persistent across server restarts)
    if (token.includes('.')) {
      const [expiresAtStr, signature] = token.split('.');
      const expiresAt = parseInt(expiresAtStr, 10);
      if (!isNaN(expiresAt) && Date.now() <= expiresAt) {
        const expectedSig = createHmac('sha256', this.secret)
          .update(`${songId}:${expiresAt}`)
          .digest('hex');
        if (signature === expectedSig) {
          return true;
        }
      }
    }

    // 2. Fallback to in-memory check (for legacy UUID tokens)
    const entry = this.tokens.get(token);
    if (!entry) return false;

    if (Number(entry.songId) !== Number(songId)) return false;

    if (Date.now() > entry.expiresAt) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [token, entry] of this.tokens.entries()) {
      if (now > entry.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}
