import { z } from "zod";
export const StudyDraft = z.object({ courseId: z.string(), goal: z.string().max(500), notes: z.string().max(50000), elapsed: z.number().finite().min(0).max(86400), minutes: z.number().int().min(15).max(240), finished: z.boolean() });
export type StudyDraft = z.infer<typeof StudyDraft>;
export function readDraft(raw: string | null, courseId: string): StudyDraft | null {
  try { const result = StudyDraft.safeParse(raw ? JSON.parse(raw) : null); return result.success && result.data.courseId === courseId ? result.data : null; } catch { return null; }
}
export function sessionMinutes(value: string | null) { const n = Number(value); return [15, 30, 60, 90].includes(n) ? n : 30; }
export function downloadText(name: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
