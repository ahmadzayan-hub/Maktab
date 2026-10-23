"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, BookOpen, Timer, Calendar, X, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useProfile } from "@/components/profile/ProfileProvider";
import { journeyCopy } from "@/lib/journey/copy";
import { initials, PRIMARY_NAV } from "@/lib/journey/navigation";
const icons = [LayoutDashboard, BookOpen, Timer, Calendar];
export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { locale, t } = useI18n();
  const copy = journeyCopy[locale];
  const pathname = usePathname();
  const { profile } = useProfile();
  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onClose]);
  const sidebar = <aside className="sidebar-glass flex flex-col h-full p-4 gap-6 overflow-y-auto">
    <div className="flex items-center justify-between">
      <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 font-bold text-brand-700 dark:text-brand-300"><GraduationCap size={28} /><span>Maktab · مكتب</span></Link>
      <button onClick={onClose} className="md:hidden min-w-11 min-h-11" aria-label={copy.close}><X size={20} /></button>
    </div>
    <nav aria-label={copy.menu} className="space-y-2">
      {PRIMARY_NAV.map((item, i) => {
        const Icon = icons[i];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 min-h-12 px-4 rounded-2xl font-medium ${active ? "nav-active" : "text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5"}`}><Icon size={20} />{copy[item.key]}</Link>;
      })}
    </nav>
    <p className="text-sm text-slate-500">{copy.context}</p>
    <div className="mt-auto space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
      <Link href="/settings" onClick={onClose} className="flex items-center gap-3 min-h-11 text-sm"><Settings size={18} />{copy.account}</Link>
      {profile?.role === "admin" && <Link href="/admin" onClick={onClose} className="block min-h-11 text-sm">{t("nav.admin")}</Link>}
      <Link href="/settings" onClick={onClose} className="flex items-center gap-3 min-h-12">
        <span aria-hidden className="rounded-xl bg-brand-600 text-white p-2 text-sm">{initials(profile?.full_name)}</span>
        <span className="text-sm truncate">{profile?.full_name || copy.profile}</span>
      </Link>
    </div>
  </aside>;
  return <>
    <div className="hidden md:flex shrink-0" style={{ width: "var(--sidebar-w)" }}><div className="sticky top-0 h-screen w-full">{sidebar}</div></div>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={copy.close} /><div className="absolute inset-y-0 start-0 w-72 max-w-[90vw]">{sidebar}</div></div>}
  </>;
}
