"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { selectedCourseId } from "@/lib/journey/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, X } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";

interface Deadline {
  id: string;
  title: string;
  due_date: string;
  course_id: string | null;
  course_name?: string;
  type: string;
  weight?: number;
  is_completed: boolean;
  risk: "safe" | "due_soon" | "at_risk" | "overdue";
}

interface Course { id: string; name: string; }

const TYPES = ["assignment", "exam", "quiz", "project", "presentation", "reading", "other"];
const VIEWS = ["all", "today", "week", "at_risk"] as const;

export default function TimelinePage() {
  const { t, dir } = useI18n();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<typeof VIEWS[number]>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", course_id: "", type: "assignment", weight: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (selectedCourseId()) setForm(prev => ({ ...prev, course_id: selectedCourseId() }));
      setLoading(true);
      const [dr, cr] = await Promise.all([fetch(`/api/deadlines?view=${view}`), fetch("/api/courses")]);
      if (dr.ok) setDeadlines((await dr.json()).filter((d: Deadline) => !selectedCourseId() || d.course_id === selectedCourseId()));
      if (cr.ok) setCourses(await cr.json());
      setLoading(false);
    })();
  }, [view]);

  async function addDeadline(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, weight: form.weight ? Number(form.weight) : null }),
    });
    if (r.ok) {
      const d = await r.json();
      setDeadlines(prev => [d, ...prev].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      setForm({ title: "", due_date: "", course_id: "", type: "assignment", weight: "" });
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function toggleComplete(id: string, current: boolean) {
    const r = await fetch(`/api/deadlines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !current }),
    });
    if (r.ok) setDeadlines(prev => prev.map(d => d.id === id ? { ...d, is_completed: !current } : d));
  }

  function riskClass(risk: string) {
    const map: Record<string, string> = {
      safe: "risk-safe",
      due_soon: "risk-due-soon",
      at_risk: "risk-at-risk",
      overdue: "risk-overdue",
    };
    return map[risk] ?? "badge-gray";
  }

  function dateLabel(dateStr: string) {
    const d = parseISO(dateStr);
    if (isToday(d)) return t("timeline.today");
    if (isTomorrow(d)) return t("timeline.tomorrow");
    return format(d, "MMM d, yyyy");
  }

  function groupByDate(items: Deadline[]) {
    const groups: Record<string, Deadline[]> = {};
    for (const item of items) {
      const key = item.due_date.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex gap-4"><Link href="/calendar" className="min-h-11 text-brand-600">{t("nav.calendar")}</Link><Link href="/tasks" className="min-h-11 text-brand-600">{t("nav.tasks")}</Link></div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("nav.timeline")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("timeline.subtitle")}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t("timeline.addDeadline")}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 flex-wrap">
        {VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === v ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {t(`timeline.view.${v}`)}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t("timeline.addDeadline")}</h3>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={addDeadline} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("timeline.form.title")}</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("timeline.form.dueDate")}</label>
              <input type="datetime-local" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("timeline.form.type")}</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {TYPES.map(tp => <option key={tp} value={tp}>{t(`timeline.types.${tp}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("timeline.form.course")}</label>
              <select value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))}>
                <option value="">{t("timeline.form.noCourse")}</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("timeline.form.weight")}</label>
              <input type="number" min="0" max="100" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} placeholder="%" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? t("common.saving") : t("common.save")}</button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20" />)}
        </div>
      ) : deadlines.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("timeline.noDeadlines")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupByDate(deadlines).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2">
                  {dateLabel(date)}
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {items.map(d => (
                  <div key={d.id} className={`card flex items-center gap-4 ${d.is_completed ? "opacity-60" : ""}`}>
                    <button
                      onClick={() => toggleComplete(d.id, d.is_completed)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                        d.is_completed
                          ? "bg-emerald-500 border-emerald-500 flex items-center justify-center"
                          : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                      }`}
                    >
                      {d.is_completed && <CheckCircle className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${d.is_completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                        {d.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(d.due_date), "h:mm a")}
                        {d.course_name && <><span>·</span><span>{d.course_name}</span></>}
                        {d.weight && <><span>·</span><span>{d.weight}%</span></>}
                      </div>
                    </div>
                    <span className={`badge ${riskClass(d.risk)}`}>{t(`timeline.risk.${d.risk}`)}</span>
                    <span className="badge-gray">{t(`timeline.types.${d.type}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
