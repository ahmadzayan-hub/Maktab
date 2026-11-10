import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/client", () => ({ getEmbedding: vi.fn(() => { throw new Error("No provider calls in citation tests"); }) }));
vi.mock("@/lib/db/supabase-server", () => ({ createClient: vi.fn(() => { throw new Error("No database calls in citation tests"); }) }));
import { buildContext, extractCitations, type RetrievedChunk } from "./retriever";

const names = new Map([["file-a", "Finance.pdf"], ["file-b", "Strategy.pdf"]]);
const chunk = (id: string, file: string, page: number | null, text: string): RetrievedChunk => ({
  chunk_id: id, file_id: file, page_num: page, text, similarity: 0.9,
});

describe("tutor source numbering", () => {
  it("keeps distinct excerpts from the same page aligned with every prompt source", () => {
    const chunks = [
      chunk("a-1", "file-a", 7, "First half of a long page"),
      chunk("a-2", "file-a", 7, "Second half with the answer"),
      chunk("b-1", "file-b", 2, "Another document"),
    ];
    expect(buildContext(chunks, names)).toBe(
      "[Source 1: Finance.pdf, page 7]\nFirst half of a long page\n\n---\n\n" +
      "[Source 2: Finance.pdf, page 7]\nSecond half with the answer\n\n---\n\n" +
      "[Source 3: Strategy.pdf, page 2]\nAnother document",
    );
    expect(extractCitations(chunks, names)).toEqual([
      { source_number: 1, file_id: "file-a", chunk_id: "a-1", file_name: "Finance.pdf", page_num: 7, chunk_text: "First half of a long page" },
      { source_number: 2, file_id: "file-a", chunk_id: "a-2", file_name: "Finance.pdf", page_num: 7, chunk_text: "Second half with the answer" },
      { source_number: 3, file_id: "file-b", chunk_id: "b-1", file_name: "Strategy.pdf", page_num: 2, chunk_text: "Another document" },
    ]);
  });

  it("retains separate unpaginated excerpts instead of collapsing the whole document", () => {
    const chunks = [chunk("txt-1", "notes", null, "First note"), chunk("txt-2", "notes", null, "Second note")];
    const context = buildContext(chunks, new Map());
    expect(context).toContain("[Source 2: Unknown file]\nSecond note");
    expect(extractCitations(chunks, new Map())).toMatchObject([
      { source_number: 1, page_num: null, chunk_text: "First note" },
      { source_number: 2, page_num: null, chunk_text: "Second note" },
    ]);
  });

  it("does not reorder source numbers by filename, page or duplicate display name", () => {
    const chunks = [chunk("b", "file-b", 5, "B"), chunk("a", "file-a", 1, "A")];
    const sameName = new Map([["file-a", "Lecture.pdf"], ["file-b", "Lecture.pdf"]]);
    expect(extractCitations(chunks, sameName)).toMatchObject([
      { source_number: 1, file_id: "file-b", chunk_id: "b", page_num: 5 },
      { source_number: 2, file_id: "file-a", chunk_id: "a", page_num: 1 },
    ]);
  });

  it("keeps the stored excerpt bounded without shortening the model context", () => {
    const text = "Synthetic text. ".repeat(40);
    const chunks = [chunk("long", "file-a", 1, text)];
    expect(extractCitations(chunks, names)[0].chunk_text).toBe(text.slice(0, 200));
    expect(buildContext(chunks, names)).toContain(text);
  });

  it("does not invent citations when retrieval is empty", () => {
    expect(buildContext([], names)).toBe("");
    expect(extractCitations([], names)).toEqual([]);
  });
});
