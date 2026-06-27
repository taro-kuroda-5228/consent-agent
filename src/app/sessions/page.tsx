import { GeminiConsentSessionDemo } from '@/components/consent/GeminiConsentSessionDemo';

export default function SessionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-brand-700">Gemini 3 対話型説明</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">AI説明セッション</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Consent Agentが標準説明、自由回答の理解確認、同意意思確認を主導します。
          医師には理解不足・不安・個別判断が必要な質問だけを返します。
        </p>
      </section>

      <div className="mt-10">
        <GeminiConsentSessionDemo />
      </div>
    </div>
  );
}
