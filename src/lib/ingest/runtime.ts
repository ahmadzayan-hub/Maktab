// Wires the ingestion pipeline to the real storage, database and embedding
// provider. Kept apart from process.ts so tests never touch these.
import { createServiceClient } from "@/lib/db/supabase-server";
import { getEmbedding } from "@/lib/ai/client";
import { ingestFile, type IngestJob, type IngestResult } from "./process";
import { createIngestStore, type IngestClient } from "./supabase-store";

export const PRIVATE_FILES_BUCKET = "private-files";

export async function runIngestion(job: IngestJob): Promise<IngestResult> {
  const admin = createServiceClient();
  const result = await ingestFile(job, {
    async download(path) {
      const { data, error } = await admin.storage.from(PRIVATE_FILES_BUCKET).download(path);
      if (error || !data) throw new Error(`DownloadError: ${error?.message ?? "no data"}`);
      return new Uint8Array(await data.arrayBuffer());
    },
    embed: getEmbedding,
    store: createIngestStore(admin as unknown as IngestClient),
  });
  if (!result.ok && !result.skipped) console.error(`[ingest] file ${job.fileId} failed: ${result.error}`);
  return result;
}
