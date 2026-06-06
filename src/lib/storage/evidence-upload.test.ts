import { describe, expect, it } from 'vitest';
import { inspectEvidenceUploadText } from './evidence-upload';

describe('evidence upload PHI blocker', () => {
  it('returns category, risk, sample and next choices for PHI-like text', () => {
    const result = inspectEvidenceUploadText('山田太郎さん MRN-1234567 taro@example.com の同意資料');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.category).toBe('email');
      expect(result.risk).toContain('メール');
      expect(result.nextChoices).toContain('匿名化済みの資料に差し替える');
      expect(result.sanitizedSample).toContain('[REDACTED]');
      expect(result.sanitizedSample).not.toContain('taro@example.com');
    }
  });
});
