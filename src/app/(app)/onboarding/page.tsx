"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useProfile } from "@/components/profile/ProfileProvider";
import { journeyCopy } from "@/lib/journey/copy";
export default function OnboardingPage() {
  const { locale, setLocale } = useI18n();
  const { refresh } = useProfile();
  const copy = journeyCopy[locale];
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState(false);
  async function finish(e: React.FormEvent) {
    e.preventDefault(); if (inFlight.current) return; inFlight.current = true; setSaving(true); setError(false);
    try {
      const response = await fetch("/api/profile/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: name, primary_language: locale }) });
      if (!response.ok || !(await response.json()).ok) throw new Error("Save failed");
      refresh(); router.push("/courses?add=1");
    } catch { setError(true); } finally { inFlight.current = false; setSaving(false); }
  }
  return <section className="card max-w-xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold">{copy.welcome}</h1><p className="text-slate-500">{copy.onboardingIntro}</p>
    <form onSubmit={finish} className="space-y-5">
      <div><label htmlFor="onboarding-language" className="block mb-2">{copy.language}</label><select id="onboarding-language" value={locale} onChange={e => setLocale(e.target.value as "en" | "ar")}><option value="ar">العربية</option><option value="en">English</option></select></div>
      <div><label htmlFor="onboarding-name" className="block mb-2">{copy.name}</label><input id="onboarding-name" autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></div>
      {error && <p role="alert" className="text-red-700 dark:text-red-300">{copy.saveError}</p>}
      <button className="btn-primary min-h-11" disabled={saving}>{saving ? copy.saving : copy.continue}</button>
    </form>
    <Link href="/courses?add=1" className="inline-block min-h-11 text-brand-600">{copy.skip}</Link>
  </section>;
}
