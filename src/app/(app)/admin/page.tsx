"use client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Users, CreditCard, Zap, Database, AlertCircle, FileText, Shield } from "lucide-react";
import { format } from "date-fns";

interface AdminStats {
  totalUsers: number; activeSubscriptions: number; trialUsers: number;
  aiCostThisMonth: number; storageUsedGB: number; failedJobs: number;
}

interface User {
  id: string; email: string; display_name: string; role: string; created_at: string;
  subscription?: { plan: string; status: string; };
}

export default function AdminPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"users"|"ai_usage"|"logs">("overview");

  useEffect(() => {
    async function load() {
      const [sRes, uRes] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/users")]);
      if (sRes.ok) setStats(await sRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const tabs = [
    { key: "overview", label: t("admin.title") },
    { key: "users", label: t("admin.users") },
    { key: "ai_usage", label: t("admin.ai_usage") },
    { key: "logs", label: t("admin.logs") },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("admin.title")}</h1>
        <Badge color="red">Admin only</Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === t.key ? "border-brand-600 text-brand-700 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Users size={20} className="text-brand-600" />, label: t("admin.total_users"), value: stats.totalUsers, bg: "bg-brand-50" },
            { icon: <CreditCard size={20} className="text-emerald-600" />, label: t("admin.active_subs"), value: stats.activeSubscriptions, bg: "bg-emerald-50" },
            { icon: <Zap size={20} className="text-amber-600" />, label: t("admin.ai_cost"), value: `$${stats.aiCostThisMonth.toFixed(2)}`, bg: "bg-amber-50" },
            { icon: <AlertCircle size={20} className="text-red-600" />, label: "Failed jobs", value: stats.failedJobs, bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`card ${s.bg} dark:bg-transparent`}>
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm mb-3">{s.icon}</div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="card overflow-hidden p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{u.display_name || "–"}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td><Badge color={u.role === "admin" ? "red" : u.role === "instructor" ? "purple" : "gray"}>{u.role}</Badge></td>
                  <td><Badge color="blue">{u.subscription?.plan ?? "free"}</Badge></td>
                  <td><Badge color={u.subscription?.status === "active" ? "green" : "yellow"}>{u.subscription?.status ?? "free"}</Badge></td>
                  <td className="text-slate-500 text-xs">{format(new Date(u.created_at), "MMM d, yyyy")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ai_usage" && (
        <div className="card">
          <p className="text-slate-500 dark:text-slate-400 text-sm">AI usage logs and cost analytics will appear here. Monitor API costs, token usage by user, and operation types.</p>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-500">
            Connect your AI provider to track real costs here.
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="card">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Recent audit log entries</p>
          <div className="text-sm text-slate-400 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            Audit logs, consent logs, and email logs are stored securely. Use Supabase Studio to review them directly.
          </div>
        </div>
      )}
    </div>
  );
}
