"use client";

import LocalDocumentEvidence from "@/components/LocalDocumentEvidence";
import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { selectedCourseId as readCourseContext } from "@/lib/journey/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, File, FileText, FolderOpen, Trash2, Eye, Loader2, CheckCircle, AlertCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PrivateFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  processing_status: "pending" | "processing" | "ready" | "failed" | "uploaded" | "archived";
  created_at: string;
  course_id: string | null;
  course_name?: string;
}

interface Course { id: string; name: string; }

export default function FilesPage() {
  const { t, dir, locale } = useI18n();
  const ar = locale === "ar";
  const [uploadError, setUploadError] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const uploadLock = useRef(false);
  const [files, setFiles] = useState<PrivateFile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  async function fetchFiles() {
    const r = await fetch("/api/files");
    if (r.ok) setFiles(await r.json());
  }

  useEffect(() => {
    (async () => {
      const context = readCourseContext(); if (context) { setSelectedCourseId(context); setFilterCourse(context); }
      setLoading(true);
      const [fr, cr] = await Promise.all([fetch("/api/files"), fetch("/api/courses")]);
      if (fr.ok) setFiles(await fr.json());
      if (cr.ok) setCourses(await cr.json());
      setLoading(false);
    })();
  }, []);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length || uploadLock.current) return;
    uploadLock.current = true; setUploading(true); setUploadError(""); setUploadNote("");
    try {
      for (const file of accepted) {
        const form = new FormData(); form.append("file", file);
        if (selectedCourseId) form.append("course_id", selectedCourseId);
        const response = await fetch("/api/files", { method: "POST", body: form });
        if (!response.ok) throw new Error();
      }
      setUploadNote(ar ? "تم تخزين النص. لم تتم فهرسته للبحث أو معالجته بالذكاء الاصطناعي." : "Text stored. Search indexing and AI processing have not run.");
      await fetchFiles();
    } catch { setUploadError(ar ? "تعذّر رفع الملف. في الوضع التجريبي، الرفع غير متاح. جرّب المعاينة المحلية أو TXT صغيرًا بحساب متصل." : "Upload failed. Demo uploads are unavailable. Use local preview, or a small TXT file with a connected account."); }
    finally { uploadLock.current = false; setUploading(false); }
  }, [selectedCourseId, ar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/plain": [".txt"] }, maxSize: 1024 * 1024, disabled: uploading,
    onDropRejected: () => setUploadError(ar ? "الرفع السحابي يدعم TXT فقط حتى 1 ميجابايت. استخدم المعاينة المحلية لـ PDF وDOCX." : "Cloud upload supports TXT up to 1 MiB. Use local preview for PDF/DOCX."),
  });

  async function deleteFile(id: string) {
    if (!confirm(t("files.confirmDelete"))) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    setFiles(f => f.filter(x => x.id !== id));
  }

  const filtered = files.filter(f => {
    const matchSearch = f.file_name.toLowerCase().includes(search.toLowerCase());
    const matchCourse = filterCourse === "all" || f.course_id === filterCourse;
    return matchSearch && matchCourse;
  });

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function statusIcon(status: PrivateFile["processing_status"]) {
    if (status === "ready") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status === "processing") return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />;
    return <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />;
  }

  return (
    <div className="space-y-6 animate-fade-up" dir={dir}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <FolderOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("files.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("files.subtitle")}</p>
        </div>
      </div>

      <LocalDocumentEvidence />

      {/* Separate explicit cloud upload; local previews never use this path. */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">{ar ? "رفع نص للحساب السحابي" : "Upload text to your cloud account"}</h2>
        <p className="text-sm text-slate-500">{ar ? "اختياري: يتم إرسال TXT إلى مساحة حسابك فقط عند اختياره هنا. حتى 1 ميجابايت. لا توجد فهرسة أو معالجة AI تلقائية." : "Optional: selecting TXT here sends it to your account storage. Up to 1 MiB. No automatic search indexing or AI processing."}</p>
        {uploadError && <p role="alert" className="text-red-600">{uploadError}</p>}
        {uploadNote && <p role="status">{uploadNote}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("files.linkToCourse")}</label>
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-48 text-sm">
            <option value="">{t("files.noCourse")}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
            ${isDragActive
              ? "border-brand-500 bg-brand-50/80 dark:bg-brand-950/30 scale-[1.01]"
              : "border-white/60 dark:border-white/10 hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("files.uploading")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/30 flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isDragActive ? t("files.dropNow") : t("files.dropOrClick")}
              </p>
              <p className="text-xs text-slate-400">{ar ? "TXT فقط • حتى 1 ميجابايت" : "TXT only • up to 1 MiB"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("files.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full sm:w-48">
          <option value="all">{t("files.allCourses")}</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Files list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t("files.noFiles")}</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {filtered.map(file => (
            <div key={file.id} className="flex items-center gap-4 px-5 py-4 row-glass border-b border-white/40 dark:border-white/5 last:border-0 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/30 flex items-center justify-center flex-shrink-0">
                <File className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.file_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatSize(file.file_size)} · {file.course_name || t("files.noCourse")} ·{" "}
                  {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {statusIcon(file.processing_status)}
                <span className={`text-xs font-medium ${
                  file.processing_status === "ready" ? "text-emerald-600" :
                  file.processing_status === "failed" ? "text-red-600" : "text-slate-400"
                }`}>
                  {file.processing_status === "uploaded" ? (ar ? "مخزّن، غير مفهرس" : "Stored, not indexed") : file.processing_status === "archived" ? (ar ? "مؤرشف" : "Archived") : t(`files.status.${file.processing_status}`)}
                </span>
              </div>
              <button
                onClick={() => deleteFile(file.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
