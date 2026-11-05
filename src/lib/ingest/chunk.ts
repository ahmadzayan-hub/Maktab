// Word-window chunking that keeps each chunk's source page or slide.
import type { TextUnit } from "./extract";

export interface Chunk {
  chunk_index: number;
  text: string;
  page_num: number | null;
  slide_num: number | null;
  token_count: number;
}

export interface ChunkOptions {
  /** Words per chunk. */
  chunkWords?: number;
  /** Words shared between consecutive chunks of the same unit. */
  overlapWords?: number;
  /** Chunks shorter than this (in characters) are dropped as noise. */
  minChars?: number;
}

export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  chunkWords: 800,
  overlapWords: 100,
  minChars: 50,
};

/** Rough token estimate used for budgeting; four characters per token. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split each unit into overlapping word windows. A chunk never spans two
 * units, so its page/slide reference is exact. Indices are sequential across
 * the whole document.
 */
export function chunkUnits(units: TextUnit[], options: ChunkOptions = {}): Chunk[] {
  const { chunkWords, overlapWords, minChars } = { ...DEFAULT_CHUNK_OPTIONS, ...options };
  if (chunkWords <= 0) throw new Error("chunkWords must be positive");
  if (overlapWords < 0 || overlapWords >= chunkWords) throw new Error("overlapWords must be in [0, chunkWords)");

  const chunks: Chunk[] = [];
  for (const unit of units) {
    const words = unit.text.split(/\s+/).filter(Boolean);
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkWords, words.length);
      const text = words.slice(start, end).join(" ");
      if (text.length >= minChars) {
        chunks.push({
          chunk_index: chunks.length,
          text,
          page_num: unit.page_num,
          slide_num: unit.slide_num,
          token_count: estimateTokens(text),
        });
      }
      if (end === words.length) break;
      start = end - overlapWords;
    }
  }
  return chunks;
}
