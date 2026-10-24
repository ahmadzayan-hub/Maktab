"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DocumentEvidence, EvidenceCode, EvidenceError } from "@/lib/documents/evidence";
import { extractDocument } from "@/lib/documents/extract-client";
const errors: Record<EvidenceCode, [string, string]> = {
  too_large: ["Choose a file under 8 MiB.", "اختار ملف أقل من 8 ميجابايت."],
  unsupported: ["Local preview supports PDF and DOCX only.", "المعاينة المحلية تدعم PDF وDOCX فقط."],
  corrupt: ["This file could not be read. It may be corrupt or unsupported.", "تعذّرت قراءة الملف. قد يكون تالفًا أو غير مدعوم."],
  encrypted: ["Password-protected files are not supported. Choose an unlocked copy.", "الملفات المحمية بكلمة مرور غير مدعومة. اختار نسخة غير مقفلة."],
  no_text: ["No extractable text. This may be a scanned document; OCR is not included.", "مفيش نص قابل للاستخراج. ممكن يكون الملف صورًا ممسوحة؛ OCR مش متاح هنا."],
  limit: ["The document exceeds the safe extraction limit. Try a smaller excerpt.", "المستند تجاوز حد الاستخراج الآمن. جرّب جزءًا أصغر."],
  timeout: ["Reading took too long and was stopped. Try a smaller file.", "القراءة استغرقت وقتًا طويلًا واتوقفت. جرّب ملفًا أصغر."],
  cancelled: ["Reading cancelled.", "تم إلغاء القراءة."]
};
export default function LocalDocumentEvidence() {
  const { locale } = useI18n(); const ar = locale === "ar"; const at = ar ? 1 : 0;
  const [evidence, setEvidence] = useState<DocumentEvidence | null>(null);
  const [error, setError] = useState<EvidenceCode | null>(null); const [busy, setBusy] = useState(false);
  const run = useRef<AbortController | null>(null);
  useEffect(() => () => run.current?.abort(), []);
  async function choose(file?: File) {
    run.current?.abort(); const controller = new AbortController(); run.current = controller;
    setEvidence(null); setError(null); if (!file) { setBusy(false); return; }
    setBusy(true);
    try { const result = await extractDocument(file, controller.signal); if (run.current === controller) setEvidence(result); }
    catch (e) { if (run.current === controller) setError(e instanceof EvidenceError ? e.code : "corrupt"); }
    finally { if (run.current === controller) setBusy(false); }
  }
  function clear() { run.current?.abort(); run.current = null; setBusy(false); setEvidence(null); setError(null); }
  function download() {
    if (!evidence) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "maktab-local-evidence.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="card space-y-4" aria-labelledby="local-evidence-title">
    <h2 id="local-evidence-title" className="text-lg font-semibold">{ar ? "اقرأ ملفك على جهازك" : "Read a file on your device"}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">{ar ? "معاينة نص PDF أو DOCX بدون رفع الملف أو استخدام AI. النتيجة مؤقتة؛ نزّلها قبل المغادرة. لا تُضاف تلقائيًا إلى المدرّس أو البحث." : "Preview PDF or DOCX text without uploading it or using AI. Results are temporary; download before leaving. This does not add the file to tutor search."}</p>
    <p className="text-xs text-slate-500">{ar ? "حتى 8 ميجابايت، 150 صفحة PDF أو 1000 قسم DOCX، و200 ألف حرف. بدون OCR." : "Up to 8 MiB, 150 PDF pages or 1,000 DOCX sections, and 200,000 characters. No OCR."}</p>
    <div className="flex flex-wrap items-center gap-3">
      <label className="btn-secondary cursor-pointer min-h-11 inline-flex items-center">{ar ? "اختار ملفًا للمعاينة المحلية" : "Choose a local preview file"}<input data-testid="local-document-input" aria-label={ar ? "ملف للمعاينة المحلية" : "Local preview file"} className="sr-only" type="file" accept=".pdf,.docx" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; void choose(file); }} /></label>
      {busy && <button className="btn-secondary min-h-11" onClick={() => run.current?.abort()}>{ar ? "إلغاء القراءة" : "Cancel reading"}</button>}
      {(evidence || error) && <button className="btn-ghost min-h-11" onClick={clear}>{ar ? "مسح المعاينة" : "Clear preview"}</button>}
    </div>
    {busy && <p role="status">{ar ? "بنقرأ الملف محليًا…" : "Reading locally…"}</p>}
    {error && <p role="alert" className="text-amber-700 dark:text-amber-300">{errors[error][at]}</p>}
    {evidence && <div className="space-y-3" data-testid="local-evidence-result">
      <p className="font-medium break-all">{evidence.name}</p>
      <p className="text-xs break-all font-mono" dir="ltr">SHA-256: {evidence.sha256}</p>
      <p className="text-sm text-amber-700 dark:text-amber-300">{evidence.format === "docx" ? (ar ? "الأقسام فقرات مستخرجة، وليست أرقام صفحات. راجع الأصل للجداول والتنسيق." : "Sections are extracted paragraphs, not page numbers. Check the original for tables and layout.") : (ar ? "أرقام الصفحات من ملف PDF الأصلي. راجع ترتيب القراءة؛ الصفحات المصوّرة قد لا تحتوي نصًا." : "Page numbers come from the original PDF. Check reading order; image-only pages may have no text.")}</p>
      {evidence.warnings.includes("docx_warnings") && <p className="text-sm">{ar ? "بعض عناصر المستند غير مدعومة وقد لا تظهر في النص." : "Some document elements are unsupported and may be absent from the text."}</p>}
      <button className="btn-secondary min-h-11" onClick={download}>{ar ? "تنزيل النص ومراجع المصدر" : "Download text and source references"}</button>
      <div className="max-h-[32rem] overflow-auto space-y-3 border rounded-xl p-3">
        {evidence.sections.map(section => <article key={section.index} className="border-b pb-3 last:border-0">
          <h3 className="font-semibold text-sm">{section.location === "page" ? (ar ? "صفحة" : "Page") : (ar ? "قسم" : "Section")} {section.index}</h3>
          <p className="whitespace-pre-wrap break-words text-sm mt-2" dir="auto">{section.text || (ar ? "لا يوجد نص قابل للاستخراج في هذه الصفحة." : "No extractable text on this page.")}</p>
        </article>)}
      </div>
    </div>}
  </section>;
}
