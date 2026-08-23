"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Newspaper, RefreshCw, Sparkles, TrendingUp, AlertTriangle, Target, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface WeeklyBrief {
  id: string;
  week_start: string;
  week_end: string;
  focus_question_answer: string;
  summary: string;
  top_priorities: string[];
  at_risk_items: string[];
  wins: string[];
  ai_recommendations: string[];
  study_hours_target: number;
  readiness_score: number;
  created_at: string;
}

export default function WeeklyBriefPage() {
  const { t, dir } = useI18n();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/weekly-brief");
      if (r.ok) {
        const data = await r.json();
        setBrief(data);
      }
      setLoading(false);
    })();
  }, []);

  async function generateBrief() {
    setGenerating(true);
    const r = await fetch("/api/weekly-brief", { method: "POST" });
    if (r.ok) setBrief(await r.json());
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("weeklyBrief.title")}</h1>
          {brief && (
            <p className="text-sm text-slate-500 mt-1">
              {format(new Date(brief.week_start), "MMM d")} to {format(new Date(brief.week_end), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <button onClick={generateBrief} disabled={generating} className="btn-primary">
          {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("weeklyBrief.generating")}</> : <><Sparkles className="w-4 h-4" />{t("weeklyBrief.generateBtn")}</>}
        </button>
      </div>

      {!brief ? (
        <div className="text-center py-20">
          <Newspaper className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t("weeklyBrief.noBrief")}</p>
          <p className="text-sm text-slate-400 mt-1 mb-6">{t("weeklyBrief.noBriefSub")}</p>
          <button onClick={generateBrief} disabled={generating} className="btn-primary">
            <Sparkles className="w-4 h-4" />{t("weeklyBrief.generateFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Focus answer */}
          <div className="card bg-gradient-to-br from-brand-600 to-teal-600 text-white border-0">
            <div className="flex items-center gap-2 text-white/80 text-sm font-semibold mb-3">
              <Target className="w-4 h-4" />
              {t("weeklyBrief.focusAnswer")}
            </div>
            <p className="text-lg font-semibold leading-relaxed">{brief.focus_question_answer}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-brand-600">{brief.readiness_score}%</p>
              <p className="text-xs text-slate-500 mt-1">{t("weeklyBrief.readiness")}</p>
              <div className="progress-bar mt-2">
                <div className="progress-fill" style={{ width: `${brief.readiness_score}%` }} />
              </div>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-teal-600">{brief.study_hours_target}h</p>
              <p className="text-xs text-slate-500 mt-1">{t("weeklyBrief.studyTarget")}</p>
            </div>
            <div className="card text-center hidden sm:block">
              <p className="text-3xl font-bold text-emerald-600">{brief.wins?.length || 0}</p>
              <p className="text-xs text-slate-500 mt-1">{t("weeklyBrief.wins")}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("weeklyBrief.summary")}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{brief.summary}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Top priorities */}
            {brief.top_priorities?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-500" />{t("weeklyBrief.topPriorities")}
                </h3>
                <ul className="space-y-2">
                  {brief.top_priorities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-brand-500 font-bold mt-0.5">{i + 1}.</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* At-risk items */}
            {brief.at_risk_items?.length > 0 && (
              <div className="card border-amber-200 dark:border-amber-900">
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />{t("weeklyBrief.atRisk")}
                </h3>
                <ul className="space-y-2">
                  {brief.at_risk_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-amber-500 mt-0.5">⚠</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Wins */}
            {brief.wins?.length > 0 && (
              <div className="card border-emerald-200 dark:border-emerald-900">
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />{t("weeklyBrief.wins")}
                </h3>
                <ul className="space-y-2">
                  {brief.wins.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-emerald-500 mt-0.5">✓</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI recommendations */}
            {brief.ai_recommendations?.length > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />{t("weeklyBrief.aiRecommendations")}
                </h3>
                <ul className="space-y-2">
                  {brief.ai_recommendations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-brand-500 mt-0.5">→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            {t("weeklyBrief.generated")} {format(new Date(brief.created_at), "MMMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      )}
    </div>
  );
}
