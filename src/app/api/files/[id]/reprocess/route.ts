import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/db/supabase-server";
import { runIngestion } from "@/lib/ingest/runtime";

/**
 * Re-run extraction and indexing for one of the caller's files. The claim
 * inside the pipeline refuses a file another worker is still processing,
 * which surfaces here as 409.
 */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json({ id: params.id, processing_status: "ready", demo: true }, { status: 202 });
  }
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: file } = await supabase
    .from("private_files")
    .select("id, user_id, course_id, storage_path, file_type, file_name")
    .eq("id", params.id)
    .single();
  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!file.storage_path) {
    return NextResponse.json({ error: "File has no stored object" }, { status: 422 });
  }

  const job = {
    fileId: file.id,
    userId: user.id,
    courseId: file.course_id ?? null,
    storagePath: file.storage_path,
    mimeType: file.file_type ?? "",
    fileName: file.file_name ?? "",
  };

  // Run in the background; the client polls GET /api/files for the outcome.
  const started = runIngestion(job).catch((err) => {
    console.error("[ingest] unexpected error", err);
    return { ok: false as const, error: String(err) };
  });
  // Surface an immediate refusal (not claimable) without waiting for extraction.
  const first = await Promise.race([started, new Promise<null>((r) => setTimeout(() => r(null), 250))]);
  if (first && !first.ok && "skipped" in first && first.skipped) {
    return NextResponse.json({ error: first.error }, { status: 409 });
  }
  return NextResponse.json({ id: file.id, processing_status: "processing" }, { status: 202 });
}
