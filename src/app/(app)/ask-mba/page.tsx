"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HelpCircle, Send, Sparkles } from "lucide-react";

export default function AskMBAPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const examples = [
    t("ask_mba.examples.1"), t("ask_mba.examples.2"), t("ask_mba.examples.3"),
    t("ask_mba.examples.4"), t("ask_mba.examples.5"), t("ask_mba.examples.6"),
    t("ask_mba.examples.7"), t("ask_mba.examples.8"),
  ];

  async function ask() {
    if (!query.trim() || loading) return;
    setLoading(true); setAnswer("");
    try {
      const res = await fetch("/api/ask-mba", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (res.ok) { const { answer } = await res.json(); setAnswer(answer); }
      else setAnswer(t("error.ai_failed"));
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
          <HelpCircle size={22} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("ask_mba.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Powered by your full academic data</p>
        </div>
        <span className="badge-blue text-xs ms-auto">{t("label.ai")}</span>
      </div>

      {/* Input */}
      <div className="card">
        <div className="flex gap-3">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder={t("ask_mba.placeholder")}
            rows={3}
            className="flex-1 resize-none"
          />
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={ask} loading={loading}>
            <Send size={15} />
            {t("ask_mba.send")}
          </Button>
        </div>
      </div>

      {/* Answer */}
      {loading && (
        <div className="flex items-center gap-3 p-5 card">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-slate-500">{t("ask_mba.thinking")}</p>
        </div>
      )}

      {answer && !loading && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-brand-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Answer</p>
          </div>
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{answer}</p>
          </div>
        </div>
      )}

      {/* Example questions */}
      {!answer && !loading && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Try asking</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setQuery(ex)}
                className="text-start px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-700 dark:hover:text-brand-400 transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
