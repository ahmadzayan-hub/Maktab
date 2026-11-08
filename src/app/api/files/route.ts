import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/db/supabase-server";
import { runIngestion } from "@/lib/ingest/runtime";
import { documentKind } from "@/lib/ingest/extract";
import { demoReturn } from "@/lib/demo";

export async function GET() {
  const demo = demoReturn("files"); if (demo) return demo;
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabase
    .from("private_files")
    .select("*, courses(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const files = (data || []).map((f: any) => ({ ...f, course_name: f.courses?.name }));
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    return NextResponse.json({ id: `file-${Date.now()}`, user_id: "demo-user", file_name: file?.name ?? "demo.pdf", file_type: file?.type ?? "application/pdf", file_size: file?.size ?? 0, processing_status: "ready", chunk_count: 10, created_at: new Date().toISOString() }, { status: 201 });
  }
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const courseId = formData.get("course_id") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

  if (!documentKind(file.type, file.name)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("private-files")
    .upload(path, bytes, { contentType: file.type });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Create DB record
  const { data, error } = await supabase
    .from("private_files")
    .insert({
      user_id: user.id,
      course_id: courseId || null,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: path,
      processing_status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Start processing. The row is durable (`pending`) before this runs, so a
  // crash here leaves a retryable file, not a lost one; POST /api/files/[id]/reprocess
  // re-claims it. There is no queue yet: see README "Ingestion".
  void runIngestion({
    fileId: data.id,
    userId: user.id,
    courseId: courseId || null,
    storagePath: path,
    mimeType: file.type,
    fileName: file.name,
  }).catch((err) => console.error("[ingest] unexpected error", err));

  return NextResponse.json(data, { status: 201 });
}
