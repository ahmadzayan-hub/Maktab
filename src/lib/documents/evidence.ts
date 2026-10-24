/** Local evidence contract. Original implementation; see docs/LOCAL_DOCUMENT_EVIDENCE.md. */
export const LIMITS = { bytes: 8 * 1024 * 1024, pages: 150, sections: 1000, chars: 200_000, zipEntries: 512, expandedBytes: 32 * 1024 * 1024, timeoutMs: 30_000 } as const;
export type EvidenceCode = "too_large" | "unsupported" | "corrupt" | "encrypted" | "no_text" | "limit" | "timeout" | "cancelled";
export class EvidenceError extends Error { constructor(public code: EvidenceCode) { super(code); } }
export interface EvidenceSection { index: number; location: "page" | "section"; text: string; }
export interface DocumentEvidence { version: 1; name: string; sha256: string; format: "pdf" | "docx"; sections: EvidenceSection[]; warnings: string[]; }
export function fileFormat(name: string, size: number): "pdf" | "docx" {
  if (!size) throw new EvidenceError("corrupt");
  if (size > LIMITS.bytes) throw new EvidenceError("too_large");
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.docx$/i.test(name)) return "docx";
  throw new EvidenceError("unsupported");
}
/** Check ZIP bounds BEFORE decompression. No ZIP64 or encrypted archives. */
export interface ZipEntry { offset: number; compressed: number; size: number; method: number; }
export function validateDocxZip(buffer: ArrayBuffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const v = new DataView(buffer); const n = v.byteLength; let end = -1;
  // Comments/trailing data are unsupported: use the same final EOCD as JSZip.
  if (n >= 22 && v.getUint32(n - 22, true) === 0x06054b50 && v.getUint16(n - 2, true) === 0) end = n - 22;
  if (end < 0) throw new EvidenceError("corrupt");
  const count = v.getUint16(end + 10, true), length = v.getUint32(end + 12, true), start = v.getUint32(end + 16, true);
  if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true) || v.getUint16(end + 8, true) !== count || count === 65535) throw new EvidenceError("unsupported");
  if (!count || count > LIMITS.zipEntries || start + length !== end) throw new EvidenceError("limit");
  let p = start, expanded = 0; const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || v.getUint32(p, true) !== 0x02014b50) throw new EvidenceError("corrupt");
    if (v.getUint16(p + 8, true) & 1) throw new EvidenceError("encrypted");
    const compressed = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const next = p + 46 + nameLen + extraLen + commentLen;
    if (next > end || compressed === 0xffffffff || size === 0xffffffff) throw new EvidenceError("corrupt");
    expanded += size;
    if (expanded > LIMITS.expandedBytes || size > Math.max(compressed, 1) * 200) throw new EvidenceError("limit");
    const name = new TextDecoder().decode(new Uint8Array(buffer, p + 46, nameLen));
    if (names.has(name) || name.includes("..") || name.startsWith("/")) throw new EvidenceError("corrupt");
    const local = v.getUint32(p + 42, true), method = v.getUint16(p + 10, true);
    if (method !== 0 && method !== 8) throw new EvidenceError("unsupported");
    if (local + 30 > start || v.getUint32(local, true) !== 0x04034b50 || v.getUint16(local + 8, true) !== method || (v.getUint16(local + 6, true) & 1)) throw new EvidenceError("corrupt");
    const offset = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    if (offset + compressed > start) throw new EvidenceError("corrupt");
    entries.push({ offset, compressed, size, method });
    names.add(name); p = next;
  }
  if (p !== end || !names.has("word/document.xml") || !names.has("[Content_Types].xml")) throw new EvidenceError("corrupt");
  return entries;
}
export function documentSections(texts: string[], format: "pdf" | "docx"): EvidenceSection[] {
  if (texts.length > (format === "pdf" ? LIMITS.pages : LIMITS.sections)) throw new EvidenceError("limit");
  let chars = 0;
  const sections = texts.map((text, i) => {
    chars += text.length; if (chars > LIMITS.chars) throw new EvidenceError("limit");
    return { index: i + 1, location: format === "pdf" ? "page" as const : "section" as const, text };
  });
  if (!sections.some(s => s.text.trim())) throw new EvidenceError("no_text");
  return sections;
}

/** Count actual inflated bytes; ZIP metadata alone cannot protect against a forged-size bomb. */
export async function validateDocxInflation(buffer: ArrayBuffer): Promise<void> {
  const entries = validateDocxZip(buffer); let total = 0;
  for (const entry of entries) {
    if (entry.method === 0) {
      if (entry.size !== entry.compressed) throw new EvidenceError("corrupt");
      total += entry.size; continue;
    }
    const stream = new Blob([buffer.slice(entry.offset, entry.offset + entry.compressed)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const reader = stream.getReader(); let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; total += value.byteLength;
        if (size > entry.size || total > LIMITS.expandedBytes) { await reader.cancel(); throw new EvidenceError("limit"); }
      }
    } finally { reader.releaseLock(); }
    if (size !== entry.size) throw new EvidenceError("corrupt");
  }
}
