"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useProfile } from "@/components/profile/ProfileProvider";
import { CourseTools } from "@/components/learning/CourseTools";
import { journeyCopy } from "@/lib/journey/copy";
import { selectedCourseId } from "@/lib/journey/navigation";
import { readDraft, sessionMinutes, downloadText } from "@/lib/journey/draft";
export default function StudyPage() {
  const { locale } = useI18n(); const copy = journeyCopy[locale]; const { profile } = useProfile();
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]); const [courseId, setCourseId] = useState(""); const [error, setError] = useState(false); const [loaded, setLoaded] = useState(false);
  const [goal, setGoal] = useState(""); const [notes, setNotes] = useState(""); const [minutes, setMinutes] = useState(30); const [elapsed, setElapsed] = useState(0); const [running, setRunning] = useState(false); const [finished, setFinished] = useState(false); const [storageError, setStorageError] = useState(false); const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const startAt = useRef(0); const offset = useRef(0);
  const key = profile?.id && courseId ? `maktab:study:${profile.id}:${courseId}` : null;
  useEffect(() => { setMinutes(sessionMinutes(new URLSearchParams(window.location.search).get("minutes"))); fetch("/api/courses").then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (!Array.isArray(data)) throw new Error(); setCourses(data); setCourseId(data.some(c => c.id === selectedCourseId()) ? selectedCourseId() : data[0]?.id || ""); }).catch(() => setError(true)).finally(() => setLoaded(true)); }, []);
  useEffect(() => {
    setRunning(false); setHydratedKey(null); setGoal(""); setNotes(""); setElapsed(0); setFinished(false);
    if (!key) return;
    try { const draft = readDraft(sessionStorage.getItem(key), courseId); if (draft) { setGoal(draft.goal); setNotes(draft.notes); setElapsed(draft.elapsed); setMinutes(draft.minutes); setFinished(draft.finished); } } catch { setStorageError(true); }
    setHydratedKey(key);
  }, [key, courseId]);
  useEffect(() => {
    if (!key || hydratedKey !== key) return;
    try { sessionStorage.setItem(key, JSON.stringify({ courseId, goal, notes, elapsed, minutes, finished })); } catch { setStorageError(true); }
  }, [key, hydratedKey, courseId, goal, notes, elapsed, minutes, finished]);
  useEffect(() => {
    if (!running) return;
    startAt.current = Date.now(); offset.current = elapsed;
    const timer = setInterval(() => setElapsed(Math.min(86400, offset.current + Math.floor((Date.now() - startAt.current) / 1000))), 1000);
    return () => clearInterval(timer);
    // Capture elapsed only when the learner starts/resumes; never restart on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const course = courses.find(c => c.id === courseId);
  const remaining = Math.max(0, minutes * 60 - elapsed);
  if (!loaded) return <div className="skeleton h-64" aria-busy="true" />;
  if (error) return <div className="card" role="alert">{copy.loadError}<button className="btn-secondary ms-3" onClick={() => window.location.reload()}>{copy.retry}</button></div>;
  if (!courses.length) return <div className="card space-y-4"><p>{copy.noCourses}</p><Link href="/courses?add=1" className="btn-primary inline-flex">{copy.addCourse}</Link></div>;
  return <div className="space-y-6 max-w-4xl mx-auto">
    <header><h1 className="text-2xl font-bold">{copy.session}</h1><p className="text-sm text-slate-500 mt-2">{copy.sessionIntro}</p></header>
    <div><label htmlFor="session-course" className="block mb-2">{copy.choose}</label><select id="session-course" disabled={running} value={courseId} onChange={e => setCourseId(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <section className="card space-y-4">
      <label htmlFor="session-goal" className="block font-medium">{copy.goal}</label><input id="session-goal" maxLength={500} value={goal} onChange={e => setGoal(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-3xl tabular-nums" aria-label={`${Math.ceil(remaining / 60)} ${copy.minutes}`}>{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</span><span className="text-sm text-slate-500">/ {minutes} {copy.minutes}</span><button className="btn-primary min-h-11" onClick={() => { setRunning(!running); setFinished(false); }}>{running ? copy.pause : copy.startTimer}</button><button className="btn-secondary min-h-11" onClick={() => { setRunning(false); setFinished(true); }}>{copy.finish}</button></div>
      {finished && <p role="status" className="text-teal-700 dark:text-teal-300">{copy.completed}</p>}
      <label htmlFor="study-notes" className="block font-medium">{copy.notes}</label><textarea id="study-notes" rows={7} maxLength={50000} value={notes} onChange={e => setNotes(e.target.value)} placeholder={copy.notesPlaceholder} />
      <p className="text-xs text-slate-500" role="status">{storageError || !key ? copy.localError : copy.local}</p>
      <button className="btn-secondary min-h-11" onClick={() => downloadText("maktab-study-notes.txt", `${course?.name}\n${goal}\n${Math.floor(elapsed / 60)} ${copy.minutes}\n\n${notes}`)}>{copy.download}</button>
    </section>
    <section className="card space-y-3"><h2 className="font-semibold">{copy.selfCheck}</h2><ul className="list-disc ps-5 space-y-2">{copy.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul><p className="text-sm text-slate-500">{copy.practiceOnly}</p></section>
    <section className="card space-y-4"><h2 className="font-semibold">{copy.resources}</h2><CourseTools courseId={courseId} /></section>
  </div>;
}
