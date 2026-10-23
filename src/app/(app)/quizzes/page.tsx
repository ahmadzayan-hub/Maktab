"use client";

import { useState, useEffect } from "react";
import { selectedCourseId } from "@/lib/journey/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Brain, Plus, CheckCircle, XCircle, RefreshCw, X, Sparkles } from "lucide-react";

interface Quiz {
  id: string;
  pack_id: string;
  study_pack_id?: string;
  course_name?: string;
  pack_topic?: string;
  title: string;
  questions: QuizQuestion[];
  status: string;
  created_at: string;
}

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface StudyPack { course_id: string; id: string; topic: string; course_name?: string; }

type Phase = "list" | "taking" | "results";

export default function QuizzesPage() {
  const { t, dir } = useI18n();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ pack_id: "", num_questions: "10" });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [qr, pr] = await Promise.all([fetch("/api/quizzes"), fetch("/api/study-packs")]);
      const context = selectedCourseId();
      const available: StudyPack[] = pr.ok ? (await pr.json()).filter((p: any) => p.status === "ready" && (!context || p.course_id === context)) : [];
      setPacks(available);
      if (available.length === 1) setForm(prev => ({ ...prev, pack_id: available[0].id }));
      if (qr.ok) setQuizzes((await qr.json()).filter((q: Quiz) => !context || available.some(p => p.id === (q.study_pack_id || q.pack_id))));
      setLoading(false);
    })();
  }, []);

  async function generateQuiz(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    const r = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack_id: form.pack_id, num_questions: Number(form.num_questions) }),
    });
    if (r.ok) {
      const q = await r.json();
      setQuizzes(prev => [q, ...prev]);
      setShowCreate(false);
    }
    setGenerating(false);
  }

  function startQuiz(quiz: Quiz) {
    setActiveQuiz(quiz);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setAnswers(Array(quiz.questions.length).fill(null));
    setPhase("taking");
  }

  function submitAnswer() {
    if (selected === null) return;
    const next = [...answers];
    next[current] = selected;
    setAnswers(next);
    setAnswered(true);
  }

  function nextQuestion() {
    if (!activeQuiz) return;
    if (current + 1 >= activeQuiz.questions.length) {
      setPhase("results");
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function score() {
    if (!activeQuiz) return 0;
    return answers.filter((a, i) => a === activeQuiz.questions[i].answer).length;
  }

  if (phase === "taking" && activeQuiz) {
    const q = activeQuiz.questions[current];
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6" dir={dir}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">{activeQuiz.title}</h2>
          <button onClick={() => setPhase("list")} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((current) / activeQuiz.questions.length) * 100}%` }} />
        </div>
        <p className="text-xs text-slate-500">{t("quizzes.question")} {current + 1} / {activeQuiz.questions.length}</p>

        <div className="card">
          <p className="text-base font-semibold text-slate-900 dark:text-white mb-6">{q.q}</p>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let cls = "border-2 border-slate-200 dark:border-slate-700 hover:border-brand-400";
              if (answered) {
                if (i === q.answer) cls = "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
                else if (i === selected) cls = "border-2 border-red-500 bg-red-50 dark:bg-red-950/20";
                else cls = "border-2 border-slate-200 dark:border-slate-700 opacity-50";
              } else if (selected === i) {
                cls = "border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/20";
              }
              return (
                <button
                  key={i}
                  disabled={answered}
                  onClick={() => setSelected(i)}
                  className={`w-full text-start p-4 rounded-xl transition-all ${cls}`}
                >
                  <span className="text-sm text-slate-800 dark:text-slate-200">{opt}</span>
                </button>
              );
            })}
          </div>
          {answered && q.explanation && (
            <div className="mt-4 bg-brand-50 dark:bg-brand-950/20 rounded-xl p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300"><strong>{t("quizzes.explanation")}: </strong>{q.explanation}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          {!answered ? (
            <button onClick={submitAnswer} disabled={selected === null} className="btn-primary">{t("quizzes.submit")}</button>
          ) : (
            <button onClick={nextQuestion} className="btn-primary">
              {current + 1 >= activeQuiz.questions.length ? t("quizzes.seeResults") : t("quizzes.next")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "results" && activeQuiz) {
    const s = score();
    const pct = Math.round((s / activeQuiz.questions.length) * 100);
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6" dir={dir}>
        <div className="card text-center py-10">
          <div className={`text-5xl font-bold mb-2 ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-red-600"}`}>{pct}%</div>
          <p className="text-slate-600 dark:text-slate-400">{s} / {activeQuiz.questions.length} {t("quizzes.correct")}</p>
          <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
            {pct >= 70 ? t("quizzes.grade.good") : pct >= 50 ? t("quizzes.grade.ok") : t("quizzes.grade.retry")}
          </p>
        </div>
        <div className="space-y-3">
          {activeQuiz.questions.map((q, i) => {
            const correct = answers[i] === q.answer;
            return (
              <div key={i} className={`card flex items-start gap-3 ${correct ? "" : "border-red-200 dark:border-red-900"}`}>
                {correct ? <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{q.q}</p>
                  {!correct && <p className="text-xs text-slate-500 mt-1">{t("quizzes.correctAnswer")}: <strong className="text-emerald-600">{q.options[q.answer]}</strong></p>}
                  {q.explanation && <p className="text-xs text-slate-400 mt-1">{q.explanation}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => startQuiz(activeQuiz)} className="btn-secondary"><RefreshCw className="w-4 h-4" />{t("quizzes.retry")}</button>
          <button onClick={() => setPhase("list")} className="btn-primary">{t("quizzes.done")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("quizzes.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("quizzes.subtitle")}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />{t("quizzes.createBtn")}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t("quizzes.generateTitle")}</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <form onSubmit={generateQuiz} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("quizzes.form.pack")}</label>
              <select value={form.pack_id} onChange={e => setForm(p => ({ ...p, pack_id: e.target.value }))} required>
                <option value="">{t("quizzes.form.selectPack")}</option>
                {packs.map(p => <option key={p.id} value={p.id}>{p.topic} {p.course_name ? `(${p.course_name})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t("quizzes.form.questions")}</label>
              <select value={form.num_questions} onChange={e => setForm(p => ({ ...p, num_questions: e.target.value }))}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">{t("common.cancel")}</button>
              <button type="submit" disabled={generating} className="btn-primary">
                {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("quizzes.generating")}</> : <><Sparkles className="w-4 h-4" />{t("quizzes.generateBtn")}</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("quizzes.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="card-hover">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/30 rounded-lg">
                  <Brain className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{quiz.title || quiz.pack_topic}</p>
                  <p className="text-xs text-slate-400">{quiz.course_name} · {quiz.questions?.length || 0} {t("quizzes.questions")}</p>
                </div>
              </div>
              <button onClick={() => startQuiz(quiz)} className="btn-primary w-full btn-sm">
                {t("quizzes.startBtn")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
