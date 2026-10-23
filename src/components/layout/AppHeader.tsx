"use client";
import {
  Menu, Bell, Sun, Moon, Search, X, BookOpen, Clock, BarChart3, Package,
  FileText, Command, Sparkles, Globe,
} from "lucide-react";
import { useProfile } from "@/components/profile/ProfileProvider";
import { initials } from "@/lib/journey/navigation";
import { journeyCopy } from "@/lib/journey/copy";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface AppHeaderProps { onMenuClick: () => void; title?: string; }
interface SearchResult {
  type: string; label: string; href: string; subtitle?: string; icon: React.ReactNode;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  course:   <BookOpen  className="w-4 h-4 text-brand-500" />,
  deadline: <Clock     className="w-4 h-4 text-amber-500" />,
  grade:    <BarChart3 className="w-4 h-4 text-emerald-500" />,
  pack:     <Package   className="w-4 h-4 text-purple-500" />,
  file:     <FileText  className="w-4 h-4 text-blue-500" />,
};

export function AppHeader({ onMenuClick, title }: AppHeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { profile } = useProfile();
  const copy = journeyCopy[locale];
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const timeout    = useRef<NodeJS.Timeout | null>(null);
  const abortCtrl  = useRef<AbortController | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setShowSearch(false); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    if (abortCtrl.current) abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    const signal = abortCtrl.current.signal;
    setSearching(true);
    try {
      const [cRes, dRes, gRes, pRes, fRes] = await Promise.all([
        fetch("/api/courses", { signal }), fetch("/api/deadlines?view=all", { signal }),
        fetch("/api/grades", { signal }), fetch("/api/study-packs", { signal }), fetch("/api/files", { signal }),
      ]);
      const [courses, deadlines, grades, packs, files] = await Promise.all([
        cRes.ok ? cRes.json() : [], dRes.ok ? dRes.json() : [],
        gRes.ok ? gRes.json() : [], pRes.ok ? pRes.json() : [], fRes.ok ? fRes.json() : [],
      ]);
      const lower = q.toLowerCase();
      const found: SearchResult[] = [];
      courses.filter((c: any) => c.name?.toLowerCase().includes(lower) || c.code?.toLowerCase().includes(lower)).slice(0, 3)
        .forEach((c: any) => found.push({ type: "course", label: c.name, subtitle: c.code, href: `/courses/${c.id}`, icon: TYPE_ICON.course }));
      deadlines.filter((d: any) => d.title?.toLowerCase().includes(lower)).slice(0, 3)
        .forEach((d: any) => found.push({ type: "deadline", label: d.title, subtitle: d.course_name, href: "/timeline", icon: TYPE_ICON.deadline }));
      grades.filter((g: any) => g.item_name?.toLowerCase().includes(lower)).slice(0, 2)
        .forEach((g: any) => found.push({ type: "grade", label: g.item_name, subtitle: g.category, href: "/grades", icon: TYPE_ICON.grade }));
      packs.filter((p: any) => p.title?.toLowerCase().includes(lower)).slice(0, 2)
        .forEach((p: any) => found.push({ type: "pack", label: p.title, subtitle: "Study Pack", href: "/study-packs", icon: TYPE_ICON.pack }));
      files.filter((f: any) => f.file_name?.toLowerCase().includes(lower)).slice(0, 2)
        .forEach((f: any) => found.push({ type: "file", label: f.file_name, subtitle: "File", href: "/files", icon: TYPE_ICON.file }));
      setResults(found.slice(0, 8));
    } catch (err: any) {
      if (err?.name !== "AbortError") setResults([]);
    } finally { setSearching(false); }
  }, []);

  function handleQuery(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => search(q), 280);
  }

  function navigate(href: string) {
    setShowSearch(false); setQuery(""); setResults([]);
    router.push(href);
  }

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("tz_theme", next ? "dark" : "light"); } catch { /* Theme still works for this visit. */ }
  };



  return (
    <header className="header-glass sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/60 dark:hover:bg-white/10 transition press"
        aria-label={copy.menu}
      >
        <Menu size={19} />
      </button>

      {title && (
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden sm:block me-1">{title}</h1>
      )}

      {/* Search */}
      <div className="flex-1 max-w-sm relative" ref={searchRef}>
        <button
          onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className={clsx(
            "hidden sm:flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 rounded-2xl transition-all duration-200 border",
            "bg-white/60 border-white/70 hover:bg-white/80 hover:border-white dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
          )}
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-start text-xs">Search anything…</span>
          <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] bg-white/80 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 rounded-lg px-1.5 py-0.5 text-slate-400">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        <button
          onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/60 dark:hover:bg-white/10 transition"
        >
          <Search size={18} />
        </button>

        {/* Search overlay */}
        {showSearch && (
          <div className="absolute top-0 left-0 right-0 z-50 min-w-[320px] rounded-3xl overflow-hidden shadow-float border border-white/60 dark:border-white/10 animate-scale-in"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(20px) saturate(1.8)" }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/50 dark:border-white/10">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
                placeholder="Search courses, deadlines, grades, files…"
                value={query}
                onChange={handleQuery}
                autoFocus
                style={{ border: "none", boxShadow: "none", padding: 0 }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="text-slate-400 hover:text-slate-600 transition">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setShowSearch(false)} className="text-[10px] border border-slate-200 dark:border-slate-600 rounded-lg px-1.5 py-0.5 text-slate-400 hover:text-slate-600 transition">
                Esc
              </button>
            </div>

            {searching && (
              <div className="px-4 py-4 flex items-center gap-2 text-sm text-slate-400">
                <div className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                Searching…
              </div>
            )}

            {!searching && results.length > 0 && (
              <ul className="py-1 max-h-72 overflow-y-auto">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => navigate(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/50 dark:hover:bg-white/5 text-start transition"
                    >
                      <span className="flex-shrink-0">{r.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.label}</p>
                        {r.subtitle && <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>}
                      </div>
                      <span className="text-[10px] bg-white/60 dark:bg-white/10 text-slate-400 rounded-lg px-1.5 py-0.5 capitalize flex-shrink-0">{r.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!searching && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No results for &ldquo;<span className="text-slate-600 dark:text-slate-300 font-medium">{query}</span>&rdquo;
              </div>
            )}

            {!query && (
              <div className="px-4 py-3">
                <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">Quick access</p>
                <div className="flex flex-wrap gap-1.5">
                  {[{label: copy.courses, href: "/courses"}, {label: copy.deadlines, href: "/timeline"}, {label: copy.study, href: "/study"}].map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl px-2.5 py-1 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition font-medium"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">

        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300 transition press"
          aria-label={t("lang.toggle")}
        >
          <Globe className="w-3.5 h-3.5" />
          {t("lang.toggle")}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300 transition press"
          aria-label="Toggle theme"
        >
          {dark
            ? <Sun size={17} className="text-amber-400 animate-spin-slow" />
            : <Moon size={17} />
          }
        </button>

        <Link href="/announcements" className="min-h-11 min-w-11 flex items-center justify-center" aria-label={t("nav.announcements")}><Bell size={17} /></Link>

        {/* User avatar */}
        <Link href="/settings" aria-label={copy.account} className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer hover:shadow-glow transition press ms-0.5">
          {initials(profile?.full_name)}
        </Link>
      </div>
    </header>
  );
}
