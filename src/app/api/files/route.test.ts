import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), demoReturn: vi.fn() }));
vi.mock("@/lib/db/supabase-server", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/demo", () => ({ demoReturn: mocks.demoReturn }));
import { GET, POST } from "./route";

// Pure synthetic database/storage adapter: no project, key, network or AI provider.
function database(fail = "") {
  const writes: Array<{ table: string; operation: string; value: any }> = [];
  const upload = vi.fn().mockResolvedValue({ error: fail === "upload" ? {} : null });
  const remove = vi.fn().mockResolvedValue({ error: fail === "cleanup" ? {} : null });
  const from = vi.fn((table: string) => {
    let operation = "select";
    let value: any;
    const result = () => {
      const error = fail === `${table}:${operation}` || (fail === "failure-update" && (table === "document_chunks" || operation === "update"));
      return {
        error: error ? { message: "synthetic failure" } : null,
        data: error ? null : table === "private_files" ? { id: "file-id", ...value } : { id: "course-id" },
      };
    };
    const chain: any = {
      insert: (payload: any) => { operation = "insert"; value = payload; writes.push({ table, operation, value }); return chain; },
      update: (payload: any) => { operation = "update"; value = payload; writes.push({ table, operation, value }); return chain; },
      select: () => chain, eq: () => chain,
      single: async () => result(),
      order: async () => ({ data: [{ original_name: "a.txt", mime_type: "text/plain", size_bytes: 4, status: "uploaded", document_chunks: [{ count: 1 }] }], error: fail === "list" ? { message: "private backend detail" } : null }),
      then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
    };
    return chain;
  });
  const supabase = { from, storage: { from: vi.fn(() => ({ upload, remove })) } };
  mocks.requireUser.mockResolvedValue({ user: { id: "user-id" }, supabase, unauthorized: null });
  return { writes, from, upload, remove };
}
function request(content: BlobPart = "Short notes", name = "notes.txt", type = "text/plain", course?: string) {
  const body = new FormData();
  body.set("file", new Blob([content], { type }), name);
  if (course !== undefined) body.set("course_id", course);
  return new NextRequest("http://localhost/api/files", { method: "POST", body });
}

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false"); });

describe("file ingestion fails closed", () => {
  it("sanitizes file-list backend errors", async () => {
    database("list"); const response = await GET(); expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Files could not be loaded" });
  });
  it("never fabricates a demo upload", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    const response = await POST(request());
    expect(response.status).toBe(422);
    expect(await response.json()).not.toHaveProperty("id");
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });
  it.each([
    ["paper.pdf", "application/pdf"],
    ["notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["paper.pdf", "text/plain"],
  ])("rejects unsupported %s without persistence", async (name, type) => {
    const db = database();
    expect((await POST(request("binary", name, type))).status).toBe(422);
    expect(db.upload).not.toHaveBeenCalled(); expect(db.from).not.toHaveBeenCalled();
  });
  it.each(["", " \n\t", "hello\u0000world", "%PDF-1.7", new Uint8Array([255, 254])])("rejects empty, binary or invalid UTF-8", async (content) => {
    const db = database();
    expect((await POST(request(content))).status).toBe(422);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    const db = database();
    mocks.requireUser.mockResolvedValue({ unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    expect((await POST(request())).status).toBe(401);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("rejects a string file field and malformed multipart", async () => {
    database();
    const body = new FormData(); body.set("file", "fake.txt");
    expect((await POST(new NextRequest("http://localhost/api/files", { method: "POST", body }))).status).toBe(400);
    expect((await POST(new NextRequest("http://localhost/api/files", { method: "POST", body: "bad" }))).status).toBe(400);
  });
  it("bounds file size and actual request stream without relying on Content-Length", async () => {
    const db = database();
    expect((await POST(request("x".repeat(1024 * 1024 + 1)))).status).toBe(422);
    const oversized = new NextRequest("http://localhost/api/files", {
      method: "POST", body: new Uint8Array(2 * 1024 * 1024),
      headers: { "content-type": "multipart/form-data; boundary=synthetic" },
    });
    expect(oversized.headers.has("content-length")).toBe(false);
    expect((await POST(oversized)).status).toBe(413);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("checks course ownership before upload", async () => {
    const db = database("courses:select");
    expect((await POST(request("notes", "notes.txt", "text/plain", "00000000-0000-0000-0000-000000000000"))).status).toBe(404);
    expect(db.upload).not.toHaveBeenCalled();
  });
  it("persists short TXT with schema-correct columns, without claiming indexed/ready", async () => {
    const db = database();
    const response = await POST(request("مرحبا notes"));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ processing_status: "uploaded", indexed: false, chunk_count: 1, file_type: "text/plain" });
    expect(db.writes[0].value).toMatchObject({ name: "notes.txt", original_name: "notes.txt", mime_type: "text/plain", file_type: "txt", status: "uploaded" });
    expect(db.writes[0].value).not.toHaveProperty("processing_status");
    expect(db.writes[1].value).toEqual([expect.objectContaining({ text: "مرحبا notes", chunk_index: 0 })]);
    expect(db.writes[1].value[0]).not.toHaveProperty("embedding");
    expect(db.writes[1].value[0]).not.toHaveProperty("content");
    expect(db.from).not.toHaveBeenCalledWith("embeddings");
  });
  it("bounds chunks even for a long single word", async () => {
    const db = database(); await POST(request("x".repeat(6401)));
    expect(db.writes[1].value.map((chunk: any) => chunk.text.length)).toEqual([3200, 3200, 1]);
  });
  it.each(["upload", "private_files:insert", "document_chunks:insert", "failure-update"])("does not swallow %s errors", async (failure) => {
    const db = database(failure);
    const response = await POST(request());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).not.toHaveProperty("processing_status", "ready");
    if (failure === "document_chunks:insert") expect(body.failure_recorded).toBe(true);
    if (failure === "failure-update") expect(body.failure_recorded).toBe(false);
    if (failure === "private_files:insert") expect(db.remove).toHaveBeenCalledOnce();
  });
  it("maps the stored schema for file listing", async () => {
    database();
    const response = await GET();
    expect(await response.json()).toEqual([expect.objectContaining({ file_name: "a.txt", file_type: "text/plain", file_size: 4, processing_status: "uploaded", chunk_count: 1, indexed: false })]);
  });
});
