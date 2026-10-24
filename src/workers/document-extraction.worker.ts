import { DocumentEvidence, EvidenceError, LIMITS, documentSections, fileFormat, validateDocxInflation } from "../lib/documents/evidence";
// Disposable worker: cancel/timeout terminates decompression and parsing.
self.onmessage = async (event: MessageEvent<{ name: string; bytes: ArrayBuffer }>) => {
  try {
    const { name, bytes } = event.data;
    const format = fileFormat(name, bytes.byteLength);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const texts: string[] = []; const warnings: string[] = [];
    if (format === "pdf") {
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new EvidenceError("corrupt");
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const task = pdfjs.getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, enableXfa: false });
      try {
        const doc = await task.promise;
        if (doc.numPages > LIMITS.pages) throw new EvidenceError("limit");
        let chars = 0;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i); const content = await page.getTextContent(); let text = "";
          for (const item of content.items) {
            if ("str" in item) { text += item.str + (item.hasEOL ? "\n" : " "); if (chars + text.length > LIMITS.chars) throw new EvidenceError("limit"); }
          }
          texts.push(text.trim()); chars += text.length; page.cleanup();
        }
      } finally { await task.destroy(); }
      if (texts.some(t => !t.trim())) warnings.push("empty_pages");
      warnings.push("reading_order");
    } else {
      await validateDocxInflation(bytes);
      const mammoth = await import("mammoth/mammoth.browser");
      const result = await mammoth.extractRawText({ arrayBuffer: bytes });
      texts.push(...result.value.split(/\n\s*\n/).filter(t => t.trim()));
      if (result.messages.length) warnings.push("docx_warnings");
      warnings.push("docx_sections");
    }
    const result: DocumentEvidence = { version: 1, name, sha256, format, sections: documentSections(texts, format), warnings };
    self.postMessage({ result });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    self.postMessage({ error: error instanceof EvidenceError ? error.code : name === "PasswordException" ? "encrypted" : "corrupt" });
  }
};
