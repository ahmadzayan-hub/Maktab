import { describe, expect, it } from "vitest";
import { createIngestStore, STALE_PROCESSING_MS, type IngestClient } from "./supabase-store";

type Call = { table: string; op: string; args: unknown[] };

/** Records every builder call; `claimRows` controls what the claim UPDATE returns. */
function fakeClient(claimRows: unknown[] = [{ id: "f" }], failOn?: string) {
  const calls: Call[] = [];
  const result = (op: string) => (failOn === op ? { data: null, error: { message: `${op} boom` } } : { data: null, error: null });
  const client: IngestClient = {
    from(table) {
      return {
        update(values) {
          calls.push({ table, op: "update", args: [values] });
          const thenable = { then: (res: (v: unknown) => unknown) => Promise.resolve(result("update")).then(res) };
          return {
            eq(column, value) {
              calls.push({ table, op: "eq", args: [column, value] });
              return Object.assign(
                {
                  or(filters: string) {
                    calls.push({ table, op: "or", args: [filters] });
                    return { select: () => Promise.resolve(failOn === "claim" ? { data: null, error: { message: "claim boom" } } : { data: claimRows, error: null }) };
                  },
                },
                thenable,
              ) as never;
            },
          };
        },
        delete() {
          return { eq: (column, value) => { calls.push({ table, op: "delete", args: [column, value] }); return Promise.resolve(result("delete")); } };
        },
        insert(rows) {
          calls.push({ table, op: "insert", args: [rows] });
          return Promise.resolve(result("insert"));
        },
      };
    },
  };
  return { client, calls };
}

const row = (i: number) => ({
  chunk_index: i, text: `chunk ${i}`, page_num: 1, slide_num: null, token_count: 3,
  file_id: "f", user_id: "u", course_id: null, embedding: [0.1, 0.2],
});

describe("createIngestStore", () => {
  it("claims only pending, failed or stale processing rows in one conditional update", async () => {
    const now = new Date("2026-11-03T12:00:00Z");
    const { client, calls } = fakeClient();
    const store = createIngestStore(client, () => now);
    expect(await store.claim("f")).toBe(true);
    const update = calls.find((c) => c.op === "update")!;
    expect(update.args[0]).toMatchObject({ processing_status: "processing", processing_error: null, processing_started_at: now.toISOString() });
    const or = calls.find((c) => c.op === "or")!.args[0] as string;
    expect(or).toContain("processing_status.in.(pending,failed)");
    expect(or).toContain(`processing_started_at.lt.${new Date(now.getTime() - STALE_PROCESSING_MS).toISOString()}`);
  });

  it("reports an unclaimable file as false and a database error as a throw", async () => {
    expect(await createIngestStore(fakeClient([]).client).claim("f")).toBe(false);
    await expect(createIngestStore(fakeClient([], "claim").client).claim("f")).rejects.toThrow("claim: claim boom");
  });

  it("replaces chunks by deleting the file's old rows, then inserting in batches of 50", async () => {
    const { client, calls } = fakeClient();
    const rows = Array.from({ length: 120 }, (_, i) => row(i));
    await createIngestStore(client).replaceChunks("f", rows);
    expect(calls[0]).toMatchObject({ table: "document_chunks", op: "delete", args: ["file_id", "f"] });
    const inserts = calls.filter((c) => c.op === "insert");
    expect(inserts.map((c) => (c.args[0] as unknown[]).length)).toEqual([50, 50, 20]);
    const first = (inserts[0].args[0] as Record<string, unknown>[])[0];
    expect(Object.keys(first).sort()).toEqual(["chunk_index", "course_id", "embedding", "file_id", "page_num", "slide_num", "text", "token_count", "user_id"]);
  });

  it("propagates insert failures so the pipeline marks the file failed", async () => {
    const { client } = fakeClient([], "insert");
    await expect(createIngestStore(client).replaceChunks("f", [row(0)])).rejects.toThrow("insert chunks: insert boom");
  });

  it("writes ready and failed states with timestamps", async () => {
    const now = new Date("2026-11-03T12:05:00Z");
    const { client, calls } = fakeClient();
    const store = createIngestStore(client, () => now);
    await store.markReady("f", { chunk_count: 7, page_count: 3 });
    await store.markFailed("f", "EmptyDocumentError: nothing");
    const updates = calls.filter((c) => c.op === "update").map((c) => c.args[0]);
    expect(updates[0]).toEqual({ processing_status: "ready", processing_error: null, chunk_count: 7, page_count: 3, processed_at: now.toISOString() });
    expect(updates[1]).toEqual({ processing_status: "failed", processing_error: "EmptyDocumentError: nothing", processed_at: now.toISOString() });
  });
});
