"use client";

import { useState, useEffect } from "react";
import { selectedCourseId } from "@/lib/journey/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Layers, ChevronLeft, ChevronRight, RotateCcw, ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";

interface Flashcard {
  id: string;
  pack_id: string;
  study_pack_id?: string;
  pack_topic?: string;
  course_name?: string;
  front: string;
  back: string;
  difficulty?: number;
}

interface StudyPack { course_id: string; id: string; topic: string; course_name?: string; }

export default function FlashcardsPage() {
  const { t, dir } = useI18n();
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>("all");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState<{ known: number; review: number }>({ known: 0, review: 0 });
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/study-packs");
      if (r.ok) {
        const p: StudyPack[] = (await r.json()).filter((p: any) => p.status === "ready" && (!selectedCourseId() || p.course_id === selectedCourseId()));
        setPacks(p);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!packs.length) return;
    (async () => {
      setLoading(true);
      const url = selectedPack === "all" ? "/api/flashcards" : `/api/flashcards?pack_id=${selectedPack}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setCards(shuffle(data.filter((card: Flashcard) => !selectedCourseId() || packs.some(p => p.id === (card.study_pack_id || card.pack_id)))));
        setCurrent(0);
        setFlipped(false);
        setDone(false);
        setSession({ known: 0, review: 0 });
      }
      setLoading(false);
    })();
  }, [selectedPack, packs]);

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function markCard(known: boolean) {
    setSession(s => ({ ...s, known: s.known + (known ? 1 : 0), review: s.review + (known ? 0 : 1) }));
    if (current + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
      setFlipped(false);
    }
  }

  function restart() {
    setCards(shuffle(cards));
    setCurrent(0);
    setFlipped(false);
    setDone(false);
    setSession({ known: 0, review: 0 });
  }

  const card = cards[current];
  const progress = cards.length ? ((current) / cards.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-up" dir={dir}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("flashcards.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("flashcards.subtitle")}</p>
        </div>
      </div>

      {/* Pack selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("flashcards.selectPack")}</label>
        <select value={selectedPack} onChange={e => setSelectedPack(e.target.value)} className="w-64">
          <option value="all">{t("flashcards.allPacks")}</option>
          {packs.map(p => <option key={p.id} value={p.id}>{p.topic} {p.course_name ? `(${p.course_name})` : ""}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="skeleton h-64" />
      ) : cards.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("flashcards.noCards")}</p>
          <p className="text-xs text-slate-400 mt-1">{t("flashcards.generateFirst")}</p>
        </div>
      ) : done ? (
        <div className="max-w-md mx-auto text-center card py-12">
          <BookOpen className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("flashcards.sessionDone")}</h2>
          <div className="flex justify-center gap-8 my-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{session.known}</p>
              <p className="text-sm text-slate-500">{t("flashcards.known")}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{session.review}</p>
              <p className="text-sm text-slate-500">{t("flashcards.needsReview")}</p>
            </div>
          </div>
          <button onClick={restart} className="btn-primary">
            <RotateCcw className="w-4 h-4" />
            {t("flashcards.restart")}
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{current + 1} / {cards.length}</span>
            <span className="badge-blue">{card.pack_topic}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Card */}
          <div className="flip-card h-64 cursor-pointer" onClick={() => setFlipped(f => !f)}>
            <div className={`flip-card-inner h-full ${flipped ? "flipped" : ""}`}>
              <div className="flip-card-front absolute inset-0 card flex flex-col items-center justify-center p-8 text-center" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(239,246,255,0.9))" }}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t("flashcards.question")}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{card.front}</p>
                <p className="text-xs text-slate-400 mt-6 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">↕</span>
                  {t("flashcards.tapToReveal")}
                </p>
              </div>
              <div className="flip-card-back absolute inset-0 card flex flex-col items-center justify-center p-8 text-center" style={{ background: "linear-gradient(135deg, rgba(239,246,255,0.9), rgba(224,231,255,0.9))" }}>
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-4">{t("flashcards.answer")}</p>
                <p className="text-lg text-slate-800 dark:text-slate-200">{card.back}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {flipped && (
            <div className="flex gap-4 justify-center">
              <button onClick={() => markCard(false)} className="btn btn-danger gap-2 px-8 py-3">
                <ThumbsDown className="w-4 h-4" />
                {t("flashcards.needsReview")}
              </button>
              <button onClick={() => markCard(true)} className="btn bg-emerald-600 text-white hover:bg-emerald-700 gap-2 px-8 py-3">
                <ThumbsUp className="w-4 h-4" />
                {t("flashcards.gotIt")}
              </button>
            </div>
          )}

          {!flipped && (
            <div className="flex justify-center gap-4">
              <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); }} disabled={current === 0} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setFlipped(true)} className="btn-primary px-8">{t("flashcards.reveal")}</button>
              <button onClick={() => { setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false); }} disabled={current === cards.length - 1} className="btn-secondary">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
