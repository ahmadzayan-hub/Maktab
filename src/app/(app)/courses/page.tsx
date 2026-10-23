"use client";
import { useRouter } from "next/navigation";
import { journeyCopy } from "@/lib/journey/copy";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { BookOpen, Star, StarOff, Plus, Search, Edit2, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string; name: string; code: string; instructor: string;
  category: string; semester: string; status: string;
  progress: number; starred: boolean; last_accessed: string | null;
}

export default function CoursesPage() {
  const { t, locale } = useI18n();
  const copy = journeyCopy[locale];
  const router = useRouter();
  const toast = useToast();
  const [loadError, setLoadError] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadCourses() {
    setLoadError(false);
    try { const res = await fetch("/api/courses"); if (!res.ok) throw new Error(); setCourses(await res.json()); }
    catch { setLoadError(true); } finally { setLoading(false); }

  }

  useEffect(() => { loadCourses(); if (new URLSearchParams(window.location.search).get("add") === "1") setAddOpen(true); }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const url = editCourse ? `/api/courses/${editCourse.id}` : "/api/courses";
    const method = editCourse ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      toast("success", t(editCourse ? "course.updated" : "course.created"));
      setAddOpen(false); setEditCourse(null);
      if (!editCourse && saved.id && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") router.push(`/study?course_id=${encodeURIComponent(saved.id)}&minutes=15`);
      else await loadCourses();
    } catch { toast("error", copy.saveError); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    await fetch(`/api/courses/${deleteId}`, { method: "DELETE" });
    toast("success", t("course.deleted"));
    setDeleteId(null); setSaving(false);
    loadCourses();
  }

  async function toggleStar(c: Course) {
    await fetch(`/api/courses/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !c.starred }),
    });
    loadCourses();
  }

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "active" && c.status === "active") || (filter === "completed" && c.status === "completed") || (filter === "starred" && c.starred);
    return matchSearch && matchFilter;
  });

  const renderCourseForm = (course?: Course | null) => (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="course-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("course.name")} *</label>
          <input id="course-name" name="name" required defaultValue={course?.name} placeholder="e.g. Strategic Management" />
        </div>
        <details className="col-span-2"><summary className="cursor-pointer min-h-11 text-sm">{copy.moreDetails}</summary><div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("course.code")}</label>
          <input name="code" defaultValue={course?.code} placeholder="e.g. MBA501" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("course.semester")}</label>
          <input name="semester" defaultValue={course?.semester} placeholder="e.g. Spring 2025" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("course.instructor")}</label>
          <input name="instructor" defaultValue={course?.instructor} placeholder="Professor name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("course.category")}</label>
          <input name="category" defaultValue={course?.category} placeholder="e.g. Finance" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
          <select name="status" defaultValue={course?.status || "active"}>
            <option value="active">{t("course.status.active")}</option>
            <option value="completed">{t("course.status.completed")}</option>
          </select>
        </div>
        </div></details>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="secondary" type="button" onClick={() => { setAddOpen(false); setEditCourse(null); }}>
          {t("btn.cancel")}
        </Button>
        <Button type="submit" loading={saving}>{t("course.save")}</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("courses.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{courses.length} courses</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} />
          {t("courses.add")}
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("courses.search")}
            className="ps-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all","active","completed","starred"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === f ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
            >
              {t(`courses.filter.${f}` as any)}
            </button>
          ))}
        </div>
      </div>

      {loadError && <p role="alert" className="card text-red-700">{copy.loadError} <button className="underline" onClick={loadCourses}>{copy.retry}</button></p>}
      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)}
        </div>
      ) : loadError ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title={t("courses.empty")}
          action={{ label: t("courses.add"), onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
            <div key={c.id} className="card-hover group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
                  <BookOpen size={20} className="text-brand-600" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => toggleStar(c)} className="btn-ghost p-1.5 rounded-lg" aria-label="Star">
                    {c.starred ? <Star size={15} className="text-amber-500 fill-amber-500" /> : <StarOff size={15} />}
                  </button>
                  <button onClick={() => setEditCourse(c)} className="btn-ghost p-1.5 rounded-lg" aria-label="Edit">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="btn-ghost p-1.5 rounded-lg text-red-500" aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <Link href={`/courses/${c.id}`}>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 hover:text-brand-700 dark:hover:text-brand-400 transition line-clamp-2 cursor-pointer">
                  {c.name}
                </h3>
              </Link>
              {c.code && <p className="text-xs text-slate-400 mb-1">{c.code}</p>}
              {c.instructor && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{c.instructor}</p>}

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t("course.progress")}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{c.progress}%</span>
                </div>
                <Progress value={c.progress} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <Badge color={c.status === "active" ? "green" : "gray"}>
                  {t(`course.status.${c.status}` as any)}
                </Badge>
                <Link href={`/courses/${c.id}`}>
                  <button className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 dark:text-brand-400">
                    {t("course.view")} <ChevronRight size={13} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t("courses.add")}>
        {renderCourseForm()}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editCourse} onClose={() => setEditCourse(null)} title={t("course.edit")}>
        {renderCourseForm(editCourse)}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("course.delete")}
        description={t("course.delete_confirm")}
        confirmLabel={t("btn.delete")}
        cancelLabel={t("btn.cancel")}
        danger
        loading={saving}
      />
    </div>
  );
}
