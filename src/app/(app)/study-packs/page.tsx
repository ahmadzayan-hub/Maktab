"use client";

import { useState, useEffect } from "react";
import { selectedCourseId } from "@/lib/journey/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookOpen, Plus, Sparkles, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StudyPack {
  id: string;
  course_id: string;
  course_name?: string;
  topic: string;
  status: "pending" | "generating" | "ready" | "failed";
  overview?: string;
  summary?: string;
  key_notes?: string[];
  key_takeaways?: string[];
  glossary?: Record<string, string>;
  mba_frameworks?: string[];
  exam_prep?: string;
  created_at: string;
}

interface Course { id: string; name: string; }

export default function StudyPacksPage() {
  const { t, dir } = useI18n();
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ course_id: "", topic: "" });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pr, cr] = await Promise.all([fetch("/api/study-packs"), fetch("/api/courses")]);
      const context = selectedCourseId();
      if (context) setForm(prev => ({ ...prev, course_id: context }));
      if (pr.ok) setPacks((await pr.json()).filter((p: StudyPack) => !context || p.course_id === context));
      if (cr.ok) setCourses(await cr.json());
      setLoading(false);
    })();
  }, []);

  async function createPack(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    const r = await fetch("/api/study-packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const p = await r.json();
      setPacks(prev => [p, ...prev]);
      setForm({ course_id: selectedCourseId(), topic: "" });
      setShowCreate(false);
    }
    setGenerating(false);
  }

  function statusBadge(status: StudyPack["status"]) {
    if (status === "ready") return <span className="badge-green">{t("studyPacks.status.ready")}</span>;
    if (status === "generating") return <span className="badge-blue flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" />{t("studyPacks.status.generating")}</span>;
    if (status === "failed") return <span className="badge-red">{t("studyPacks.status.failed")}</span>;
    return <span className="badge-gray">{t("studyPacks.status.pending")}</span>;
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("studyPacks.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("studyPacks.subtitle")}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t("studyPacks.createBtn")}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t("studyPacks.createTitle")}</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={createPack} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("studyPacks.form.course")}</label>
              <select value={form.course_id} onChange={e => setForm(p => ({ ...p, course_id: e.target.value }))} required>
                <option value="">{t("studyPacks.form.selectCourse")}</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("studyPacks.form.topic")}</label>
              <input type="text" value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} required placeholder={t("studyPacks.form.topicPlaceholder")} />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t("common.cancel")}</button>
              <button type="submit" disabled={generating} className="btn-primary">
                {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("studyPacks.generating")}</> : <><Sparkles className="w-4 h-4" />{t("studyPacks.generateBtn")}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("studyPacks.empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {packs.map(pack => (
            <div key={pack.id} className="card">
              <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(expanded === pack.id ? null : pack.id)}>
                <div className="p-2 bg-brand-50 dark:bg-brand-950/30 rounded-lg">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{pack.topic}</h3>
                    {statusBadge(pack.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {pack.course_name} · {formatDistanceToNow(new Date(pack.created_at), { addSuffix: true })}
                  </p>
                  {pack.overview && expanded !== pack.id && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{pack.overview}</p>
                  )}
                </div>
                <button>{expanded === pack.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</button>
              </div>

              {expanded === pack.id && pack.status === "ready" && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                  {pack.overview && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("studyPacks.overview")}</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{pack.overview}</p>
                    </div>
                  )}
                  {pack.key_takeaways?.length ? (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("studyPacks.keyTakeaways")}</h4>
                      <ul className="space-y-1">
                        {pack.key_takeaways.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <span className="text-brand-500 mt-0.5">•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {pack.mba_frameworks?.length ? (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("studyPacks.mbaFrameworks")}</h4>
                      <div className="flex flex-wrap gap-2">
                        {pack.mba_frameworks.map((f, i) => <span key={i} className="badge-blue">{f}</span>)}
                      </div>
                    </div>
                  ) : null}
                  {pack.glossary && Object.keys(pack.glossary).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("studyPacks.glossary")}</h4>
                      <div className="space-y-2">
                        {Object.entries(pack.glossary).map(([term, def]) => (
                          <div key={term} className="text-sm">
                            <span className="font-medium text-slate-900 dark:text-white">{term}: </span>
                            <span className="text-slate-600 dark:text-slate-400">{def}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pack.exam_prep && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">{t("studyPacks.examPrep")}</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{pack.exam_prep}</p>
                    </div>
                  )}
                </div>
              )}

              {expanded === pack.id && pack.status === "generating" && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-center py-6">
                  <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t("studyPacks.generatingMessage")}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
