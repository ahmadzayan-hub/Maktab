// Format-aware text extraction for uploaded study files.
//
// Each supported format is turned into ordered text units that keep their
// source position (PDF page or PPTX slide) so chunks and citations can point
// back to where the text came from. Bytes are never interpreted as UTF-8
// unless the file really is plain text.
import JSZip from "jszip";

export type DocumentKind = "pdf" | "docx" | "pptx" | "txt";

export interface TextUnit {
  text: string;
  page_num: number | null;
  slide_num: number | null;
}

export interface ExtractedDocument {
  kind: DocumentKind;
  units: TextUnit[];
  text: string;
  page_count: number | null;
}

export const SUPPORTED_MIME_TYPES: Readonly<Record<string, DocumentKind>> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/markdown": "txt",
};

const EXTENSION_KINDS: Readonly<Record<string, DocumentKind>> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  txt: "txt",
  md: "txt",
};

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedDocumentError";
  }
}

export class EmptyDocumentError extends Error {
  constructor(message = "No extractable text in this file") {
    super(message);
    this.name = "EmptyDocumentError";
  }
}

/** Resolve the document kind from the MIME type, falling back to the file extension. */
export function documentKind(mimeType: string | null | undefined, fileName?: string | null): DocumentKind | null {
  const base = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  if (base && SUPPORTED_MIME_TYPES[base]) return SUPPORTED_MIME_TYPES[base];
  const ext = (fileName ?? "").toLowerCase().split(".").pop() ?? "";
  return EXTENSION_KINDS[ext] ?? null;
}

/** Collapse whitespace without destroying paragraph breaks. */
export function normaliseText(raw: string): string {
  return raw
    .replace(/\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractDocument(
  bytes: Uint8Array,
  mimeType: string | null | undefined,
  fileName?: string | null,
): Promise<ExtractedDocument> {
  const kind = documentKind(mimeType, fileName);
  if (!kind) {
    throw new UnsupportedDocumentError(`Unsupported document type: ${mimeType || fileName || "unknown"}`);
  }

  let units: TextUnit[];
  let pageCount: number | null = null;
  if (kind === "pdf") {
    const pdf = await extractPdf(bytes);
    units = pdf.units;
    pageCount = pdf.pageCount;
  } else if (kind === "docx") {
    units = await extractDocx(bytes);
  } else if (kind === "pptx") {
    units = await extractPptx(bytes);
    pageCount = units.length;
  } else {
    units = extractTxt(bytes);
  }

  const clean = units
    .map((u) => ({ ...u, text: normaliseText(u.text) }))
    .filter((u) => u.text.length > 0);
  const text = clean.map((u) => u.text).join("\n\n");
  if (!text) throw new EmptyDocumentError();

  return { kind, units: clean, text, page_count: pageCount };
}

async function extractPdf(bytes: Uint8Array): Promise<{ units: TextUnit[]; pageCount: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return {
    pageCount: totalPages,
    units: pages.map((pageText, i) => ({ text: pageText, page_num: i + 1, slide_num: null })),
  };
}

async function extractDocx(bytes: Uint8Array): Promise<TextUnit[]> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return [{ text: value, page_num: null, slide_num: null }];
}

const SLIDE_RE = /^ppt\/slides\/slide(\d+)\.xml$/;

async function extractPptx(bytes: Uint8Array): Promise<TextUnit[]> {
  const zip = await JSZip.loadAsync(bytes);
  const slides = Object.keys(zip.files)
    .map((name) => ({ name, match: SLIDE_RE.exec(name) }))
    .filter((s): s is { name: string; match: RegExpExecArray } => s.match !== null)
    .map((s) => ({ name: s.name, slide: Number(s.match[1]) }))
    .sort((a, b) => a.slide - b.slide);

  const units: TextUnit[] = [];
  for (const { name, slide } of slides) {
    const xml = await zip.file(name)!.async("string");
    units.push({ text: slideXmlToText(xml), page_num: null, slide_num: slide });
  }
  return units;
}

/** Pull the visible text runs out of a slide's DrawingML, one line per paragraph. */
export function slideXmlToText(xml: string): string {
  const paragraphs = xml.split(/<\/a:p>/);
  const lines: string[] = [];
  for (const p of paragraphs) {
    const runs = [...p.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
    const line = runs.join("").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTxt(bytes: Uint8Array): TextUnit[] {
  const text = new TextDecoder("utf-8").decode(bytes);
  return [{ text, page_num: null, slide_num: null }];
}
