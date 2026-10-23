"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { journeyCopy } from "@/lib/journey/copy";
import { courseHref } from "@/lib/journey/navigation";
export function CourseTools({ courseId }: { courseId?: string }) {
  const { locale, t } = useI18n(); const copy = journeyCopy[locale];
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[["/files", copy.material], ["/study-packs", copy.summary], ["/quizzes", copy.questions], ["/flashcards", copy.flashcards]].map(([href, label]) => <Link key={href} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 min-h-12 text-brand-700 dark:text-brand-300" href={courseHref(href, courseId)}>{label}</Link>)}</div>
    <details><summary className="cursor-pointer min-h-11 text-sm">{copy.more}</summary><div className="flex flex-wrap gap-4">{[["/tutor", copy.tutor], ["/lecture", copy.lecture], ["/grades", copy.grades], ["/group-project", t("nav.group_project")], ["/messages", t("nav.messages")], ["/learn", t("nav.learn")], ["/achievements", t("nav.achievements")]].map(([href, label]) => <Link key={href} href={courseHref(href, courseId)} className="text-sm text-brand-600 min-h-11 py-2">{label}</Link>)}</div></details>
  </div>;
}
