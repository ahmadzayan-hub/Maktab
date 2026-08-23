"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  GraduationCap, LayoutDashboard, BookOpen, Megaphone, Clock, BarChart3,
  FolderOpen, MessageSquare, Calendar, Package, Bot, CreditCard,
  ClipboardList, Newspaper, HelpCircle, Settings, ShieldCheck,
  Zap, X, FileText, Mic, Users, Trophy, Sparkles,
} from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  isNew?: boolean;
  color?: string;
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function NavLink({ href, icon, label, badge, isNew, color = "text-brand-500", onClose }: NavItem & { onClose?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      onClick={onClose}
      className={clsx(
        "group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
        active
          ? "nav-active"
          : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
      )}
    >
      {/* Active left indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-r-full" />
      )}

      <span className={clsx(
        "flex-shrink-0 w-5 h-5 transition-transform duration-200 group-hover:scale-110",
        active ? "text-white nav-active-icon" : color
      )}>
        {icon}
      </span>

      <span className="flex-1 truncate">{label}</span>

      {isNew && !badge && (
        <span className="text-[9px] bg-gradient-to-r from-brand-500 to-purple-500 text-white rounded-full px-2 py-0.5 font-bold uppercase tracking-wider leading-none shadow-sm">
          New
        </span>
      )}
      {badge && (
        <span className="text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center leading-none font-bold shadow-sm">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="px-3 pt-1 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400/70 dark:text-slate-600">
        {title}
      </p>
      {children}
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useI18n();

  const sidebar = (
    <aside className="sidebar-glass flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 flex-shrink-0 border-b border-white/40 dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onClose}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-glow transition-all duration-300 group-hover:scale-105">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold gradient-text">Maktab</span>
            <p className="text-[9px] text-slate-400 -mt-0.5 leading-none">مكتب · Your MBA desk</p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white/50 dark:hover:bg-white/10 transition"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* User pill */}
      <div className="mx-3 mt-4 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-brand-50/80 to-purple-50/80 dark:from-brand-950/40 dark:to-purple-950/30 border border-brand-100/60 dark:border-brand-800/30">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              SA
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-950" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">Sara Al-Mansouri</p>
            <p className="text-[10px] text-slate-400 truncate">Free Access</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto" aria-label="App navigation">
        <NavSection title={t("nav.section.overview")}>
          <NavLink href="/dashboard"     icon={<LayoutDashboard size={17} />} label={t("nav.dashboard")}      color="text-brand-500"   onClose={onClose} />
          <NavLink href="/courses"       icon={<BookOpen size={17} />}        label={t("nav.courses")}         color="text-sky-500"     onClose={onClose} />
          <NavLink href="/announcements" icon={<Megaphone size={17} />}       label={t("nav.announcements")}   color="text-purple-500"  onClose={onClose} />
          <NavLink href="/timeline"      icon={<Clock size={17} />}           label={t("nav.timeline")}        color="text-amber-500"   onClose={onClose} />
          <NavLink href="/grades"        icon={<BarChart3 size={17} />}       label={t("nav.grades")}          color="text-emerald-500" onClose={onClose} />
          <NavLink href="/calendar"      icon={<Calendar size={17} />}        label={t("nav.calendar")}        color="text-rose-500"    onClose={onClose} />
        </NavSection>

        <NavSection title={t("nav.section.study")}>
          <NavLink href="/files"         icon={<FolderOpen size={17} />}      label={t("nav.files")}           color="text-blue-500"    onClose={onClose} />
          <NavLink href="/study-packs"   icon={<Package size={17} />}         label={t("nav.study_packs")}     color="text-violet-500"  onClose={onClose} />
          <NavLink href="/tutor"         icon={<Bot size={17} />}             label={t("nav.tutor")}           color="text-teal-500"    onClose={onClose} />
          <NavLink href="/flashcards"    icon={<Zap size={17} />}             label={t("nav.flashcards")}      color="text-yellow-500"  onClose={onClose} />
          <NavLink href="/quizzes"       icon={<ClipboardList size={17} />}   label={t("nav.quizzes")}         color="text-orange-500"  onClose={onClose} />
          <NavLink href="/lecture"       icon={<Mic size={17} />}             label={t("nav.lecture")}         color="text-red-500"     onClose={onClose} isNew />
          <NavLink href="/learn"         icon={<Sparkles size={17} />}        label={t("nav.learn")}           color="text-pink-500"    onClose={onClose} isNew />
        </NavSection>

        <NavSection title={t("nav.section.collab")}>
          <NavLink href="/group-project" icon={<Users size={17} />}           label={t("nav.group_project")}   color="text-indigo-500"  onClose={onClose} isNew />
          <NavLink href="/messages"      icon={<MessageSquare size={17} />}   label={t("nav.messages")}        color="text-cyan-500"    onClose={onClose} />
        </NavSection>

        <NavSection title={t("nav.section.productivity")}>
          <NavLink href="/tasks"         icon={<FileText size={17} />}        label={t("nav.tasks")}           color="text-lime-600"    onClose={onClose} />
          <NavLink href="/weekly-brief"  icon={<Newspaper size={17} />}       label={t("nav.weekly_brief")}    color="text-pink-500"    onClose={onClose} />
          <NavLink href="/ask-mba"       icon={<HelpCircle size={17} />}      label={t("nav.ask_mba")}         color="text-fuchsia-500" onClose={onClose} />
          <NavLink href="/achievements"  icon={<Trophy size={17} />}          label={t("nav.achievements")}    color="text-amber-500"   onClose={onClose} isNew />
        </NavSection>

        <NavSection title={t("nav.section.account")}>
          <NavLink href="/subscription"  icon={<CreditCard size={17} />}      label={t("nav.subscription")}   color="text-slate-500"   onClose={onClose} />
          <NavLink href="/settings"      icon={<Settings size={17} />}        label={t("nav.settings")}        color="text-slate-500"   onClose={onClose} />
          <NavLink href="/admin"         icon={<ShieldCheck size={17} />}     label={t("nav.admin")}           color="text-slate-500"   onClose={onClose} />
        </NavSection>
      </nav>

      {/* Free tier badge */}
      <div className="px-3 pb-4 flex-shrink-0 space-y-2">
        <div className="rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-purple-500/10 dark:from-brand-500/15 dark:to-purple-500/15" />
          <div className="relative px-3.5 py-3 border border-brand-200/60 dark:border-brand-700/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Free · All Features</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 overflow-hidden">
              <div className="h-full rounded-full w-full bg-gradient-to-r from-brand-500 to-purple-500 animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">No subscription required</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0" style={{ width: "var(--sidebar-w)" }}>
        <div className="sticky top-0 h-screen flex flex-col overflow-hidden">
          {sidebar}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />
          <div className="relative w-72 flex flex-col animate-slide-right shadow-2xl">
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}
