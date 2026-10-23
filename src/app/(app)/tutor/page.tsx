"use client";
import { selectedCourseId } from "@/lib/journey/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toast";
import { Bot, Send, Plus, BookOpen, AlertCircle, ChevronDown } from "lucide-react";
import clsx from "clsx";

interface Message { role: "user"|"assistant"; content: string; citations?: {file_name: string; page_num?: number}[]; is_grounded?: boolean; }
interface Chat { id: string; title: string; created_at: string; }
interface Course { id: string; name: string; }

export default function TutorPage() {
  const { t } = useI18n();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    setSelectedCourse(selectedCourseId());
    fetch("/api/tutor").then(r => r.ok && r.json()).then(d => d && setChats(d));
    fetch("/api/courses").then(r => r.ok && r.json()).then(d => d && setCourses(d));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function newChat() {
    const res = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ course_id: selectedCourse || null }) });
    if (res.ok) {
      const chat = await res.json();
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);
      setMessages([]);
    }
  }

  async function loadChat(chatId: string) {
    setActiveChatId(chatId);
    const res = await fetch(`/api/tutor/${chatId}/messages`);
    if (res.ok) setMessages(await res.json());
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    if (!activeChatId) { toast("error", "Start a new chat first"); return; }
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/tutor/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg.content, course_id: selectedCourse || null }),
      });
      if (res.ok) {
        const aiMsg = await res.json();
        setMessages(prev => [...prev, aiMsg]);
      } else {
        toast("error", t("error.ai_failed"));
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-5">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-64 card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <Button fullWidth onClick={newChat} size="sm">
            <Plus size={15} /> {t("tutor.new_chat")}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2">{t("tutor.history")}</p>
          {chats.map(c => (
            <button
              key={c.id}
              onClick={() => loadChat(c.id)}
              className={clsx("w-full text-start px-3 py-2.5 rounded-xl text-sm transition mb-0.5", activeChatId === c.id ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}
            >
              <p className="truncate">{c.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center">
            <Bot size={18} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{t("tutor.title")}</p>
            <p className="text-xs text-slate-400">RAG-grounded · Source-cited answers</p>
          </div>
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="text-xs w-44"
          >
            <option value="">All uploaded material</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Consent notice */}
        {!consentGiven && (
          <div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">{t("tutor.consent")}</p>
              <Button size="sm" onClick={() => setConsentGiven(true)}>I understand, start chatting</Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/40 flex items-center justify-center mb-4">
                <Bot size={26} className="text-teal-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">{t("tutor.empty")}</p>
              <Button className="mt-5" onClick={newChat}><Plus size={15} />{t("tutor.new_chat")}</Button>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={clsx("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                  <div className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                    <div className="mt-1.5 ms-1 flex flex-wrap gap-1.5">
                      {m.citations.map((c, ci) => (
                        <span key={ci} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg">
                          <BookOpen size={11} />
                          {c.file_name}{c.page_num ? ` · p.${c.page_num}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.role === "assistant" && !m.is_grounded && (
                    <p className="text-xs text-amber-500 ms-1 mt-1 max-w-sm">{t("tutor.no_source")}</p>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 self-start">
                  <div className="chat-bubble-ai flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-slate-400">{t("tutor.thinking")}</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        {activeChatId && consentGiven && (
          <div className="px-4 pb-4">
            <div className="flex gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={t("tutor.placeholder")}
                rows={2}
                className="flex-1 bg-transparent border-0 resize-none text-sm placeholder-slate-400 focus:outline-none focus:ring-0 p-0"
              />
              <Button onClick={sendMessage} loading={sending} className="self-end flex-shrink-0">
                <Send size={16} />
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>
    </div>
  );
}
