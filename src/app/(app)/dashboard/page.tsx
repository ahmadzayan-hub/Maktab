"use client";
import { StudyCommandCenter } from "@/components/learning/StudyCommandCenter";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useProfile } from "@/components/profile/ProfileProvider";
import { journeyCopy } from "@/lib/journey/copy";
import Link from "next/link";
export default function DashboardPage() {
  const { locale, t } = useI18n(); const copy = journeyCopy[locale]; const { profile } = useProfile();
  return <div className="space-y-6 max-w-4xl mx-auto"><header className="space-y-2">{profile?.full_name && <p className="text-sm text-slate-500">{profile.full_name}</p>}<h1 className="text-2xl font-bold">{copy.title}</h1><p className="text-slate-500">{copy.subtitle}</p></header><StudyCommandCenter /><details className="card"><summary className="cursor-pointer min-h-11">{copy.more}</summary><div className="flex flex-wrap gap-4">{[["/announcements", "nav.announcements"], ["/weekly-brief", "nav.weekly_brief"], ["/tasks", "nav.tasks"], ["/ask-mba", "nav.ask_mba"]].map(([href, key]) => <Link key={href} href={href} className="text-brand-600 min-h-11 py-2">{t(key)}</Link>)}</div></details></div>;
}
