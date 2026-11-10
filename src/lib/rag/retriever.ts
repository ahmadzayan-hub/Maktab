import { getEmbedding } from "@/lib/ai/client";
import { createClient } from "@/lib/db/supabase-server";
import type { CitationLabel } from "./citation-label";

export interface RetrievedChunk {
  chunk_id: string;
  file_id: string;
  text: string;
  page_num: number | null;
  similarity: number;
}

export interface Citation extends CitationLabel {
  source_number: number;
  file_id: string;
  chunk_id: string;
  page_num: number | null;
  chunk_text: string;
}

export async function retrieveChunks(
  query: string,
  userId: string,
  courseId?: string | null,
  topK = 8
): Promise<RetrievedChunk[]> {
  const embedding = await getEmbedding(query);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_user_id: userId,
    match_course_id: courseId ?? null,
    match_count: topK,
    match_threshold: 0.65,
  });

  if (error) throw error;
  return data ?? [];
}

export function buildContext(chunks: RetrievedChunk[], fileNames: Map<string, string>): string {
  return chunks
    .map((c, i) => {
      const name = fileNames.get(c.file_id) ?? "Unknown file";
      const pageRef = c.page_num ? `, page ${c.page_num}` : "";
      return `[Source ${i + 1}: ${name}${pageRef}]\n${c.text}`;
    })
    .join("\n\n---\n\n");
}

export function extractCitations(chunks: RetrievedChunk[], fileNames: Map<string, string>): Citation[] {
  // buildContext numbers every excerpt. Deduplicating by file/page here
  // discards sources and breaks that mapping, especially for unpaginated files.
  return chunks
    .map((c, i) => ({
      source_number: i + 1,
      file_id: c.file_id,
      chunk_id: c.chunk_id,
      file_name: fileNames.get(c.file_id) ?? "Unknown file",
      page_num: c.page_num,
      chunk_text: c.text.slice(0, 200),
    }));
}
