"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { journeyCopy } from "@/lib/journey/copy";
import { nextStudyStep } from "@/lib/journey/next-step";
import { allReadiness, type CourseInput, type DeadlineInput, type GradeInput } from "@/lib/learning/readiness";
interface Deadline extends DeadlineInput { id: string; title: string; course_name?: string; }
export function StudyCommandCenter() {
  const { locale } = useI18n(); const copy = journeyCopy[locale];
  const [courses, setCourses] = useState<CourseInput[]>([]); const [grades, setGrades] = useState<GradeInput[]>([]); const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false); const [partial, setPartial] = useState(false); const [attempt, setAttempt] = useState(0);
  const [minutes, setMinutes] = useState(30); const [chosen, setChosen] = useState("");
  useEffect(() => {
    let cancelled = false; setLoading(true); setFailed(false); setPartial(false);
    async function load() {
      const results = await Promise.allSettled(["courses", "grades", "deadlines"].map(async path => { const r = await fetch(`/api/${path}`); if (!r.ok) throw new Error(path); const data = await r.json(); if (!Array.isArray(data)) throw new Error(path); return data; }));
      if (cancelled) return;
      const [c, g, d] = results;
      if (c.status === "rejected") setFailed(true); else setCourses(c.value);
      setGrades(g.status === "fulfilled" ? g.value : []); setDeadlines(d.status === "fulfilled" ? d.value : []);
      setPartial(g.status === "rejected" || d.status === "rejected"); setLoading(false);
    }
    void load(); return () => { cancelled = true; };
  }, [attempt]);
  if (loading) return <div className="skeleton h-64 rounded-2xl" aria-busy="true" />;
  if (failed) return <div className="card" role="alert"><p>{copy.loadError}</p><button className="btn-secondary mt-3" onClick={() => setAttempt(n => n + 1)}>{copy.retry}</button></div>;
  if (!courses.length) return <section className="card space-y-3"><p>{copy.noCourses}</p><Link href="/courses?add=1" className="btn-primary inline-flex">{copy.addCourse}</Link></section>;
  const suggestion = nextStudyStep(courses, grades, deadlines)!;
  const course = courses.find(c => c.id === chosen) || suggestion.course;
  const readiness = allReadiness(courses, grades, deadlines);
  const nearest = deadlines.filter(d => !d.is_done && Number.isFinite(Date.parse(d.due_date))).sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date)).slice(0, 3);
  return <div className="space-y-5">
    {partial && <p role="status" className="rounded-xl border border-amber-300 p-3 text-sm">{copy.partial} <button className="underline" onClick={() => setAttempt(n => n + 1)}>{copy.retry}</button></p>}
    <section className="card space-y-5" aria-labelledby="study-next">
      <h2 id="study-next" className="text-xl font-semibold">{copy.time}</h2>
      <div className="flex flex-wrap gap-2">{[15, 30, 60, 90].map(n => <button key={n} onClick={() => setMinutes(n)} aria-pressed={minutes === n} className={`min-h-11 rounded-xl border px-4 ${minutes === n ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 dark:border-slate-600"}`}>{n} {copy.minutes}</button>)}</div>
      <div className="rounded-xl bg-brand-50 dark:bg-brand-950/30 p-5 space-y-3">
        <p className="text-sm text-slate-500">{copy.next}</p><h3 className="text-lg font-bold">{course.name}</h3><p>{copy.review}</p>
        <p className="text-sm text-slate-500">{chosen && chosen !== suggestion.course.id ? copy.firstReason : copy[suggestion.reason]}</p>
        <Link href={`/study?course_id=${encodeURIComponent(course.id)}&minutes=${minutes}`} className="btn-primary inline-flex min-h-11">{copy.start}</Link>
      </div>
      <div><label htmlFor="study-course" className="block mb-2 text-sm">{copy.changeCourse}</label><select id="study-course" value={course.id} onChange={e => setChosen(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    </section>
    <section className="card space-y-3"><h2 className="font-semibold">{copy.upcoming}</h2>{nearest.length ? <ul className="space-y-3">{nearest.map(d => <li key={d.id}><Link className="text-brand-700 dark:text-brand-300" href={`/courses/${d.course_id}?tab=deadlines`}>{d.title}</Link><p className="text-sm text-slate-500">{d.course_name} · {new Date(d.due_date).toLocaleDateString(locale, { month: "short", day: "numeric" })}</p></li>)}</ul> : <p className="text-sm text-slate-500">{copy.noDeadlines}</p>}<Link href="/timeline" className="inline-block text-sm text-brand-600 min-h-11 pt-2">{copy.allDeadlines}</Link></section>
    <details className="card"><summary className="cursor-pointer min-h-11 font-semibold">{copy.readiness}</summary><p className="text-sm text-slate-500 mb-4">{copy.readinessNote}</p><ul className="space-y-3">{readiness.map(r => <li key={r.courseId}><Link href={`/courses/${r.courseId}`} className="font-medium">{r.courseName}</Link><p className="text-sm text-slate-500">{r.score === null ? copy.unknown : `${r.score}% · ${r.gradedItems} ${copy.graded}`}</p></li>)}</ul></details>
  </div>;
}
