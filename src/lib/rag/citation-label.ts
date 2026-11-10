/** Older persisted chats have no source number; their lost mapping cannot be inferred. */
export interface CitationLabel {
  file_name: string;
  page_num?: number | null;
  source_number?: number;
}

export function formatCitationLabel(citation: CitationLabel): string {
  const source = Number.isSafeInteger(citation.source_number) && citation.source_number! > 0
    ? `[Source ${citation.source_number}] `
    : "";
  const page = citation.page_num ? ` · p.${citation.page_num}` : "";
  return `${source}${citation.file_name}${page}`;
}
