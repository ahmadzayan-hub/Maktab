import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { documentKind, extractDocument, normaliseText, slideXmlToText, UnsupportedDocumentError, EmptyDocumentError } from "./extract";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function slideXml(lines: string[]): string {
  const paras = lines.map((l) => `<a:p><a:r><a:rPr lang="en-US"/><a:t>${l}</a:t></a:r></a:p>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody>${paras}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
}

async function pptxBytes(slides: Record<string, string[]>): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
  for (const [name, lines] of Object.entries(slides)) zip.file(`ppt/slides/${name}.xml`, slideXml(lines));
  zip.file("ppt/notesSlides/notesSlide1.xml", slideXml(["speaker notes are not slide text"]));
  return zip.generateAsync({ type: "uint8array" });
}

async function docxBytes(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const body = paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

/** A minimal but well-formed single-page PDF with one text string. */
function pdfBytes(text: string): Uint8Array {
  const stream = `BT /F1 18 Tf 72 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

describe("documentKind", () => {
  it("resolves by MIME type, then by extension, and rejects the rest", () => {
    expect(documentKind("application/pdf")).toBe("pdf");
    expect(documentKind("text/plain; charset=utf-8")).toBe("txt");
    expect(documentKind("application/octet-stream", "Week 3.PPTX")).toBe("pptx");
    expect(documentKind("", "notes.md")).toBe("txt");
    expect(documentKind("image/png", "photo.png")).toBeNull();
    expect(documentKind(null, undefined)).toBeNull();
  });
});

describe("normaliseText", () => {
  it("strips BOMs, normalises line endings and collapses runs", () => {
    expect(normaliseText("\uFEFFa\r\n\r\n\r\n\r\nb \t c  \n")).toBe("a\n\nb c");
  });
});

describe("extractDocument", () => {
  it("decodes plain text as UTF-8", async () => {
    const doc = await extractDocument(new TextEncoder().encode("\uFEFFمرحبا بالعالم\r\nline two"), "text/plain", "a.txt");
    expect(doc.kind).toBe("txt");
    expect(doc.text).toBe("مرحبا بالعالم\nline two");
    expect(doc.units[0]).toMatchObject({ page_num: null, slide_num: null });
  });

  it("reads PPTX slides in numeric order with one unit per slide", async () => {
    const bytes = await pptxBytes({
      slide10: ["Tenth &amp; last"],
      slide2: ["Second slide", "with two paragraphs"],
      slide1: ["Title &lt;1&gt;"],
    });
    const doc = await extractDocument(bytes, PPTX, "deck.pptx");
    expect(doc.kind).toBe("pptx");
    expect(doc.page_count).toBe(3);
    expect(doc.units.map((u) => u.slide_num)).toEqual([1, 2, 10]);
    expect(doc.units[0].text).toBe("Title <1>");
    expect(doc.units[1].text).toBe("Second slide\nwith two paragraphs");
    expect(doc.units[2].text).toBe("Tenth & last");
    expect(doc.text).not.toContain("speaker notes");
  });

  it("reads DOCX paragraphs through mammoth", async () => {
    const doc = await extractDocument(await docxBytes(["Chapter one.", "Chapter two."]), DOCX, "notes.docx");
    expect(doc.kind).toBe("docx");
    expect(doc.text).toContain("Chapter one.");
    expect(doc.text).toContain("Chapter two.");
    expect(doc.page_count).toBeNull();
  });

  it("reads PDF text per page and reports the page count", async () => {
    const doc = await extractDocument(pdfBytes("Hello from page one"), "application/pdf", "lecture.pdf");
    expect(doc.kind).toBe("pdf");
    expect(doc.page_count).toBe(1);
    expect(doc.units).toHaveLength(1);
    expect(doc.units[0].page_num).toBe(1);
    expect(doc.units[0].text).toContain("Hello from page one");
  });

  it("never treats binary bytes as text, and refuses unknown or empty files", async () => {
    await expect(extractDocument(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "image/png", "x.png")).rejects.toBeInstanceOf(UnsupportedDocumentError);
    await expect(extractDocument(new Uint8Array(), "text/plain", "empty.txt")).rejects.toBeInstanceOf(EmptyDocumentError);
    await expect(extractDocument(await pptxBytes({}), PPTX, "blank.pptx")).rejects.toBeInstanceOf(EmptyDocumentError);
    // A PDF-labelled upload with PNG bytes must fail, not be indexed as garbage.
    await expect(extractDocument(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "application/pdf", "x.pdf")).rejects.toThrow();
  });
});

describe("slideXmlToText", () => {
  it("joins runs within a paragraph and separates paragraphs", () => {
    const xml = `<a:p><a:r><a:t>Hel</a:t></a:r><a:r><a:t>lo</a:t></a:r></a:p><a:p><a:r><a:t xml:space="preserve"> world </a:t></a:r></a:p><a:p></a:p>`;
    expect(slideXmlToText(xml)).toBe("Hello\nworld");
  });
});
