// Service-client adapter for the fenced ingestion RPCs in migration 0005.
// Ownership checks and publication must stay in PostgreSQL: a client-side
// check followed by delete/insert would race with a later reclaim.
import type { IngestStore } from "./process";

type Result = { data: unknown; error: { message: string } | null };
export interface IngestClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
}

function throwIf(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createIngestStore(client: IngestClient): IngestStore {
  return {
    async claim(fileId) {
      const { data, error } = await client.rpc("claim_file_ingestion", { p_file_id: fileId });
      throwIf(error, "claim");
      return typeof data === "string" && data.length > 0 ? data : null;
    },

    async publish(fileId, attemptId, rows, pageCount) {
      // One RPC transaction replaces the complete set, including files larger
      // than the former 50-row batch size. Never fall back to unguarded writes.
      const { data, error } = await client.rpc("publish_file_ingestion", {
        p_file_id: fileId,
        p_attempt_id: attemptId,
        p_chunks: rows.map((r) => ({
          chunk_index: r.chunk_index,
          text: r.text,
          token_count: r.token_count,
          page_num: r.page_num,
          slide_num: r.slide_num,
          embedding: r.embedding,
        })),
        p_page_count: pageCount,
      });
      throwIf(error, "publish chunks");
      return data === true;
    },

    async markFailed(fileId, attemptId, message) {
      const { data, error } = await client.rpc("fail_file_ingestion", {
        p_file_id: fileId,
        p_attempt_id: attemptId,
        p_message: message,
      });
      throwIf(error, "mark failed");
      return data === true;
    },
  };
}
