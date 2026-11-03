// Supabase-backed IngestStore. Uses the service client because processing
// runs outside the uploading user's request. Every transition is a single
// conditional UPDATE so two workers cannot both own a file.
import type { IngestStore, ChunkRow } from "./process";

/** How long a `processing` row may sit before it is treated as abandoned. */
export const STALE_PROCESSING_MS = 15 * 60 * 1000;
const INSERT_BATCH = 50;

// Structural type: enough of the Supabase query builder for this store,
// so the module does not depend on generated database types.
type Result<T = unknown> = { data: T | null; error: { message: string } | null };
export interface IngestClient {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        or(filters: string): { select(columns: string): PromiseLike<Result<unknown[]>> };
      } & PromiseLike<Result>;
    };
    delete(): { eq(column: string, value: unknown): PromiseLike<Result> };
    insert(rows: Record<string, unknown>[]): PromiseLike<Result>;
  };
}

function throwIf(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createIngestStore(client: IngestClient, now: () => Date = () => new Date()): IngestStore {
  return {
    async claim(fileId) {
      const staleBefore = new Date(now().getTime() - STALE_PROCESSING_MS).toISOString();
      const { data, error } = await client
        .from("private_files")
        .update({ processing_status: "processing", processing_error: null, processing_started_at: now().toISOString() })
        .eq("id", fileId)
        .or(`processing_status.in.(pending,failed),and(processing_status.eq.processing,processing_started_at.lt.${staleBefore})`)
        .select("id");
      throwIf(error, "claim");
      return Array.isArray(data) && data.length === 1;
    },

    async replaceChunks(fileId, rows: ChunkRow[]) {
      const del = await client.from("document_chunks").delete().eq("file_id", fileId);
      throwIf(del.error, "delete old chunks");
      for (let i = 0; i < rows.length; i += INSERT_BATCH) {
        const batch = rows.slice(i, i + INSERT_BATCH).map((r) => ({
          file_id: r.file_id,
          user_id: r.user_id,
          course_id: r.course_id,
          chunk_index: r.chunk_index,
          text: r.text,
          token_count: r.token_count,
          page_num: r.page_num,
          slide_num: r.slide_num,
          embedding: r.embedding,
        }));
        const ins = await client.from("document_chunks").insert(batch);
        throwIf(ins.error, "insert chunks");
      }
    },

    async markReady(fileId, info) {
      const { error } = await client
        .from("private_files")
        .update({
          processing_status: "ready",
          processing_error: null,
          chunk_count: info.chunk_count,
          page_count: info.page_count,
          processed_at: now().toISOString(),
        })
        .eq("id", fileId);
      throwIf(error, "mark ready");
    },

    async markFailed(fileId, message) {
      const { error } = await client
        .from("private_files")
        .update({ processing_status: "failed", processing_error: message, processed_at: now().toISOString() })
        .eq("id", fileId);
      throwIf(error, "mark failed");
    },
  };
}
