"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Check, Zap, Star, Shield, Brain, Package, MessageSquare, Mic, Users, Trophy, Globe } from "lucide-react";

interface Subscription {
  plan: string; status: string; ai_queries_used: number; ai_queries_limit: number;
  all_features_free?: boolean;
}

const ALL_FEATURES = [
  { icon: <Brain className="w-4 h-4 text-purple-500" />, label: "AI Tutor (RAG-powered, unlimited sessions)" },
  { icon: <Package className="w-4 h-4 text-brand-500" />, label: "Unlimited Study Pack generation" },
  { icon: <Zap className="w-4 h-4 text-amber-500" />, label: "Flashcards & smart quizzes" },
  { icon: <MessageSquare className="w-4 h-4 text-blue-500" />, label: "Messages Center with AI reply suggestions" },
  { icon: <Mic className="w-4 h-4 text-red-500" />, label: "Live Lecture Transcription + AI summary + email" },
  { icon: <Users className="w-4 h-4 text-indigo-500" />, label: "Group Project Workspace (responsibility matrix)" },
  { icon: <Trophy className="w-4 h-4 text-amber-500" />, label: "Achievements & badges system" },
  { icon: <Globe className="w-4 h-4 text-emerald-500" />, label: "Bilingual UI · English & Arabic (RTL)" },
  { icon: <Shield className="w-4 h-4 text-slate-500" />, label: "Admin dashboard & platform analytics" },
  { icon: <Star className="w-4 h-4 text-yellow-500" />, label: "Grade analytics with visual charts" },
];

// SVG Donut for AI usage
function UsageRing({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 10000 ? 2 : Math.min(100, Math.round((used / limit) * 100));
  const r = 36; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="88" height="88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
          <circle cx="44" cy="44" r={r} fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">{used}</span>
          <span className="text-[10px] text-slate-400">used</span>
        </div>
      </div>
      <p className="text-xs text-slate-500">{limit > 10000 ? "Unlimited" : `${used} / ${limit}`} AI queries</p>
    </div>
  );
}

function SubscriptionContent() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSub(d); setLoading(false); });
  }, []);

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscription & Plan</h1>
        <p className="text-slate-500 mt-1 text-sm">All features are currently free during the platform launch phase.</p>
      </div>

      {/* Free plan hero */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <Badge color="green" className="bg-green-400/20 text-green-100 border-green-300/30">Active</Badge>
            </div>
            <h2 className="text-3xl font-black">Free · All Features</h2>
            <p className="text-white/80 mt-1 text-sm">No subscription required. All premium features unlocked.</p>
          </div>
          <Star className="w-12 h-12 text-white/30" />
        </div>
        <div className="flex items-center gap-6 mt-5">
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-0.5">Price</p>
            <p className="text-2xl font-bold">$0 <span className="text-base font-normal text-white/70">/ month</span></p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-0.5">Phase</p>
            <p className="font-semibold">Launch Period</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-0.5">Access</p>
            <p className="font-semibold">All Features</p>
          </div>
        </div>
      </div>

      {/* AI Usage + Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Usage ring */}
        <div className="card flex flex-col items-center justify-center py-6">
          {loading ? (
            <div className="skeleton h-24 w-24 rounded-full" />
          ) : (
            <UsageRing used={sub?.ai_queries_used ?? 0} limit={sub?.ai_queries_limit ?? 99999} />
          )}
          <p className="text-xs text-slate-400 mt-3 text-center">AI queries reset monthly</p>
        </div>

        {/* Feature list */}
        <div className="sm:col-span-2 card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> Everything included
          </h3>
          <ul className="space-y-2.5">
            {ALL_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                {f.icon}
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Note */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm mb-1">About the Free Phase</p>
            <p className="text-sm text-amber-800 dark:text-amber-400 leading-relaxed">
              Maktab is currently in its launch phase. All features, including AI Tutor, Study Packs,
              Lecture Transcription, Group Workspace and Achievements, are available at no cost.
              Subscription tiers may be introduced in a future phase to support ongoing development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="skeleton h-40 rounded-2xl" />}>
      <SubscriptionContent />
    </Suspense>
  );
}
