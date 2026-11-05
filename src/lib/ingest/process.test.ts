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
    claim: vi.fn(async () => { calls.push("claim"); return "attempt-1"; }),
    publish: vi.fn(async (_id, _attempt, rows) => { calls.push("publish"); chunks = rows; return true; }),
    markFailed: vi.fn(async () => { calls.push("markFailed"); return true; }),
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
  it("claims and publishes chunks, page refs and ready together with its attempt ID", async () => {
    const f = fakeStore();
    const result = await ingestFile(job, deps(f.store));
    expect(result).toEqual({ ok: true, kind: "pdf", chunk_count: 3, page_count: 2 });
    expect(f.calls).toEqual(["claim", "publish"]);
    const rows = f.chunks();
    expect(rows.map((r) => r.page_num)).toEqual([1, 1, 2]);
    expect(rows.map((r) => r.chunk_index)).toEqual([0, 1, 2]);
    expect(rows.every((r) => r.file_id === "file-1" && r.user_id === "user-1" && r.course_id === "course-1")).toBe(true);
    expect(rows.every((r) => r.embedding.length === 3)).toBe(true);
    expect(f.store.publish).toHaveBeenCalledWith("file-1", "attempt-1", rows, 2);
  });

  it("does nothing when the file cannot be claimed", async () => {
    const f = fakeStore({ claim: vi.fn(async () => null) });
    const d = deps(f.store);
    const result = await ingestFile(job, d);
    expect(result).toMatchObject({ ok: false, skipped: true });
    expect(d.download).not.toHaveBeenCalled();
    expect(f.store.publish).not.toHaveBeenCalled();
    expect(f.store.markFailed).not.toHaveBeenCalled();
  });

  it("records an embedding failure and never marks the file ready", async () => {
    const f = fakeStore();
    const d = deps(f.store, { embed: vi.fn(async () => { throw new Error("quota exceeded"); }) });
    const result = await ingestFile(job, d);
    expect(result).toMatchObject({ ok: false, error: "Error: quota exceeded" });
    expect(f.calls).toEqual(["claim", "markFailed"]);
    expect(f.store.markFailed).toHaveBeenCalledWith("file-1", "attempt-1", "Error: quota exceeded");
  });

  it("rejects an empty embedding vector", async () => {
    const f = fakeStore();
    const result = await ingestFile(job, deps(f.store, { embed: vi.fn(async () => []) }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("EmbeddingError") });
    expect(f.store.publish).not.toHaveBeenCalled();
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
    expect(g.store.publish).not.toHaveBeenCalled();
  });

  it("marks failed when the chunk write itself fails, with a bounded message", async () => {
    const f = fakeStore({ publish: vi.fn(async () => { throw new Error("x".repeat(2000)); }) });
    const result = await ingestFile(job, deps(f.store));
    expect(result.ok).toBe(false);
    expect((f.store.markFailed as ReturnType<typeof vi.fn>).mock.calls[0][2]).toHaveLength(500);
  });

  it("reports lost publication ownership as skipped without a failure write", async () => {
    const f = fakeStore({ publish: vi.fn(async () => false) });
    expect(await ingestFile(job, deps(f.store))).toMatchObject({ ok: false, skipped: true });
    expect(f.store.markFailed).not.toHaveBeenCalled();
  });

  it("reports lost failure ownership as skipped", async () => {
    const f = fakeStore({ markFailed: vi.fn(async () => false) });
    const d = deps(f.store, { embed: vi.fn(async () => { throw new Error("late failure"); }) });
    expect(await ingestFile(job, d)).toMatchObject({ ok: false, skipped: true });
    expect(f.store.markFailed).toHaveBeenCalledWith("file-1", "attempt-1", "Error: late failure");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Model the fenced store contract; actual row locking is tested in tests/ingestion. */
function fencingStore() {
  let now = 0;
  let started = 0;
  let generation = 0;
  let attempt: string | null = null;
  let status = "pending";
  let chunks: ChunkRow[] = [];
  let error: string | null = null;
  const owns = (id: string) => status === "processing" && attempt === id;
  const store: IngestStore = {
    async claim() {
      if (status !== "pending" && status !== "failed" && !(status === "processing" && now - started > 900_000)) return null;
      attempt = `attempt-${++generation}`;
      status = "processing";
      started = now;
      error = null;
      return attempt;
    },
    async publish(_file, id, rows) {
      if (!owns(id)) return false;
      chunks = rows;
      status = "ready";
      return true;
    },
    async markFailed(_file, id, message) {
      if (!owns(id)) return false;
      error = message;
      status = "failed";
      return true;
    },
  };
  return { store, advance: (ms: number) => { now += ms; }, snapshot: () => ({ status, attempt, chunks, error }) };
}

describe("overlapping ingestion attempts", () => {
  it("refuses a second worker before expiry without downloading or embedding", async () => {
    const f = fencingStore();
    const entered = deferred<void>();
    const download = deferred<Uint8Array>();
    const first = ingestFile(job, deps(f.store, { download: async () => { entered.resolve(); return download.promise; } }));
    await entered.promise;
    f.advance(900_000);
    const secondDeps = deps(f.store);
    expect(await ingestFile(job, secondDeps)).toMatchObject({ ok: false, skipped: true });
    expect(secondDeps.download).not.toHaveBeenCalled();
    expect(secondDeps.embed).not.toHaveBeenCalled();
    download.resolve(new Uint8Array([1]));
    expect(await first).toMatchObject({ ok: true });
  });

  for (const oldFails of [false, true]) {
    for (const newerFinished of [false, true]) {
      it(`fences old ${oldFails ? "failure" : "success"} while newer attempt is ${newerFinished ? "ready" : "processing"}`, async () => {
        const f = fencingStore();
        const oldEntered = deferred<void>();
        const oldEmbedding = deferred<number[]>();
        const old = ingestFile(job, deps(f.store, {
          embed: async () => { oldEntered.resolve(); return oldEmbedding.promise; },
        }));
        await oldEntered.promise;
        f.advance(900_001);

        const newerEntered = deferred<void>();
        const newerDownload = deferred<Uint8Array>();
        const newer = ingestFile(job, deps(f.store, {
          download: async () => { newerEntered.resolve(); return newerDownload.promise; },
          embed: async () => [22, 22, 22],
        }));
        await newerEntered.promise;
        if (newerFinished) {
          newerDownload.resolve(new Uint8Array([2]));
          expect(await newer).toMatchObject({ ok: true });
        }
        const before = f.snapshot();
        if (oldFails) oldEmbedding.reject(new Error("old provider failed late"));
        else oldEmbedding.resolve([11, 11, 11]);
        expect(await old).toMatchObject({ ok: false, skipped: true });
        expect(f.snapshot()).toEqual(before);

        if (!newerFinished) {
          newerDownload.resolve(new Uint8Array([2]));
          expect(await newer).toMatchObject({ ok: true });
        }
        expect(f.snapshot()).toMatchObject({ status: "ready", attempt: "attempt-2", error: null });
        expect(f.snapshot().chunks.every((r) => r.embedding[0] === 22)).toBe(true);
      });
    }
  }
});
