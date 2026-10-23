"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { journeyCopy } from "@/lib/journey/copy";
import { courseHref, selectedCourseId } from "@/lib/journey/navigation";
import { parseHaderTranscript } from "@/lib/journey/hader";
import { downloadText } from "@/lib/journey/draft";
interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
  onstart: (() => void) | null; onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
}
export default function LecturePage() {
  const { locale } = useI18n(); const copy = journeyCopy[locale];
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]); const [courseId, setCourseId] = useState(""); const [title, setTitle] = useState(""); const [transcript, setTranscript] = useState(""); const [listening, setListening] = useState(false); const [error, setError] = useState<"unsupported" | "captureError" | "loadError" | null>(null); const [sample, setSample] = useState(false);
  const [importError, setImportError] = useState(false);
  const [starting, setStarting] = useState(false);
  const captureNumber = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => { fetch("/api/courses").then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); setCourses(data); setCourseId(data.some((c: {id: string}) => c.id === selectedCourseId()) ? selectedCourseId() : data[0]?.id || ""); }).catch(() => setError("loadError")); return () => { if (recognition.current) { recognition.current.onstart = null; recognition.current.onend = null; recognition.current.onerror = null; recognition.current.onresult = null; recognition.current.stop(); } }; }, []);
  function start() {
    if (starting || listening) return;
    setError(null);
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) { setError("unsupported"); return; }
    const engine = new Constructor(); recognition.current = engine;
    engine.continuous = true; engine.interimResults = false; engine.lang = locale === "ar" ? "ar" : "en-US";
    const capture = ++captureNumber.current;
    let startedAt = Date.now();
    engine.onstart = () => { startedAt = Date.now(); setStarting(false); setListening(true); };
    engine.onresult = event => { for (let i = event.resultIndex; i < event.results.length; i++) { if (!event.results[i].isFinal) continue; const seconds = Math.floor((Date.now() - startedAt) / 1000); const stamp = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; const line = event.results[i][0].transcript.trim(); if (line) setTranscript(prev => `${prev}${prev ? "\n" : ""}[capture ${capture}] [${stamp}] ${line}`); } };
    engine.onerror = () => { setStarting(false); setListening(false); setError("captureError"); engine.stop(); };
    engine.onend = () => { setStarting(false); setListening(false); };
    try { setStarting(true); engine.start(); } catch { setStarting(false); setListening(false); setError("captureError"); }
  }
  return <div className="space-y-5 max-w-4xl mx-auto">
    <header><h1 className="text-2xl font-bold">{copy.lecture}</h1><p className="text-slate-500 mt-2">{copy.lectureIntro}</p></header>
    <section className="card space-y-4">
      <label htmlFor="lecture-course" className="block">{copy.choose}</label><select id="lecture-course" disabled={listening || starting} value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">{copy.choose}</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label htmlFor="lecture-title" className="block">{copy.lectureTitle}</label><input id="lecture-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
      <p className="text-sm text-slate-500">{copy.speechNotice}</p>
      {error && <p role="alert" className="text-red-700 dark:text-red-300">{copy[error]}</p>}
      <div className="flex flex-wrap gap-3">{listening ? <button className="btn-secondary min-h-11" onClick={() => { recognition.current?.stop(); setListening(false); }}>{copy.stop}</button> : <button disabled={sample || starting} className="btn-primary min-h-11" onClick={start}>{copy.capture}</button>}
      {!transcript && !listening && !starting && <button className="btn-secondary min-h-11" onClick={() => { setTranscript(locale === "ar" ? "[00:00] مثال تعليمي: كيف تؤثر المنافسة في استراتيجية الشركة؟" : "[00:00] Sample only: How does competition affect a company's strategy?"); setSample(true); }}>{copy.sample}</button>}
      {sample && <button className="btn-secondary" onClick={() => { setTranscript(""); setSample(false); }}>{copy.clear}</button>}</div>
      {starting && <p role="status">{locale === "ar" ? "في انتظار إذن الميكروفون وبدء خدمة المتصفح…" : "Waiting for microphone permission and browser recognition to start…"}</p>}{listening && <p role="status">{copy.listening}</p>}{sample && <p role="status" className="border border-amber-300 rounded-xl p-3">{copy.sampleLabel}</p>}
      {!listening && !starting && !transcript && <div><label htmlFor="hader-import" className="block mb-2">{locale === "ar" ? "استيراد ملف Hader JSON (حتى ٢ ميجابايت)" : "Import Hader JSON (up to 2 MB)"}</label><input id="hader-import" type="file" accept=".json,application/json" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return; setImportError(false);
        try { if (file.size > 2 * 1024 * 1024) throw new Error(); const imported = parseHaderTranscript(await file.text()); setTitle(imported.title); setTranscript(imported.transcript); setSample(imported.hasDemo); } catch { setImportError(true); }
      }} /></div>}
      {importError && <p role="alert" className="text-red-700">{locale === "ar" ? "الملف غير صالح أو يتجاوز الحجم المسموح. لم نغير نصك." : "The file is invalid or too large. Your transcript was not changed."}</p>}
      <label htmlFor="lecture-transcript" className="block font-medium">{copy.transcript}</label><textarea id="lecture-transcript" rows={14} maxLength={100000} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder={copy.transcriptHint} />
      <p className="text-xs text-slate-500">{copy.notSaved}</p><button className="btn-secondary min-h-11" disabled={!transcript.trim()} onClick={() => downloadText("maktab-transcript.txt", `${sample ? copy.sampleLabel + "\n" : ""}${courses.find(c => c.id === courseId)?.name || ""}\n${title}\n\n${transcript}`)}>{copy.download}</button>
      <p className="text-sm text-slate-500">{copy.noEmail}</p>
    </section>
    {courseId && <Link href={courseHref("/study", courseId)} className="btn-primary inline-flex min-h-11">{copy.prep}</Link>}
  </div>;
}
