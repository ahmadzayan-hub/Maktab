# Local document evidence

Files now offers an optional, temporary browser-only PDF/DOCX text preview. Selecting a file does not upload it, index it for Tutor, invoke a model, or persist it. Downloaded JSON contains original filename, SHA-256, excerpts and actual PDF page indices or DOCX paragraph-section indices. DOCX sections are not page numbers. Review extracted text against the original before relying on it; PDF reading order is imperfect and no OCR is provided.

Limits: 8 MiB input, 150 PDF pages or 1,000 DOCX sections, 200,000 characters, 512 ZIP entries, 32 MiB total inflated DOCX content and 30 seconds. ZIP comments, trailing data, ZIP64, encryption and unusually high compression ratios are deliberately unsupported. A disposable worker bounds parsing time and allows cancellation; ZIP expansion is counted before Mammoth parses. These limits reduce risk but are not a complete hostile-file sandbox. Scans without text, corrupt/encrypted files and unsupported worker environments fail visibly instead of fabricating evidence. A fresh selection replaces the prior preview; leaving the page discards it.

The existing explicit cloud path is separate: UTF-8 TXT up to 1 MiB only, with authenticated ownership checks. Stored text is not advertised as vector-indexed; PDF/DOCX/PPTX API uploads fail closed until a validated server extractor exists. No database migration or provider key is introduced.

## Upstream attribution

- Mozilla PDF.js, pdfjs-dist **6.4.299**, Apache-2.0: https://github.com/mozilla/pdf.js . Browser text extraction, loaded on demand with a bundled same-origin worker. Node >=22.13.0 is required for supported tooling; CI uses Node 22. PDF.js is not invoked on the server.
- Mammoth **1.13.0**, BSD-2-Clause: https://github.com/mwilliamson/mammoth.js . Only extractRawText is used, never rendered HTML.
- Source-hash and source-location design was informed by source review of https://github.com/Open-Source-Legal/OpenContracts (MIT, commit 8bc8254d0c03efcf3cdb7b383a675016fcb51351) and https://github.com/lfnovo/open-notebook (MIT, commit a0f6f3081ae06328f0a451b3a3ef2959ca25721d). No implementation code from those platforms was copied and neither platform is installed.

License texts for the two added runtime packages are in docs/licenses. Transitive package licenses remain in their distributions. This feature adds no paid API or always-on service; browser CPU/memory and the normal application hosting still apply. Application assets must load before preview works; this is not a claim of an installable fully offline PWA.

## Verification

Unit tests use generated, non-private PDF/DOCX fixtures. The existing Student journey acceptance workflow runs real Chromium extraction for two-page PDF, Arabic DOCX, mixed empty pages, encrypted/corrupt/scanned input, SHA/export, repeated and stale selections, interruption, blocked-worker state and mobile layout. API calls are synthetic mocks; real DB/RLS acceptance is not claimed. Cancellation and blocked-worker error tests deliberately simulate worker availability, not extraction success.
