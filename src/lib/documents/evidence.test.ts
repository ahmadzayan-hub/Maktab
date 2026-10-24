import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { LIMITS, documentSections, fileFormat, validateDocxZip, validateDocxInflation } from "./evidence";
const fixture = () => { const b = readFileSync("tests/fixtures/documents/arabic.docx"); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
describe("bounded local evidence", () => {
  it("checks extension and byte limits before reading", () => {
    expect(fileFormat("notes.PDF", 42)).toBe("pdf"); expect(fileFormat("عربي.docx", 42)).toBe("docx");
    expect(() => fileFormat("file.exe", 1)).toThrow("unsupported"); expect(() => fileFormat("x.pdf", 0)).toThrow("corrupt"); expect(() => fileFormat("x.pdf", LIMITS.bytes + 1)).toThrow("too_large");
  });
  it("preserves actual PDF page indices including blank pages", () => {
    expect(documentSections(["English", "", "العربية"], "pdf")).toEqual([{ index: 1, location: "page", text: "English" }, { index: 2, location: "page", text: "" }, { index: 3, location: "page", text: "العربية" }]);
  });
  it("never invents DOCX page numbers or text for scans", () => {
    expect(documentSections(["one", "اثنان"], "docx")[1]).toEqual({ index: 2, location: "section", text: "اثنان" });
    expect(() => documentSections(["", "  "], "pdf")).toThrow("no_text");
  });
  it("fails closed rather than silently truncating evidence", () => {
    expect(() => documentSections(Array(151).fill("x"), "pdf")).toThrow("limit");
    expect(() => documentSections(["x".repeat(LIMITS.chars + 1)], "docx")).toThrow("limit");
  });
  it("allows long DOCX reports without confusing paragraphs with PDF pages", () => {
    expect(documentSections(Array.from({ length: 200 }, (_, i) => `MBA report paragraph ${i + 1}: evidence for the analysis.`), "docx")).toHaveLength(200);
    expect(() => documentSections(Array(1001).fill("paragraph"), "docx")).toThrow("limit");
  });
  it("reads a real DOCX ZIP and counts actual inflated bytes", async () => {
    expect(validateDocxZip(fixture()).length).toBeGreaterThan(2); await expect(validateDocxInflation(fixture())).resolves.toBeUndefined();
  });
  it("rejects corrupt archives before decompression", () => {
    expect(() => validateDocxZip(new ArrayBuffer(3))).toThrow("corrupt");
    const bytes = fixture(); new DataView(bytes).setUint32(0, 0); expect(() => validateDocxZip(bytes)).toThrow("corrupt");
  });
  it("rejects trailing data and ZIP comments to avoid ambiguous directory interpretation", () => {
    const original = new Uint8Array(fixture()); const appended = new Uint8Array(original.length + 1); appended.set(original);
    expect(() => validateDocxZip(appended.buffer)).toThrow("corrupt");
    const commented = fixture(); new DataView(commented).setUint16(commented.byteLength - 2, 1, true);
    expect(() => validateDocxZip(commented)).toThrow("corrupt");
  });
  it("rejects advertised zip bombs and encrypted archives", () => {
    const bytes = fixture(); const view = new DataView(bytes); const end = bytes.byteLength - 22; const directory = view.getUint32(end + 16, true);
    view.setUint32(directory + 24, LIMITS.expandedBytes + 1, true); expect(() => validateDocxZip(bytes)).toThrow("limit");
    const encrypted = fixture(); const v = new DataView(encrypted); const p = v.getUint32(encrypted.byteLength - 6, true); v.setUint16(p + 8, 1, true); expect(() => validateDocxZip(encrypted)).toThrow("encrypted");
  });
  it("detects forged small sizes against actual decompression", async () => {
    const bytes = fixture(); const v = new DataView(bytes); const p = v.getUint32(bytes.byteLength - 6, true); v.setUint32(p + 24, 1, true);
    await expect(validateDocxInflation(bytes)).rejects.toThrow("limit");
  });
});
