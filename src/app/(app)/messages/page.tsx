"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  MessageSquare, Inbox, Send, Sparkles, ChevronRight,
  RefreshCw, PenLine, X, Check, BookOpen, User, Shield,
  Globe, Languages,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  thread_id: string;
  from_id: string;
  from_name: string;
  from_role: "instructor" | "admin" | "student";
  to_id: string;
  subject: string;
  body: string;
  read: boolean;
  course_id: string | null;
  course_name: string | null;
  created_at: string;
  ai_summary: string | null;
  ai_reply_suggestion_en: string | null;
  ai_reply_suggestion_ar: string | null;
}

interface Course { id: string; name: string; instructor: string; }

const ROLE_ICON: Record<string, React.ReactNode> = {
  instructor: <BookOpen className="w-4 h-4 text-brand-600" />,
  admin: <Shield className="w-4 h-4 text-indigo-500" />,
  student: <User className="w-4 h-4 text-slate-500" />,
};

const ROLE_COLORS: Record<string, string> = {
  instructor: "bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800",
  admin: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800",
  student: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
};

export default function MessagesPage() {
  const { t, dir } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyLang, setReplyLang] = useState<"en" | "ar">("en");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [form, setForm] = useState({ to_name: "", subject: "", body: "", course_id: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [mr, cr] = await Promise.all([fetch("/api/messages"), fetch("/api/courses")]);
      if (mr.ok) setMessages(await mr.json());
      if (cr.ok) setCourses(await cr.json());
      setLoading(false);
    })();
  }, []);

  async function openMessage(msg: Message) {
    setSelected(msg);
    setReplySent(false);
    setReplyText(msg.ai_reply_suggestion_en ?? "");
    setReplyLang("en");
    if (!msg.read) {
      await fetch(`/api/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
    }
  }

  function applyAiSuggestion(lang: "en" | "ar") {
    setReplyLang(lang);
    const text = lang === "ar" ? selected?.ai_reply_suggestion_ar : selected?.ai_reply_suggestion_en;
    setReplyText(text ?? "");
    setTimeout(() => replyRef.current?.focus(), 50);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setSendingReply(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_id: selected.from_id,
        subject: `Re: ${selected.subject}`,
        body: replyText,
        course_id: selected.course_id,
      }),
    });
    setSendingReply(false);
    setReplySent(true);
    setReplyText("");
  }

  async function sendNew(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    setSent(true);
    setForm({ to_name: "", subject: "", body: "", course_id: "" });
    setTimeout(() => { setSent(false); setShowCompose(false); }, 2000);
  }

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir={dir}>
        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir={dir}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
          {unreadCount > 0 && (
            <span className="badge badge-brand">{unreadCount} unread</span>
          )}
        </div>
        <button
          onClick={() => { setShowCompose(true); setSelected(null); }}
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          <PenLine className="w-4 h-4" />
          Compose
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Message list */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-700 overflow-y-auto flex-shrink-0">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            messages.map(msg => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selected?.id === msg.id ? "bg-brand-50 dark:bg-brand-900/20 border-l-4 border-l-brand-500" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{ROLE_ICON[msg.from_role]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${!msg.read ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                        {msg.from_name}
                      </span>
                      {!msg.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${!msg.read ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-500"}`}>
                      {msg.subject}
                    </p>
                    {msg.course_name && (
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                        {msg.course_name}
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto">
          {showCompose ? (
            /* Compose */
            <div className="p-6 max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Message</h2>
                <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sent ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-4">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Message sent successfully!</span>
                </div>
              ) : (
                <form onSubmit={sendNew} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To</label>
                    <input
                      className="input w-full"
                      placeholder="Instructor or admin name"
                      value={form.to_name}
                      onChange={e => setForm(f => ({ ...f, to_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course (optional)</label>
                    <select
                      className="input w-full"
                      value={form.course_id}
                      onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                    >
                      <option value="">Select course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                    <input
                      className="input w-full"
                      placeholder="Message subject"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                    <textarea
                      className="input w-full h-40 resize-none"
                      placeholder="Write your message..."
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      required
                    />
                  </div>
                  <button type="submit" disabled={sending} className="btn btn-primary flex items-center gap-2">
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          ) : selected ? (
            /* Message detail */
            <div className="p-6 max-w-3xl space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selected.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  {ROLE_ICON[selected.from_role]}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{selected.from_name}</span>
                  {selected.course_name && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-brand-600 dark:text-brand-400">{selected.course_name}</span>
                    </>
                  )}
                  <span className="ml-auto text-xs">{formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Message body */}
              <div className={`rounded-xl border p-5 ${ROLE_COLORS[selected.from_role]}`}>
                <pre className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                  {selected.body}
                </pre>
              </div>

              {/* AI Summary */}
              {selected.ai_summary && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">AI Summary</span>
                  </div>
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{selected.ai_summary}</p>
                </div>
              )}

              {/* AI Reply Suggestions */}
              {(selected.ai_reply_suggestion_en || selected.ai_reply_suggestion_ar) && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-semibold text-brand-800 dark:text-brand-300">AI Suggested Reply</span>
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => applyAiSuggestion("en")}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${replyLang === "en" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700"}`}
                      >
                        <Globe className="w-3 h-3" />
                        English
                      </button>
                      <button
                        onClick={() => applyAiSuggestion("ar")}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${replyLang === "ar" ? "bg-brand-600 text-white" : "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700"}`}
                      >
                        <Languages className="w-3 h-3" />
                        عربي
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-brand-700 dark:text-brand-400 mb-2">
                    Click a language to load the suggestion into the reply box below, and you can edit before sending.
                  </p>
                </div>
              )}

              {/* Reply form */}
              {replySent ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Reply sent successfully!</span>
                </div>
              ) : (
                <form onSubmit={sendReply} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Reply to {selected.from_name}
                    </label>
                  </div>
                  <textarea
                    ref={replyRef}
                    className="input w-full h-36 resize-none"
                    dir={replyLang === "ar" ? "rtl" : "ltr"}
                    placeholder="Write your reply… or click an AI suggestion above"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      {sendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sendingReply ? "Sending…" : "Send Reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyText("")}
                      className="btn btn-ghost text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Select a message to read</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                AI summaries and professional reply suggestions are available for each message
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
