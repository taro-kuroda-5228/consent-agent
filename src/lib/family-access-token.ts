import { createHmac, timingSafeEqual } from 'node:crypto';

export const FAMILY_TOKEN_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 緊急ICの想定運用: 発行から24時間

type EnvLike = Record<string, string | undefined>;

// 秘密鍵未設定（ローカル/匿名デモ）でもリンクにトークンを載せるための開発用鍵。
// 検証の強制は CONSENT_AGENT_LINK_SECRET が設定されている場合のみ行う。
const DEV_FALLBACK_SECRET = 'consent-agent-dev-link-secret';

export function familyTokenSecret(env: EnvLike = process.env): string {
  return env.CONSENT_AGENT_LINK_SECRET?.trim() || DEV_FALLBACK_SECRET;
}

export function isFamilyTokenEnforced(env: EnvLike = process.env): boolean {
  return Boolean(env.CONSENT_AGENT_LINK_SECRET?.trim());
}

function signFamilyToken(sessionId: string, expiresAtMs: number, secret: string): string {
  return createHmac('sha256', secret).update(`${sessionId}.${expiresAtMs}`).digest('hex');
}

export function createFamilyAccessToken(
  sessionId: string,
  options: { env?: EnvLike; ttlMs?: number; now?: number } = {},
): string {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now();
  const expiresAtMs = now + (options.ttlMs ?? FAMILY_TOKEN_DEFAULT_TTL_MS);
  return `${expiresAtMs}.${signFamilyToken(sessionId, expiresAtMs, familyTokenSecret(env))}`;
}

export type FamilyTokenVerification =
  | { valid: true }
  | { valid: false; reason: 'missing-token' | 'malformed-token' | 'expired' | 'signature-mismatch' };

export function verifyFamilyAccessToken(
  sessionId: string,
  token: string | null | undefined,
  options: { env?: EnvLike; now?: number } = {},
): FamilyTokenVerification {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now();

  if (!token?.trim()) return { valid: false, reason: 'missing-token' };
  const [expiresPart, signaturePart] = token.split('.');
  const expiresAtMs = Number(expiresPart);
  if (!Number.isFinite(expiresAtMs) || !signaturePart) return { valid: false, reason: 'malformed-token' };
  if (expiresAtMs < now) return { valid: false, reason: 'expired' };

  const expected = signFamilyToken(sessionId, expiresAtMs, familyTokenSecret(env));
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signaturePart, 'hex');
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { valid: false, reason: 'signature-mismatch' };
  }
  return { valid: true };
}

/**
 * 家族向けエンドポイントのアクセス判定。
 * CONSENT_AGENT_LINK_SECRET が未設定（匿名デモ）の場合は強制しない。
 */
export function checkFamilyAccess(
  sessionId: string,
  token: string | null | undefined,
  options: { env?: EnvLike; now?: number } = {},
): { allowed: true } | { allowed: false; status: 401; error: string } {
  const env = options.env ?? process.env;
  if (!isFamilyTokenEnforced(env)) return { allowed: true };
  const verification = verifyFamilyAccessToken(sessionId, token, options);
  if (verification.valid) return { allowed: true };
  return {
    allowed: false,
    status: 401,
    error: verification.reason === 'expired'
      ? 'family link expired; ask the care team to reissue the link'
      : 'invalid family access token',
  };
}
