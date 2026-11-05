import { describe, expect, it, vi } from "vitest";
import { createIngestStore, type IngestClient } from "./supabase-store";

function fakeClient(data: unknown = true, message?: string) {
  const rpc = vi.fn(async (_name: string, _args: Record<string, unknown>) => ({ data, error: message ? { message } : null }));
  return { client: { rpc } satisfies IngestClient, rpc };
}

const row = (i: number) => ({
  chunk_index: i, text: `chunk ${i}`, page_num: 1, slide_num: null, token_count: 3,
  file_id: "f", user_id: "u", course_id: null, embedding: [0.1, 0.2],
});

describe("createIngestStore", () => {
  it("returns the database-generated attempt token from one atomic claim RPC", async () => {
    const { client, rpc } = fakeClient("attempt-a");
    expect(await createIngestStore(client).claim("f")).toBe("attempt-a");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("claim_file_ingestion", { p_file_id: "f" });
  });

  it("reports an unclaimable file as null and propagates database errors", async () => {
    expect(await createIngestStore(fakeClient(null).client).claim("f")).toBeNull();
    await expect(createIngestStore(fakeClient(null, "claim boom").client).claim("f")).rejects.toThrow("claim: claim boom");
  });

  it("publishes all chunks and metadata with ownership in a single RPC, not independent batches", async () => {
    const { client, rpc } = fakeClient();
    const rows = Array.from({ length: 120 }, (_, i) => row(i));
    expect(await createIngestStore(client).publish("f", "attempt-a", rows, 3)).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("publish_file_ingestion", {
      p_file_id: "f", p_attempt_id: "attempt-a", p_page_count: 3,
      p_chunks: rows.map(({ file_id: _file, user_id: _user, course_id: _course, ...chunk }) => chunk),
    });
    // The RPC derives identity from the locked file instead of trusting a job.
    const args = vi.mocked(client.rpc).mock.calls[0][1];
    expect((args.p_chunks as Record<string, unknown>[])[0]).not.toHaveProperty("user_id");
  });

  it("returns false for stale publication without falling back to raw table writes", async () => {
    const { client, rpc } = fakeClient(false);
    expect(await createIngestStore(client).publish("f", "old-attempt", [row(0)], null)).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("propagates publication errors so only the owning attempt can mark failure", async () => {
    const { client } = fakeClient(null, "insert boom");
    await expect(createIngestStore(client).publish("f", "attempt-a", [row(0)], null)).rejects.toThrow("publish chunks: insert boom");
  });

  it("fences failure writes with the attempt ID and reports lost ownership", async () => {
    const { client, rpc } = fakeClient();
    expect(await createIngestStore(client).markFailed("f", "attempt-a", "empty")).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("fail_file_ingestion", {
      p_file_id: "f", p_attempt_id: "attempt-a", p_message: "empty",
    });
    expect(await createIngestStore(fakeClient(false).client).markFailed("f", "old", "late error")).toBe(false);
  });

  it("propagates failure-recording errors", async () => {
    await expect(createIngestStore(fakeClient(null, "offline").client).markFailed("f", "a", "error"))
      .rejects.toThrow("mark failed: offline");
  });
});
