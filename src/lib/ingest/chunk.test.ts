import { describe, expect, it } from "vitest";
import { chunkUnits, estimateTokens } from "./chunk";

const words = (n: number, prefix = "w") => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");

describe("chunkUnits", () => {
  it("keeps the page of every chunk and never spans two units", () => {
    const chunks = chunkUnits(
      [
        { text: words(30, "a"), page_num: 1, slide_num: null },
        { text: words(30, "b"), page_num: 2, slide_num: null },
      ],
      { chunkWords: 20, overlapWords: 5, minChars: 10 },
    );
    expect(chunks.map((c) => c.page_num)).toEqual([1, 1, 2, 2]);
    expect(chunks.map((c) => c.chunk_index)).toEqual([0, 1, 2, 3]);
    expect(chunks[0].text.startsWith("a0 ")).toBe(true);
    expect(chunks[1].text.startsWith("a15 ")).toBe(true); // 20 - 5 overlap
    expect(chunks[2].text.startsWith("b0 ")).toBe(true);
    for (const c of chunks) expect(c.text).not.toMatch(/a\d+ b\d+/);
  });

  it("tags slides and drops chunks below the minimum size", () => {
    const chunks = chunkUnits(
      [
        { text: "Title", page_num: null, slide_num: 1 },
        { text: "A slide with enough words to be worth indexing on its own.", page_num: null, slide_num: 2 },
      ],
      { chunkWords: 50, overlapWords: 0, minChars: 20 },
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ chunk_index: 0, slide_num: 2, page_num: null });
    expect(chunks[0].token_count).toBe(estimateTokens(chunks[0].text));
  });

  it("returns nothing for empty input and rejects bad windows", () => {
    expect(chunkUnits([])).toEqual([]);
    expect(chunkUnits([{ text: "   ", page_num: 1, slide_num: null }])).toEqual([]);
    expect(() => chunkUnits([], { chunkWords: 10, overlapWords: 10 })).toThrow();
    expect(() => chunkUnits([], { chunkWords: 0 })).toThrow();
  });

  it("uses the house defaults (800 words, 100 overlap, 50 chars)", () => {
    const chunks = chunkUnits([{ text: words(1500), page_num: 3, slide_num: null }]);
    expect(chunks).toHaveLength(2);
    expect(chunks[1].text.startsWith("w700 ")).toBe(true);
    expect(chunks.every((c) => c.page_num === 3)).toBe(true);
  });
});
