export type PhiBlockerResult =
  | { allowed: true; sanitizedText: string }
  | { allowed: false; category: 'email' | 'mrn' | 'phone' | 'long-number' | 'possible-real-name'; risk: string; nextChoices: string[]; sanitizedSample: string };

type PhiCategory = Exclude<PhiBlockerResult, { allowed: true }>['category'];

export function inspectEvidenceUploadText(text: string): PhiBlockerResult {
  const sample = text.slice(0, 240);
  const patterns: Array<[PhiCategory, RegExp, string]> = [
    ['email', /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/, 'メールアドレスが含まれる可能性があります'],
    ['mrn', /MRN[-_\s]*\d+|患者ID[:：]?\s*\d+/i, 'MRN/患者IDが含まれる可能性があります'],
    ['phone', /0\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/, '電話番号が含まれる可能性があります'],
    ['long-number', /\b\d{6,}\b/, '長い番号列が含まれる可能性があります'],
    ['possible-real-name', /[一-龠々]{1,4}(?:太郎|花子|さん|様)/, '実名らしき日本語表記が含まれる可能性があります'],
  ];
  for (const [category, pattern, risk] of patterns) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        category,
        risk,
        nextChoices: ['匿名化済みの資料に差し替える', '該当箇所を削除して再アップロードする', '院内/オンプレ環境でのみ処理する'],
        sanitizedSample: sample
          .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED]')
          .replace(/MRN[-_\s]*\d+|患者ID[:：]?\s*\d+/gi, '[REDACTED]')
          .replace(/0\d{1,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/g, '[REDACTED]')
          .replace(/\b\d{6,}\b/g, '[REDACTED]')
          .replace(/[一-龠々]{1,4}(?:太郎|花子|さん|様)/g, '[REDACTED]'),
      };
    }
  }
  return { allowed: true, sanitizedText: text.trim() };
}
