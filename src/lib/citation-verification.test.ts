import { describe, expect, it } from 'vitest';
import {
  getEvidenceCatalog,
  synthesizeEvidenceBoundQAFromSupportingSpans,
  verifyCitationSpans,
  type SupportingSpanExtraction,
} from './consent-demo';

const catalog = getEvidenceCatalog();
const evidence = catalog.find((item) => item.evidenceId === 'AAD-005') ?? catalog[0];
const realSpan = (evidence.keyFindings?.[0] ?? evidence.displayForFamily).trim();

const context = {
  diagnosis: 'Stanford A型急性大動脈解離',
  plannedSurgery: '上行大動脈人工血管置換術',
  risks: ['脳梗塞'],
  selectedEvidence: [evidence],
};

function extraction(spans: SupportingSpanExtraction['supportingSpans']): SupportingSpanExtraction {
  return { answerable: true, confidence: 'high', reason: 'test', supportingSpans: spans };
}

describe('verifyCitationSpans (machine verification of citations)', () => {
  it('verifies spans that exist verbatim in the selected source', () => {
    const report = verifyCitationSpans(extraction([{ evidenceId: evidence.evidenceId, span: realSpan }]), [evidence]);

    expect(report.requestedSpanCount).toBe(1);
    expect(report.verifiedSpans).toHaveLength(1);
    expect(report.verifiedSpans[0].evidenceId).toBe(evidence.evidenceId);
    expect(report.rejectedSpans).toHaveLength(0);
  });

  it('rejects fabricated spans that do not exist in the source', () => {
    const fabricated = '手術を受ければ必ず助かり、合併症は一切起こりません。';
    const report = verifyCitationSpans(extraction([{ evidenceId: evidence.evidenceId, span: fabricated }]), [evidence]);

    expect(report.verifiedSpans).toHaveLength(0);
    expect(report.rejectedSpans).toEqual([
      { evidenceId: evidence.evidenceId, span: fabricated, reason: 'span-not-found-in-source' },
    ]);
  });

  it('rejects spans attributed to evidence the physician did not select', () => {
    const report = verifyCitationSpans(extraction([{ evidenceId: 'AAD-999', span: realSpan }]), [evidence]);

    expect(report.verifiedSpans).toHaveLength(0);
    expect(report.rejectedSpans[0].reason).toBe('unknown-evidence');
  });
});

describe('synthesizeEvidenceBoundQAFromSupportingSpans with verification', () => {
  it('attaches a verification report to grounded answers', () => {
    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      '脳梗塞のリスクについて教えてください',
      context,
      extraction([{ evidenceId: evidence.evidenceId, span: realSpan }]),
    );

    expect(result.evidenceReferences).toContain(evidence.evidenceId);
    expect(result.citationVerification?.verifiedSpans.length).toBeGreaterThan(0);
    expect(result.citationVerification?.rejectedSpans).toHaveLength(0);
  });

  it('refuses to answer from fabricated spans and reports the rejection', () => {
    const fabricated = '当院の手術成功率は100%です。';
    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      '脳梗塞のリスクについて教えてください',
      context,
      extraction([{ evidenceId: evidence.evidenceId, span: fabricated }]),
    );

    expect(result.evidenceReferences).toHaveLength(0);
    expect(result.requiresDoctorReview).toBe(true);
    expect(result.answer).not.toContain('100%');
    expect(result.citationVerification?.rejectedSpans).toHaveLength(1);
    expect(result.citationVerification?.rejectedSpans[0].reason).toBe('span-not-found-in-source');
  });

  it('answers only from the verified subset when some spans are fabricated', () => {
    const fabricated = '入院は不要で、翌日に退院できます。';
    const result = synthesizeEvidenceBoundQAFromSupportingSpans(
      '脳梗塞のリスクについて教えてください',
      context,
      extraction([
        { evidenceId: evidence.evidenceId, span: realSpan },
        { evidenceId: evidence.evidenceId, span: fabricated },
      ]),
    );

    expect(result.answer).not.toContain('翌日に退院');
    expect(result.citationVerification?.verifiedSpans).toHaveLength(1);
    expect(result.citationVerification?.rejectedSpans).toHaveLength(1);
  });
});
