"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen, Clock, Megaphone, BarChart3, Bot, Package, Newspaper,
  AlertTriangle, CheckCircle, TrendingUp, Zap, ArrowRight, Mic,
  Users, Trophy, Star, Target, Brain,
} from "lucide-react";
import { format } from "date-fns";
import { StudyCommandCenter } from "@/components/learning/StudyCommandCenter";

interface Course { id: string; name: string; code: string; progress: number; instructor: string; }
interface Deadline { id: string; title: string; course_name: string; due_date: string; risk: "safe"|"due_soon"|"at_risk"|"overdue"; type: string; }
interface Announcement { id: string; title: string; summary: string; risk_level: string; course_name: string; created_at: string; }

/* ── 3D tilt card hook ── */
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);
  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) translateZ(6px)`;
  }
  function handleLeave() {
    if (ref.current) ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0px)";
  }
  return { ref, onMouseMove: handleMove, onMouseLeave: handleLeave };
}

/* ── Animated counter ── */
function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const num = typeof value === "number" ? value : parseFloat(value) || 0;
  useEffect(() => {
    let start = 0;
    const step = num / 30;
    const t = setInterval(() => {
      start += step;
      if (start >= num) { setDisplay(num); clearInterval(t); }
      else setDisplay(Math.floor(start));
    }, 20);
    return () => clearInterval(t);
  }, [num]);
  return <>{typeof value === "string" && isNaN(num) ? value : display}{suffix}</>;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [courses, setCourses]           = useState<Course[]>([]);
  const [deadlines, setDeadlines]       = useState<Deadline[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [gradedCount, setGradedCount]   = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, dRes, aRes, gRes] = await Promise.all([
          fetch("/api/courses"), fetch("/api/deadlines?view=week"), fetch("/api/announcements?limit=5"),
          fetch("/api/grades"),
        ]);
        if (cRes.ok) setCourses(await cRes.json());
        if (dRes.ok) setDeadlines(await dRes.json());
        if (aRes.ok) setAnnouncements(await aRes.json());
        if (gRes.ok) setGradedCount(((await gRes.json()) as unknown[]).length);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const riskColors: Record<string, "red"|"yellow"|"green"|"blue"> = {
    overdue: "red", at_risk: "red", due_soon: "yellow", safe: "green",
  };
  const riskLabels: Record<string, string> = {
    overdue: "Overdue", at_risk: "At Risk", due_soon: "Due Soon", safe: "Safe",
  };

  const tilt1 = useTilt(10);
  const tilt2 = useTilt(10);
  const tilt3 = useTilt(10);
  const tilt4 = useTilt(10);
  const tilts = [tilt1, tilt2, tilt3, tilt4];

  const stats = [
    {
      icon: <BookOpen size={22} />,
      label: "Active Courses",
      value: loading ? "·" : courses.length,
      suffix: "",
      href: "/courses",
      color: "from-brand-500 to-blue-600",
      glow: "stat-card-blue",
      ring: "#3b82f6",
      bg: "from-brand-50/80 to-blue-50/80 dark:from-brand-950/40 dark:to-blue-950/30",
    },
    {
      icon: <Clock size={22} />,
      label: "Upcoming Deadlines",
      value: loading ? "·" : deadlines.length,
      suffix: "",
      href: "/timeline",
      color: "from-amber-500 to-orange-500",
      glow: "stat-card-amber",
      ring: "#f59e0b",
      bg: "from-amber-50/80 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/30",
    },
    {
      icon: <Megaphone size={22} />,
      label: "Announcements",
      value: loading ? "·" : announcements.length,
      suffix: "",
      href: "/announcements",
      color: "from-purple-500 to-violet-600",
      glow: "stat-card-purple",
      ring: "#a855f7",
      bg: "from-purple-50/80 to-violet-50/80 dark:from-purple-950/40 dark:to-violet-950/30",
    },
    {
      icon: <BarChart3 size={22} />,
      label: "Graded items",
      value: loading ? "·" : gradedCount,
      suffix: "",
      href: "/grades",
      color: "from-emerald-500 to-teal-500",
      glow: "stat-card-emerald",
      ring: "#10b981",
      bg: "from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/40 dark:to-teal-950/30",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-7 animate-fade-in">
        <div className="skeleton h-52 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
        <div className="skeleton h-52 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Hero banner ── */}
      <div className="relative rounded-3xl overflow-hidden hero-gradient p-7 text-white shadow-float animate-stagger-1">
        {/* Floating orbs inside banner */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 animate-float-slow"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3), transparent)", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full opacity-10 animate-float"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent)", transform: "translateY(40%)" }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="animate-wave inline-block text-xl">👋</span>
              <span className="text-white/70 text-sm font-medium">{greeting}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 leading-tight">
              Sara Al-Mansouri
            </h1>
            <p className="text-white/75 text-sm mb-5 leading-relaxed max-w-md">
              {courses.length} active course{courses.length === 1 ? "" : "s"} · your plan for today is below.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/tutor">
                <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all hover:scale-105 press">
                  <Brain size={15} className="text-white" />
                  Ask AI Tutor
                  <ArrowRight size={13} />
                </button>
              </Link>
              <Link href="/lecture">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all hover:scale-105 press">
                  <Mic size={15} />
                  Start Lecture
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Decision first: what is due, what needs you, what to study now. */}
      <StudyCommandCenter />

      {/* ── 3D Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href}>
            <div
              ref={tilts[i].ref}
              onMouseMove={tilts[i].onMouseMove}
              onMouseLeave={tilts[i].onMouseLeave}
              className={`card-hover ${s.glow} cursor-pointer bg-gradient-to-br ${s.bg} animate-stagger-${(i+1) as 1|2|3|4}`}
              style={{ transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease", willChange: "transform" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                  {s.icon}
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {!loading && typeof s.value === "number"
                  ? <AnimatedNumber value={s.value} suffix={s.suffix} />
                  : s.value
                }
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Courses */}
        <div className="card animate-stagger-1">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center shadow-sm">
                <BookOpen size={15} className="text-white" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">My Courses</h2>
            </div>
            <Link href="/courses">
              <button className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </Link>
          </div>

          {(
            <div className="space-y-2.5">
              {courses.slice(0, 5).map((c, i) => {
                const colors = ["#3b82f6","#a855f7","#14b8a6","#f59e0b","#ef4444"];
                const col = colors[i % colors.length];
                return (
                  <Link key={c.id} href={`/courses/${c.id}`}>
                    <div className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/60 dark:hover:bg-white/5 transition cursor-pointer press">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${col}, ${col}99)` }}>
                        {c.code?.slice(0,2) || "CO"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        <p className="text-xs text-slate-400 truncate">{c.instructor}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.2)" }}>
                            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                              style={{ width: `${c.progress}%`, background: `linear-gradient(90deg, ${col}, ${col}cc)` }}>
                              <div className="absolute inset-0 shimmer-overlay" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{c.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Deadlines */}
        <div className="card animate-stagger-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Clock size={15} className="text-white" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Upcoming Deadlines</h2>
            </div>
            <Link href="/timeline">
              <button className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                Timeline <ArrowRight size={12} />
              </button>
            </Link>
          </div>

          {deadlines.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-60" />
              All caught up!
            </div>
          ) : (
            <div className="space-y-2.5">
              {deadlines.slice(0, 6).map(d => {
                const isUrgent = d.risk === "overdue" || d.risk === "at_risk";
                const isSoon = d.risk === "due_soon";
                const borderColor = isUrgent ? "#ef4444" : isSoon ? "#f59e0b" : "#10b981";
                return (
                  <div key={d.id}
                    className="flex items-center gap-3 p-3 rounded-2xl transition hover:bg-white/60 dark:hover:bg-white/5 cursor-pointer"
                    style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: "12px" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{d.title}</p>
                      <p className="text-xs text-slate-400">{d.course_name}</p>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-1">
                      <Badge color={riskColors[d.risk] || "gray"}>{riskLabels[d.risk]}</Badge>
                      <p className="text-[10px] text-slate-400">{format(new Date(d.due_date), "MMM d")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Recommendations ── */}
      <div className="card animate-stagger-3">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">AI Recommendations</h2>
            <p className="text-xs text-slate-400">Personalized for your learning journey</p>
          </div>
          <span className="ml-auto text-[10px] bg-gradient-to-r from-teal-500 to-brand-500 text-white rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">AI</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {[
            { icon: <Package size={18} />, title: "Generate Study Pack", body: "Strategic Management Lecture 3 is ready. Generate your AI study pack now.", href: "/study-packs", grad: "from-purple-500 to-violet-600", bg: "from-purple-50/80 to-violet-50/60 dark:from-purple-950/30 dark:to-violet-950/20" },
            { icon: <Zap size={18} />,     title: "Review Flashcards",   body: "18 flashcards due for review in Finance module. Beat the forgetting curve.", href: "/flashcards",  grad: "from-amber-500 to-orange-500", bg: "from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20" },
            { icon: <Bot size={18} />,     title: "Exam Prep Session",   body: "Exam in 5 days. Your AI tutor is ready for a focused prep session.", href: "/tutor",         grad: "from-brand-500 to-blue-600",  bg: "from-brand-50/80 to-blue-50/60 dark:from-brand-950/30 dark:to-blue-950/20" },
          ].map((r, i) => (
            <Link key={i} href={r.href}>
              <div className={`group relative p-4 rounded-2xl bg-gradient-to-br ${r.bg} border border-white/60 dark:border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg press overflow-hidden`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent)` }} />
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${r.grad} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  {r.icon}
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">{r.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{r.body}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  Start now <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="animate-stagger-4">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { href: "/study-packs",   icon: <Package size={20} />,   label: "Study Packs",   grad: "from-purple-500 to-violet-600" },
            { href: "/tutor",         icon: <Bot size={20} />,        label: "AI Tutor",      grad: "from-teal-500 to-cyan-500" },
            { href: "/weekly-brief",  icon: <Newspaper size={20} />,  label: "Weekly Brief",  grad: "from-brand-500 to-blue-600" },
            { href: "/ask-mba",       icon: <TrendingUp size={20} />, label: "Ask MBA",       grad: "from-emerald-500 to-teal-500" },
            { href: "/achievements",  icon: <Trophy size={20} />,     label: "Achievements",  grad: "from-gold-500 to-amber-500" },
            { href: "/group-project", icon: <Users size={20} />,      label: "Workspace",     grad: "from-indigo-500 to-purple-500" },
          ].map((qa, i) => (
            <Link key={qa.href} href={qa.href}>
              <div className={`group card-hover flex flex-col items-center gap-2.5 py-5 text-center cursor-pointer press animate-stagger-${Math.min(i+1,5) as 1|2|3|4|5}`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${qa.grad} flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200`}>
                  {qa.icon}
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight text-center">{qa.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent announcements ── */}
      {announcements.length > 0 && (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
                <Megaphone size={15} className="text-white" />
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Announcements</h2>
            </div>
            <Link href="/announcements">
              <button className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </Link>
          </div>
          <div className="space-y-2.5">
            {announcements.map(a => (
              <div key={a.id} className="flex gap-3 p-3.5 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/8 transition cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0 animate-pulse-soft" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
                  {a.summary && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{a.summary}</p>}
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{a.course_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
