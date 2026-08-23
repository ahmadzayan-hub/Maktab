"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  BookOpen, ArrowLeft, Clock, BarChart3, FolderOpen, Package, Bot,
  Zap, ClipboardList, Megaphone, AlertTriangle, CheckCircle, ChevronRight,
  Star, Edit2, Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface Course {
  id: string; name: string; code: string; instructor: string;
  category: string; semester: string; status: string;
  progress: number; starred: boolean; color?: string; credits?: number;
}
interface Deadline {
  id: string; title: string; due_date: string; risk: string; type: string;
  course_id: string; is_done: boolean;
}
interface Announcement {
  id: string; title: string; summary: string; risk_level: string;
  course_id: string; created_at: string;
}
interface Grade {
  id: string; course_id: string; category: string; item_name: string;
  score: number | null; max_score: number; weight: number;
}
interface StudyPack {
  id: string; title: string; course_id: string; status: string;
  overview?: string;
}
interface File {
  id: string; file_name: string; course_id: string; processing_status: string;
  file_size: number; created_at: string;
}

const riskColor: Record<string, string> = {
  overdue: "red", at_risk: "red", due_soon: "yellow", safe: "green"
};

function bytes(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"files"|"study"|"grades"|"deadlines">("overview");

  useEffect(() => {
    async function load() {
      try {
        const [cRes, dRes, aRes, gRes, pRes, fRes] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/deadlines?view=all"),
          fetch("/api/announcements"),
          fetch("/api/grades"),
          fetch("/api/study-packs"),
          fetch("/api/files"),
        ]);
        const courses: Course[] = cRes.ok ? await cRes.json() : [];
        const found = courses.find(c => c.id === id);
        setCourse(found ?? null);
        if (dRes.ok) setDeadlines((await dRes.json()).filter((d: Deadline) => d.course_id === id));
        if (aRes.ok) setAnnouncements((await aRes.json()).filter((a: Announcement) => a.course_id === id));
        if (gRes.ok) setGrades((await gRes.json()).filter((g: Grade) => g.course_id === id));
        if (pRes.ok) setPacks((await pRes.json()).filter((p: StudyPack) => p.course_id === id));
        if (fRes.ok) setFiles((await fRes.json()).filter((f: File) => f.course_id === id));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20">
      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Course not found</h2>
      <Button variant="secondary" onClick={() => router.push("/courses")}>
        <ArrowLeft size={15} /> Back to Courses
      </Button>
    </div>
  );

  // Grade calculation
  const gradedItems = grades.filter(g => g.score !== null);
  const totalWeight = gradedItems.reduce((s, g) => s + g.weight, 0);
  const weightedScore = gradedItems.reduce((s, g) => s + (g.score! / g.max_score) * g.weight, 0);
  const currentGrade = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null;

  const upcomingDeadlines = deadlines.filter(d => !d.is_done);
  const atRiskCount = upcomingDeadlines.filter(d => d.risk === "at_risk" || d.risk === "overdue").length;

  const tabs = [
    { key: "overview", label: "Overview", count: null },
    { key: "files", label: "Files", count: files.length },
    { key: "study", label: "Study Packs", count: packs.length },
    { key: "grades", label: "Grades", count: grades.length },
    { key: "deadlines", label: "Deadlines", count: upcomingDeadlines.length },
  ] as const;

  const accentColor = course.color ?? "#6366f1";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/courses")} className="btn-ghost p-2 rounded-xl">
          <ArrowLeft size={18} />
        </button>
        <nav className="text-sm text-slate-400">
          <Link href="/courses" className="hover:text-slate-600">Courses</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 dark:text-slate-300">{course.name}</span>
        </nav>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {course.code && <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-lg">{course.code}</span>}
              <Badge color={course.status === "active" ? "green" : "gray"}>{course.status}</Badge>
            </div>
            <h1 className="text-2xl font-bold mb-1">{course.name}</h1>
            {course.instructor && <p className="text-white/80 text-sm">{course.instructor}</p>}
            {course.semester && <p className="text-white/60 text-xs mt-0.5">{course.semester}</p>}
          </div>
          {course.starred && <Star size={18} className="text-amber-300 fill-amber-300 flex-shrink-0" />}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Course Progress</span>
            <span className="font-semibold">{course.progress}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${course.progress}%` }} />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Clock size={18} className="text-amber-600" />, label: "Deadlines", value: upcomingDeadlines.length, sub: atRiskCount > 0 ? `${atRiskCount} at risk` : "all good", href: "#deadlines", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { icon: <BarChart3 size={18} className="text-emerald-600" />, label: "Current Grade", value: currentGrade !== null ? `${currentGrade}%` : "–", sub: grades.length > 0 ? `${grades.length} entries` : "No grades yet", href: "#grades", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { icon: <Package size={18} className="text-purple-600" />, label: "Study Packs", value: packs.length, sub: packs.filter(p => p.status === "ready").length + " ready", href: "/study-packs", bg: "bg-purple-50 dark:bg-purple-950/30" },
          { icon: <FolderOpen size={18} className="text-blue-600" />, label: "Files", value: files.length, sub: files.filter(f => f.processing_status === "ready").length + " processed", href: "/files", bg: "bg-blue-50 dark:bg-blue-950/30" },
        ].map(s => (
          <Link key={s.label} href={s.href}>
            <div className={`card cursor-pointer hover:shadow-card-hover transition ${s.bg}`}>
              <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm mb-3">{s.icon}</div>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* AI Recommended actions */}
      <div className="card border-l-4" style={{ borderLeftColor: accentColor }}>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={16} className="text-teal-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recommended Next Actions</h3>
          <span className="badge-blue text-xs">AI</span>
        </div>
        <div className="space-y-2">
          {atRiskCount > 0 && (
            <Link href="/timeline">
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline">
                <AlertTriangle size={14} /> {atRiskCount} deadline(s) at risk, review your timeline now
              </div>
            </Link>
          )}
          {packs.filter(p => p.status === "ready").length > 0 && (
            <Link href="/study-packs">
              <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:underline">
                <Package size={14} /> Study pack ready, review key takeaways and flashcards
              </div>
            </Link>
          )}
          {files.filter(f => f.processing_status === "ready").length > 0 && (
            <Link href="/tutor">
              <div className="flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:underline">
                <Bot size={14} /> Ask your AI tutor questions about {course.name}
              </div>
            </Link>
          )}
          {currentGrade !== null && currentGrade < 75 && (
            <Link href="/grades">
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline">
                <BarChart3 size={14} /> Grade at risk ({currentGrade}%), use the grade planner
              </div>
            </Link>
          )}
          {atRiskCount === 0 && packs.length === 0 && (
            <p className="text-sm text-slate-500">Upload lecture files to get started with AI study tools.</p>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-1.5 ${activeTab === tab.key ? "border-brand-600 text-brand-700 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-1.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Megaphone size={16} /> Announcements
              </h3>
              <Link href="/announcements" className="text-xs text-brand-600 hover:underline">View all →</Link>
            </div>
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-400">No announcements for this course.</p>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.title}</p>
                    {a.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.summary}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge color={a.risk_level === "high" || a.risk_level === "critical" ? "red" : a.risk_level === "medium" ? "yellow" : "gray"}>
                        {a.risk_level}
                      </Badge>
                      <span className="text-xs text-slate-400">{format(parseISO(a.created_at), "MMM d")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock size={16} /> Upcoming Deadlines
              </h3>
              <Link href="/timeline" className="text-xs text-brand-600 hover:underline">View all →</Link>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    {d.risk === "overdue" || d.risk === "at_risk"
                      ? <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
                      : d.risk === "due_soon"
                      ? <Clock size={15} className="text-amber-500 flex-shrink-0" />
                      : <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{d.title}</p>
                      <p className="text-xs text-slate-400">{d.type}</p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <Badge color={riskColor[d.risk] as any || "gray"}>{d.risk.replace("_", " ")}</Badge>
                      <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(d.due_date), "MMM d")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === "files" && (
        <div className="space-y-3">
          {files.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="No files for this course"
              action={{ label: "Upload files", onClick: () => router.push("/files") }}
            />
          ) : (
            files.map(f => (
              <div key={f.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.file_name}</p>
                  <p className="text-xs text-slate-400">{bytes(f.file_size)} · {format(parseISO(f.created_at), "MMM d, yyyy")}</p>
                </div>
                <Badge color={f.processing_status === "ready" ? "green" : f.processing_status === "processing" ? "blue" : f.processing_status === "failed" ? "red" : "gray"}>
                  {f.processing_status}
                </Badge>
              </div>
            ))
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => router.push("/files")}>
              <FolderOpen size={15} /> Manage all files
            </Button>
          </div>
        </div>
      )}

      {/* Study Packs tab */}
      {activeTab === "study" && (
        <div className="space-y-4">
          {packs.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No study packs yet"
              action={{ label: "Generate study pack", onClick: () => router.push("/study-packs") }}
            />
          ) : (
            packs.map(p => (
              <Link key={p.id} href="/study-packs">
                <div className="card-hover">
                  <div className="flex items-center gap-3 mb-2">
                    <Package size={16} className="text-purple-600" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{p.title}</h4>
                    <Badge color={p.status === "ready" ? "green" : p.status === "generating" ? "blue" : "gray"}>{p.status}</Badge>
                  </div>
                  {p.overview && <p className="text-xs text-slate-500 line-clamp-2 ms-7">{p.overview}</p>}
                </div>
              </Link>
            ))
          )}
          <div className="flex gap-3">
            <Link href="/study-packs"><Button variant="secondary"><Package size={15} /> All Study Packs</Button></Link>
            <Link href="/flashcards"><Button variant="secondary"><Zap size={15} /> Flashcards</Button></Link>
            <Link href="/quizzes"><Button variant="secondary"><ClipboardList size={15} /> Quizzes</Button></Link>
          </div>
        </div>
      )}

      {/* Grades tab */}
      {activeTab === "grades" && (
        <div className="space-y-4">
          {currentGrade !== null && (
            <div className="card bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Weighted average grade</p>
              <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{currentGrade}%</p>
              <p className="text-xs text-slate-500 mt-1">Based on {gradedItems.length} graded item(s) with {totalWeight}% weight recorded</p>
            </div>
          )}
          {grades.length === 0 ? (
            <EmptyState
              icon={<BarChart3 />}
              title="No grades recorded yet"
              action={{ label: "Add grade", onClick: () => router.push("/grades") }}
            />
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="data-table">
                <thead>
                  <tr><th>Item</th><th>Category</th><th className="text-end">Score</th><th className="text-end">Weight</th></tr>
                </thead>
                <tbody>
                  {grades.map(g => {
                    const pct = g.score !== null ? Math.round((g.score / g.max_score) * 100) : null;
                    return (
                      <tr key={g.id}>
                        <td className="font-medium text-slate-800 dark:text-slate-200">{g.item_name}</td>
                        <td><Badge color="gray">{g.category}</Badge></td>
                        <td className="text-end">
                          {pct !== null ? (
                            <span className={`font-semibold ${pct >= 80 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                              {g.score}/{g.max_score} ({pct}%)
                            </span>
                          ) : <span className="text-slate-300">Pending</span>}
                        </td>
                        <td className="text-end text-slate-500">{g.weight}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Deadlines tab */}
      {activeTab === "deadlines" && (
        <div className="space-y-3">
          {upcomingDeadlines.length === 0 ? (
            <EmptyState icon={<Calendar />} title="No deadlines for this course" />
          ) : (
            upcomingDeadlines.map(d => (
              <div key={d.id} className="card flex items-center gap-4">
                {d.risk === "overdue" || d.risk === "at_risk"
                  ? <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                  : d.risk === "due_soon"
                  ? <Clock size={20} className="text-amber-500 flex-shrink-0" />
                  : <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                }
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{d.title}</p>
                  <p className="text-xs text-slate-400">{d.type} · Due {format(parseISO(d.due_date), "EEEE, MMM d, yyyy")}</p>
                </div>
                <Badge color={riskColor[d.risk] as any || "gray"}>{d.risk.replace("_", " ")}</Badge>
              </div>
            ))
          )}
          <div className="flex justify-end">
            <Link href="/timeline"><Button variant="secondary"><Clock size={15} /> View full timeline</Button></Link>
          </div>
        </div>
      )}

      {/* AI Tutor CTA */}
      <div className="card bg-gradient-to-br from-teal-50 to-brand-50 dark:from-teal-950/20 dark:to-brand-950/20 border-teal-200 dark:border-teal-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-950/40 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Bot size={22} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Ask your AI tutor about {course.name}</p>
            <p className="text-sm text-slate-500 mt-0.5">Get cited answers from your uploaded lecture materials and study packs.</p>
          </div>
          <Link href="/tutor">
            <Button><Bot size={15} /> Open Tutor <ChevronRight size={14} /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
