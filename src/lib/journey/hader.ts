import { z } from "zod";
const Segment = z.object({ id: z.string().min(1).max(200), text: z.string().max(100000), offsetMs: z.number().finite().nonnegative().nullable(), source: z.enum(["live", "import", "demo"]) });
const Session = z.object({ format: z.literal("hader-session"), version: z.literal(1), id: z.string().min(1).max(200), title: z.string().max(500), createdAt: z.string().datetime({ offset: true }), segments: z.array(Segment).max(10000) }).refine(s => new Set(s.segments.map(x => x.id)).size === s.segments.length, "Duplicate segment IDs");
export function parseHaderTranscript(raw: string) {
  if (new TextEncoder().encode(raw).length > 2 * 1024 * 1024) throw new Error("File exceeds 2 MB");
  const data = Session.parse(JSON.parse(raw));
  const transcript = data.segments.map(segment => {
    const seconds = segment.offsetMs === null ? null : Math.floor(segment.offsetMs / 1000);
    const timestamp = seconds === null ? "untimed" : `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    return `[${timestamp}] [${segment.source}] ${segment.text}`;
  }).join("\n");
  return { title: data.title, transcript, hasDemo: data.segments.some(s => s.source === "demo") };
}
