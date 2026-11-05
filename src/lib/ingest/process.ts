// Durable ingestion of one private file: claim -> download -> extract ->
// chunk -> embed -> atomically publish chunks + ready, with failures recorded on
// the file row. All side effects go through injected dependencies so the
// whole path is unit-testable without Supabase or an embedding provider.
import { chunkUnits, type Chunk, type ChunkOptions } from "./chunk";
import { extractDocument, type ExtractedDocument } from "./extract";

export interface IngestJob {
  fileId: string;
  userId: string;
  courseId: string | null;
  storagePath: string;
  mimeType: string;
  fileName: string;
}

export interface ChunkRow extends Chunk {
  file_id: string;
  user_id: string;
  course_id: string | null;
  embedding: number[];
}

export interface IngestStore {
  /**
   * Atomically move the file to `processing` and return its new attempt ID.
   * Returns null when unclaimable. Each successful reclaim invalidates all
   * earlier attempts, including workers still extracting or embedding.
   */
  claim(fileId: string): Promise<string | null>;
  /** Check ownership, replace all chunks and mark ready in one transaction. */
  publish(fileId: string, attemptId: string, rows: ChunkRow[], pageCount: number | null): Promise<boolean>;
  /** Returns false if this attempt no longer owns a processing file. */
  markFailed(fileId: string, attemptId: string, message: string): Promise<boolean>;
}

export interface IngestDeps {
  download(storagePath: string): Promise<Uint8Array>;
  embed(text: string): Promise<number[]>;
  store: IngestStore;
  /** Override for tests; defaults to the real extractor. */
  extract?: (bytes: Uint8Array, mimeType: string, fileName: string) => Promise<ExtractedDocument>;
  chunkOptions?: ChunkOptions;
}

export type IngestResult =
  | { ok: true; kind: ExtractedDocument["kind"]; chunk_count: number; page_count: number | null }
  | { ok: false; skipped: true; error: string }
  | { ok: false; skipped?: false; error: string };

export const MAX_ERROR_LENGTH = 500;

export function describeError(err: unknown): string {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return message.slice(0, MAX_ERROR_LENGTH);
}

export async function ingestFile(job: IngestJob, deps: IngestDeps): Promise<IngestResult> {
  const attemptId = await deps.store.claim(job.fileId);
  if (!attemptId) {
    return { ok: false, skipped: true, error: "File is not claimable (missing or already processing)" };
  }

  try {
    const bytes = await deps.download(job.storagePath);
    const extract = deps.extract ?? extractDocument;
    const doc = await extract(bytes, job.mimeType, job.fileName);
    const chunks = chunkUnits(doc.units, deps.chunkOptions);
    if (chunks.length === 0) throw new Error("EmptyDocumentError: text too short to index");

    const rows: ChunkRow[] = [];
    for (const chunk of chunks) {
      const embedding = await deps.embed(chunk.text);
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("EmbeddingError: provider returned an empty vector");
      }
      rows.push({ ...chunk, file_id: job.fileId, user_id: job.userId, course_id: job.courseId, embedding });
    }

    const published = await deps.store.publish(job.fileId, attemptId, rows, doc.page_count);
    if (!published) {
      return { ok: false, skipped: true, error: "Ingestion attempt no longer owns the file" };
    }
    return { ok: true, kind: doc.kind, chunk_count: rows.length, page_count: doc.page_count };
  } catch (err) {
    const error = describeError(err);
    const recorded = await deps.store.markFailed(job.fileId, attemptId, error);
    if (!recorded) {
      return { ok: false, skipped: true, error: "Ingestion attempt no longer owns the file" };
    }
    return { ok: false, error };
  }
}
