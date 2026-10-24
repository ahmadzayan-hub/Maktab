import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/db/supabase-server";
import { randomUUID } from "node:crypto";
import { demoReturn } from "@/lib/demo";

export async function GET() {
  const demo = demoReturn("files"); if (demo) return demo;
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabase
    .from("private_files")
    .select("*, courses(name), document_chunks(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Files could not be loaded" }, { status: 500 });
  const files = (data || []).map((f: any) => ({
    ...f, course_name: f.courses?.name, file_name: f.original_name,
    file_type: f.mime_type, file_size: f.size_bytes, processing_status: f.status,
    chunk_count: f.document_chunks?.[0]?.count ?? 0,
    indexed: f.status === "ready",
  }));
  return NextResponse.json(files);
}

// This endpoint deliberately does not run binary extraction or paid embedding jobs.
// TXT persistence is awaited; uploaded means stored, NOT indexed or ready for RAG.
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 64 * 1024;

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json({ error: "Cloud uploads are unavailable in demo mode. Use local preview instead." }, { status: 422 });
  }
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let formData: FormData;
  try {
    // Bound the actual stream, not merely the untrusted Content-Length header.
    if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Upload request too large" }, { status: 413 });
    }
    const reader = req.body?.getReader();
    if (!reader) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_REQUEST_BYTES) {
          await reader.cancel();
          return NextResponse.json({ error: "Upload request too large" }, { status: 413 });
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.length; }
    formData = await new Response(body, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload" }, { status: 400 });
  }

  const file = formData.get("file");
  const courseId = formData.get("course_id");
  if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (formData.getAll("file").length !== 1 || (courseId !== null && typeof courseId !== "string")) {
    return NextResponse.json({ error: "Invalid upload fields" }, { status: 400 });
  }
  if (courseId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }
  if (!/\.txt$/i.test(file.name) || (file.type !== "text/plain" && file.type !== "")) {
    return NextResponse.json({ error: "Only UTF-8 TXT cloud uploads are supported. PDF, DOCX and PPTX need a server extractor; use local preview instead." }, { status: 422 });
  }
  if (!file.size || file.size > MAX_FILE_BYTES || file.name.length > 255) {
    return NextResponse.json({ error: "TXT must be non-empty, at most 1 MiB, with a filename of at most 255 characters." }, { status: 422 });
  }
  const bytes = await file.arrayBuffer();
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return NextResponse.json({ error: "TXT must contain valid UTF-8 text" }, { status: 422 });
  }
  if (!text.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text) || /^\s*(%PDF-|PK\x03\x04)/.test(text)) {
    return NextResponse.json({ error: "Empty or binary content is not a supported TXT document" }, { status: 422 });
  }

  // Keep the authenticated client and its RLS protections throughout.
  if (courseId) {
    const { data: course, error } = await supabase.from("courses").select("id").eq("id", courseId).eq("user_id", user.id).single();
    if (error || !course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const path = `${user.id}/${randomUUID()}.txt`;
  const storage = supabase.storage.from("private-files");
  let fileId: string | undefined;
  let uploaded = false;
  try {
    const { error: uploadError } = await storage.upload(path, bytes, { contentType: "text/plain" });
    if (uploadError) throw new Error("Storage upload failed");
    uploaded = true;
    const { data, error } = await supabase.from("private_files").insert({
      user_id: user.id, course_id: courseId || null,
      name: file.name, original_name: file.name, mime_type: "text/plain",
      size_bytes: file.size, storage_path: path, file_type: "txt", status: "uploaded",
    }).select().single();
    if (error || !data?.id) throw new Error("File record could not be saved");
    fileId = data.id;
    const chunks: string[] = [];
    // Character-bounded chunks also cap pathological single-word input.
    for (let start = 0; start < text.length; start += 3200) chunks.push(text.slice(start, start + 3200));
    const { error: chunkError } = await supabase.from("document_chunks").insert(chunks.map((chunk, index) => ({
      file_id: fileId, user_id: user.id, course_id: courseId || null,
      chunk_index: index, text: chunk, token_count: Math.ceil(chunk.length / 4),
    })));
    if (chunkError) throw new Error("Document text could not be saved");
    return NextResponse.json({
      ...data, file_name: data.original_name, file_type: data.mime_type, file_size: data.size_bytes,
      processing_status: "uploaded", chunk_count: chunks.length, indexed: false,
      message: "TXT stored. Search indexing and AI processing have not been run.",
    }, { status: 201 });
  } catch {
    // Do not report a failed state as persisted unless the update actually succeeds.
    let failureRecorded = false;
    let cleanupRequired = uploaded;
    if (fileId) {
      try {
        const { data, error } = await supabase.from("private_files")
          .update({ status: "failed", processing_error: "Document text persistence failed" })
          .eq("id", fileId).eq("user_id", user.id).select("id").single();
        failureRecorded = !error && !!data;
      } catch { /* Report the unconfirmed failure state below. */ }
    } else if (uploaded) {
      try {
        const { error } = await storage.remove([path]);
        cleanupRequired = !!error;
      } catch { /* Report that cleanup is still needed. */ }
    }
    return NextResponse.json({
      error: "Upload did not complete. No searchable document was created.",
      file_id: fileId, failure_recorded: failureRecorded, cleanup_required: cleanupRequired,
    }, { status: 500 });
  }
}
