"use client";
/**
 * The Learning Command Center.
 *
 * What is due, what needs the learner, why, and what to do with the time
 * they actually have — before any decorative counter. Every number here is
 * derived from the learner's own courses, grades and deadlines; where the
 * evidence is missing it says so instead of showing a figure.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, GraduationCap, Timer } from "lucide-react";

import {
  allReadiness,
  overallReadiness,
  studyPlan,
  type CourseInput,
  type CourseReadiness,
  type DeadlineInput,
  type GradeInput,
  type ReadinessLevel,
} from "@/lib/learning/readiness";

const SESSION_CHOICES = [30, 60, 90, 120] as const;

const LEVEL_STYLE: Record<ReadinessLevel, string> = {
  strong: "text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
  developing: "text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  weak: "text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  unknown: "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600",
};

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  strong: "Strong",
  developing: "Developing",
  weak: "Needs work",
  unknown: "No graded work yet",
};

export function StudyCommandCenter() {
  const [courses, setCourses] = useState<CourseInput[]>([]);
  const [grades, setGrades] = useState<GradeInput[]>([]);
  const [deadlines, setDeadlines] = useState<(DeadlineInput & { title: string; course_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [minutes, setMinutes] = useState<number>(60);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [c, g, d] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/grades"),
          fetch("/api/deadlines"),
        ]);
        if (cancelled) return;
        if (!c.ok || !g.ok || !d.ok) {
          setFailed(true);
          return;
        }
        setCourses(await c.json());
        setGrades(await g.json());
        setDeadlines(await d.json());
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const readiness = useMemo(
    () => allReadiness(courses, grades, deadlines),
    [courses, grades, deadlines],
  );
  const overall = useMemo(() => overallReadiness(readiness), [readiness]);
  const plan = useMemo(() => studyPlan(minutes, readiness), [minutes, readiness]);

  const openDeadlines = useMemo(
    () =>
      deadlines
        .filter((d) => !d.is_done)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [deadlines],
  );
  const overdue = openDeadlines.filter((d) => new Date(d.due_date).getTime() < Date.now());
  const nextUp = openDeadlines.slice(0, 3);

  if (loading) {
    return <div className="skeleton h-64 rounded-2xl" aria-busy="true" aria-label="Loading your study plan" />;
  }

  if (failed) {
    return (
      <section className="card p-5" role="alert">
        <h2 className="font-semibold mb-1">Your study plan could not load</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The courses, grades or deadlines request failed. Reload the page; nothing was lost.
        </p>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Add a course to start</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Readiness and study plans are built from your own courses, grades and deadlines.
        </p>
        <Link href="/courses" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          Add your first course →
        </Link>
      </section>
    );
  }

  return (
    <section className="card p-5 space-y-5" aria-labelledby="command-center-heading">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="command-center-heading" className="text-lg font-semibold">
          Today
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {overall === null ? (
            <>Overall readiness needs at least one graded item.</>
          ) : (
            <>
              Overall readiness <strong className="tabular-nums">{overall}%</strong> across{" "}
              {readiness.filter((r) => r.score !== null).length} course(s) with graded work
            </>
          )}
        </p>
      </header>

      {/* What needs you */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AlertTriangle size={14} /> Needs you
          </h3>
          {overdue.length === 0 && nextUp.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Nothing open. Good place to get ahead on your weakest course.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {overdue.length > 0 && (
                <li className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {overdue.length} item(s) overdue
                </li>
              )}
              {nextUp.map((d, i) => (
                <li key={`${d.title}-${i}`} className="text-sm">
                  <span className="font-medium">{d.title}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    · {d.course_name} ·{" "}
                    {new Date(d.due_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/timeline"
            className="mt-3 inline-block text-sm font-semibold text-brand-600 dark:text-brand-400"
          >
            Open timeline →
          </Link>
        </div>

        {/* Study plan for the time they have */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Timer size={14} /> Study plan
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">I have</span>
            {SESSION_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                aria-pressed={minutes === m}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                  minutes === m
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          {plan.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              No plan yet. Add a graded item so readiness has something to work from.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {plan.map((b) => (
                <li key={b.courseId} className="text-sm">
                  <span className="font-semibold tabular-nums">{b.minutes}m</span>{" "}
                  <span className="font-medium">{b.courseName}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{b.reason}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Readiness per course, weakest first, with the reasons */}
      <div>
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          <GraduationCap size={14} /> Exam readiness
        </h3>
        <ul className="space-y-2">
          {readiness.map((r) => (
            <ReadinessRow key={r.courseId} readiness={r} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReadinessRow({ readiness: r }: { readiness: CourseReadiness }) {
  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{r.courseName}</span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[r.level]}`}
          >
            {LEVEL_LABEL[r.level]}
          </span>
          <span className="tabular-nums text-sm font-semibold">
            {r.score === null ? "—" : `${r.score}%`}
          </span>
        </span>
      </div>
      {r.score !== null && (
        <div
          className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
          role="img"
          aria-label={`${r.courseName} readiness ${r.score} percent, ${LEVEL_LABEL[r.level]}`}
        >
          <span
            className="block h-full rounded-full bg-brand-500"
            style={{ width: `${r.score}%` }}
          />
        </div>
      )}
      <ul className="mt-2 space-y-0.5">
        {r.drivers.map((d) => (
          <li key={d.name} className="text-xs text-slate-500 dark:text-slate-400">
            {d.name}: {d.detail}
            {d.impact !== 0 && (
              <span className="font-medium"> ({d.impact > 0 ? "+" : ""}{d.impact})</span>
            )}
          </li>
        ))}
      </ul>
      {r.daysToNextDeadline !== null && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <CalendarClock size={12} />
          {r.daysToNextDeadline < 0
            ? `${Math.abs(r.daysToNextDeadline)} day(s) overdue`
            : `Next deadline in ${r.daysToNextDeadline} day(s)`}
        </p>
      )}
    </li>
  );
}
