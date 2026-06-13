import { describe, expect, it } from 'vitest';
import {
  checkFamilyAccess,
  createFamilyAccessToken,
  isFamilyTokenEnforced,
  verifyFamilyAccessToken,
} from './family-access-token';

const env = { CONSENT_AGENT_LINK_SECRET: 'test-secret' };
const sessionId = 'session-test-1234';

describe('family access token', () => {
  it('creates a token that verifies for the same session', () => {
    const token = createFamilyAccessToken(sessionId, { env, now: 1_000 });
    expect(verifyFamilyAccessToken(sessionId, token, { env, now: 2_000 })).toEqual({ valid: true });
  });

  it('rejects tokens for a different session (capability is session-bound)', () => {
    const token = createFamilyAccessToken(sessionId, { env, now: 1_000 });
    const result = verifyFamilyAccessToken('session-other', token, { env, now: 2_000 });
    expect(result).toEqual({ valid: false, reason: 'signature-mismatch' });
  });

  it('rejects expired tokens', () => {
    const token = createFamilyAccessToken(sessionId, { env, now: 1_000, ttlMs: 100 });
    expect(verifyFamilyAccessToken(sessionId, token, { env, now: 5_000 })).toEqual({ valid: false, reason: 'expired' });
  });

  it('rejects tampered and malformed tokens', () => {
    const token = createFamilyAccessToken(sessionId, { env, now: 1_000 });
    const [expiry, signature] = token.split('.');
    const tampered = `${Number(expiry) + 9_999_999}.${signature}`;
    expect(verifyFamilyAccessToken(sessionId, tampered, { env, now: 2_000 }).valid).toBe(false);
    expect(verifyFamilyAccessToken(sessionId, 'not-a-token', { env, now: 2_000 })).toEqual({ valid: false, reason: 'malformed-token' });
    expect(verifyFamilyAccessToken(sessionId, undefined, { env, now: 2_000 })).toEqual({ valid: false, reason: 'missing-token' });
  });

  it('does not enforce tokens in anonymous demo mode (no secret configured)', () => {
    expect(isFamilyTokenEnforced({})).toBe(false);
    expect(checkFamilyAccess(sessionId, undefined, { env: {} })).toEqual({ allowed: true });
  });

  it('enforces tokens when a link secret is configured', () => {
    const token = createFamilyAccessToken(sessionId, { env, now: 1_000 });
    expect(checkFamilyAccess(sessionId, token, { env, now: 2_000 })).toEqual({ allowed: true });
    const denied = checkFamilyAccess(sessionId, 'bad.token', { env, now: 2_000 });
    expect(denied.allowed).toBe(false);
  });
});
