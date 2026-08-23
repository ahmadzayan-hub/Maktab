"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { BarChart3, Plus, TrendingUp, AlertTriangle, Target } from "lucide-react";

// SVG Bar Chart
function GradeBarChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  if (!data.length) return null;
  const max = 100;
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-brand-500" />
        Grade Distribution by Course
      </h3>
      <div className="flex items-end gap-4 h-36">
        {data.map(({ label, pct, color }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
            <div className="w-full rounded-t-lg transition-all" style={{ height: `${(pct / max) * 96}px`, backgroundColor: color }} />
            <span className="text-[10px] text-slate-500 text-center leading-tight w-full truncate">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-4 flex-wrap">
        {[{ label: "A (≥90%)", color: "#10b981" }, { label: "B (≥80%)", color: "#6366f1" }, { label: "C (≥70%)", color: "#f59e0b" }, { label: "Below C", color: "#ef4444" }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Grade { id: string; course_id: string; category: string; item_name: string; score: number | null; max_score: number; weight: number; is_final: boolean; }
interface Course { id: string; name: string; }

function calcPercentage(score: number | null, max: number) {
  if (score === null) return null;
  return Math.round((score / max) * 100);
}

function letterGrade(pct: number | null): string {
  if (pct === null) return "–";
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export default function GradesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("all");

  useEffect(() => {
    async function load() {
      const [gRes, cRes] = await Promise.all([fetch("/api/grades"), fetch("/api/courses")]);
      if (gRes.ok) setGrades(await gRes.json());
      if (cRes.ok) setCourses(await cRes.json());
      setLoading(false);
    }
    load();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = { course_id: fd.get("course_id"), category: fd.get("category"), item_name: fd.get("item_name"), score: fd.get("score") || null, max_score: fd.get("max_score"), weight: fd.get("weight"), is_final: fd.get("is_final") === "on" };
    const res = await fetch("/api/grades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast("success", t("success.saved")); setAddOpen(false); const r = await fetch("/api/grades"); if(r.ok) setGrades(await r.json()); }
    else toast("error", t("error.generic"));
    setSaving(false);
  }

  const filtered = selectedCourse === "all" ? grades : grades.filter(g => g.course_id === selectedCourse);

  const byCourse = courses.map(c => {
    const cGrades = grades.filter(g => g.course_id === c.id && g.score !== null);
    const totalWeight = cGrades.reduce((s, g) => s + g.weight, 0);
    const weightedScore = cGrades.reduce((s, g) => s + (g.score! / g.max_score) * g.weight, 0);
    const pct = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null;
    return { course: c, pct, letterGrade: letterGrade(pct), gradeCount: cGrades.length };
  }).filter(x => x.gradeCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("grades.title")}</h1>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} />{t("grades.add_entry")}</Button>
      </div>

      {/* Bar chart visualization */}
      {byCourse.length > 0 && (
        <GradeBarChart data={byCourse.map(({ course, pct }) => ({
          label: course.name.split(" ").slice(0, 2).join(" "),
          pct: pct ?? 0,
          color: (pct ?? 0) >= 90 ? "#10b981" : (pct ?? 0) >= 80 ? "#6366f1" : (pct ?? 0) >= 70 ? "#f59e0b" : "#ef4444",
        }))} />
      )}

      {/* GPA summary cards */}
      {byCourse.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byCourse.map(({ course, pct, letterGrade: lg }) => (
            <div key={course.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 truncate">{course.name}</p>
                {pct !== null && pct < 70 && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                {pct !== null && pct >= 90 && <TrendingUp size={14} className="text-emerald-500 flex-shrink-0" />}
              </div>
              <p className={`text-4xl font-black ${(pct ?? 0) >= 80 ? "text-emerald-600 dark:text-emerald-400" : (pct ?? 0) >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{lg}</p>
              {pct !== null && <p className="text-sm text-slate-400 mt-0.5 font-medium">{pct}%</p>}
              {pct !== null && (
                <div className="mt-3 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Course filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedCourse("all")} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${selectedCourse === "all" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
          All courses
        </button>
        {courses.map(c => (
          <button key={c.id} onClick={() => setSelectedCourse(c.id)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${selectedCourse === c.id ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Grade entries */}
      {loading ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title={t("grades.empty")} action={{ label: t("grades.add_entry"), onClick: () => setAddOpen(true) }} />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("grades.course")}</th>
                <th>{t("grades.category")}</th>
                <th>Item</th>
                <th className="text-end">{t("grades.score")}</th>
                <th className="text-end">{t("grades.weight")}</th>
                <th className="text-end">Grade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => {
                const pct = calcPercentage(g.score, g.max_score);
                const course = courses.find(c => c.id === g.course_id);
                return (
                  <tr key={g.id}>
                    <td className="font-medium text-slate-800 dark:text-slate-200 max-w-[140px] truncate">{course?.name}</td>
                    <td><Badge color="gray">{g.category}</Badge></td>
                    <td className="text-slate-600 dark:text-slate-300">{g.item_name}</td>
                    <td className="text-end">
                      {g.score !== null ? `${g.score}/${g.max_score}` : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="text-end text-slate-500">{g.weight}%</td>
                    <td className="text-end">
                      {pct !== null ? (
                        <span className={`font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                          {letterGrade(pct)} ({pct}%)
                        </span>
                      ) : <span className="text-slate-300">Pending</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t("grades.add_entry")}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("grades.course")} *</label>
            <select name="course_id" required>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("grades.category")} *</label>
              <input name="category" required placeholder="e.g. Midterm, Assignment" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Item name *</label>
              <input name="item_name" required placeholder="e.g. Midterm Exam" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("grades.score")}</label>
              <input name="score" type="number" step="0.01" min="0" placeholder="Leave blank if pending" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("grades.max_score")} *</label>
              <input name="max_score" type="number" required defaultValue={100} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("grades.weight")} *</label>
              <input name="weight" type="number" required step="0.1" min="0" max="100" placeholder="e.g. 30" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" name="is_final" className="w-4 h-4 rounded accent-brand-600" />
                Final exam
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>{t("btn.cancel")}</Button>
            <Button type="submit" loading={saving}>{t("btn.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
