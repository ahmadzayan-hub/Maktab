import { describe, expect, it } from "vitest";
import { parseHaderTranscript } from "./hader";
describe("bounded Hader imports", () => {
  it("rejects oversized segment collections with one issue rather than collecting element errors", () => {
    const raw = JSON.stringify({ format: "hader-session", version: 1, id: "synthetic", title: "Synthetic", createdAt: "2026-10-23T00:00:00Z", segments: Array(10001).fill(null) });
    try { parseHaderTranscript(raw); throw new Error("Expected invalid import"); }
    catch (error) { expect(error).toHaveProperty("issues"); expect((error as { issues: unknown[] }).issues).toHaveLength(1); }
  });
});
