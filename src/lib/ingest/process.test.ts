import { describe, expect, it, vi } from "vitest";
import { ingestFile, type ChunkRow, type IngestDeps, type IngestJob, type IngestStore } from "./process";
import type { ExtractedDocument } from "./extract";

const job: IngestJob = {
  fileId: "file-1",
  userId: "user-1",
  courseId: "course-1",
  storagePath: "user-1/lecture.pdf",
  mimeType: "application/pdf",
  fileName: "lecture.pdf",
};

const longText = (n: number) => Array.from({ length: n }, (_, i) => `token${i}`).join(" ");

function fakeStore(overrides: Partial<IngestStore> = {}) {
  const calls: string[] = [];
  let chunks: ChunkRow[] = [];
  const store: IngestStore = {
    claim: vi.fn(async () => { calls.push("claim"); return true; }),
    replaceChunks: vi.fn(async (_id, rows) => { calls.push("replaceChunks"); chunks = rows; }),
    markReady: vi.fn(async () => { calls.push("markReady"); }),
    markFailed: vi.fn(async () => { calls.push("markFailed"); }),
    ...overrides,
  };
  return { store, calls, chunks: () => chunks };
}

function deps(store: IngestStore, extra: Partial<IngestDeps> = {}): IngestDeps {
  const doc: ExtractedDocument = {
    kind: "pdf",
    units: [
      { text: longText(120), page_num: 1, slide_num: null },
      { text: longText(90), page_num: 2, slide_num: null },
    ],
    text: "",
    page_count: 2,
  };
  return {
    download: vi.fn(async () => new Uint8Array([1, 2, 3])),
    embed: vi.fn(async (t: string) => [t.length, 1, 2]),
    store,
    extract: vi.fn(async () => doc),
    chunkOptions: { chunkWords: 100, overlapWords: 10, minChars: 10 },
    ...extra,
  };
}

describe("ingestFile", () => {
  it("claims, replaces chunks with page refs and embeddings, then marks ready", async () => {
    const f = fakeStore();
    const result = await ingestFile(job, deps(f.store));
    expect(result).toEqual({ ok: true, kind: "pdf", chunk_count: 3, page_count: 2 });
    expect(f.calls).toEqual(["claim", "replaceChunks", "markReady"]);
    const rows = f.chunks();
    expect(rows.map((r) => r.page_num)).toEqual([1, 1, 2]);
    expect(rows.map((r) => r.chunk_index)).toEqual([0, 1, 2]);
    expect(rows.every((r) => r.file_id === "file-1" && r.user_id === "user-1" && r.course_id === "course-1")).toBe(true);
    expect(rows.every((r) => r.embedding.length === 3)).toBe(true);
    expect(f.store.markReady).toHaveBeenCalledWith("file-1", { chunk_count: 3, page_count: 2 });
  });

  it("does nothing when the file cannot be claimed", async () => {
    const f = fakeStore({ claim: vi.fn(async () => false) });
    const d = deps(f.store);
    const result = await ingestFile(job, d);
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(d.download).not.toHaveBeenCalled();
    expect(f.store.replaceChunks).not.toHaveBeenCalled();
    expect(f.store.markReady).not.toHaveBeenCalled();
    expect(f.store.markFailed).not.toHaveBeenCalled();
  });

  it("records an embedding failure and never marks the file ready", async () => {
    const f = fakeStore();
    const d = deps(f.store, { embed: vi.fn(async () => { throw new Error("quota exceeded"); }) });
    const result = await ingestFile(job, d);
    expect(result).toMatchObject({ ok: false, error: "Error: quota exceeded" });
    expect(f.calls).toEqual(["claim", "markFailed"]);
  });

  it("rejects an empty embedding vector", async () => {
    const f = fakeStore();
    const result = await ingestFile(job, deps(f.store, { embed: vi.fn(async () => []) }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("EmbeddingError") });
    expect(f.store.replaceChunks).not.toHaveBeenCalled();
  });

  it("fails cleanly on an unsupported or empty document", async () => {
    const f = fakeStore();
    const unsupported = await ingestFile(job, deps(f.store, { extract: undefined, download: vi.fn(async () => new Uint8Array()) }));
    // Real extractor with a pdf mime type but zero bytes: must fail, not hang or throw out.
    expect(unsupported.ok).toBe(false);
    expect(f.store.markFailed).toHaveBeenCalledTimes(1);

    const g = fakeStore();
    const empty = await ingestFile(job, deps(g.store, {
      extract: vi.fn(async () => ({ kind: "txt" as const, units: [{ text: "tiny", page_num: null, slide_num: null }], text: "tiny", page_count: null })),
    }));
    expect(empty).toMatchObject({ ok: false, error: expect.stringContaining("EmptyDocumentError") });
    expect(g.store.replaceChunks).not.toHaveBeenCalled();
  });

  it("marks failed when the chunk write itself fails, with a bounded message", async () => {
    const f = fakeStore({ replaceChunks: vi.fn(async () => { throw new Error("x".repeat(2000)); }) });
    const result = await ingestFile(job, deps(f.store));
    expect(result.ok).toBe(false);
    expect((f.store.markFailed as ReturnType<typeof vi.fn>).mock.calls[0][1]).toHaveLength(500);
    expect(f.store.markReady).not.toHaveBeenCalled();
  });
});
