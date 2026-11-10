# Tutor excerpt references

The tutor prompt labels each retrieved excerpt `[Source 1]`, `[Source 2]`, etc.
Previously, the persisted citation list deduplicated by file/page. Two chunks
from page 7 received separate prompt numbers but only the first chunk survived
in the citation list. Unpaginated documents collapsed into one citation too.
The displayed chips also omitted the prompt's source number.

New citations retain one entry for every numbered prompt excerpt, in the same
retrieval order. Each entry records `source_number`, `file_id`, `chunk_id`, the
display filename, page and up to 200 characters of excerpt. The tutor chips
display the stored number, so `[Source 3]` can be matched to the correct entry
even when multiple excerpts have the same filename or page. No database
migration is needed: `tutor_messages.citations` is already JSONB.

Historical citations remain readable. Their missing source numbers are not
reconstructed from array indexes because prior deduplication lost that mapping.
No historical chat is rewritten.

These entries describe retrieved context, not a verified claim that the model
used every excerpt or that its answer follows from them. This change preserves
the existing `is_grounded` meaning (context was retrieved); model entailment,
validation of actual `[Source N]` mentions and PPTX slide references remain
open. Migration 0004's retrieval RPC currently returns page numbers, not slide
numbers. The separate documented file-schema mismatch remains open too.

`npm test -- src/lib/rag/retriever.test.ts src/lib/rag/citation-label.test.ts`
covers repeated-page and unpaginated chunks, duplicate filenames, stable source
order, excerpt bounds, empty retrieval and historical display compatibility.
The tests prohibit database/embedding calls and use synthetic excerpts. They
do not verify live retrieval, paid AI responses or browser rendering.
