# Maktab: setup and release acceptance

[Back to the README](../README.md)

This guide describes the source at `ce0a2833f31b65824918582e95007f527557f3cd`. It supersedes conflicting setup examples in the older deployment guide without deleting that history. Commands were checked against repository manifests and CI, not executed as part of this documentation review.

## Choose a mode deliberately

| Mode | Configuration | What it proves |
| --- | --- | --- |
| Sample workspace | `NEXT_PUBLIC_DEMO_MODE=true` | UI exploration against synthetic responses only |
| Connected development | Demo flag off, development Supabase project, reviewed migrations and policies | A place to test real persistence and authorization with non-sensitive fixtures |
| Production | Accepted connected workflows, approved infrastructure, monitored recovery and integrations | Must be established by actual release evidence, not a successful homepage render |

Missing credentials are not the same thing as opting into sample mode. Use an explicit mode and do not populate `.env.local` with the template's placeholder secrets.

## Connected mode

1. Use a development backend first. Keep the existing production project, billing references and data untouched.
2. Review all SQL files under [supabase/migrations](../supabase/migrations), in sequence, against the existing database state. The later schema contains the study tables, vector-search function and private-file storage policies; applying only the oldest migration is not a complete setup.
3. In `.env.local`, keep `NEXT_PUBLIC_DEMO_MODE=false` and supply the server's expected configuration:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`, server-side only
   - `NEXT_PUBLIC_APP_URL`, the actual application origin
4. Verify sign-up, sign-in, sign-out and session refresh using disposable accounts. Validate row and storage policies with two distinct users before uploading private files.
5. Restart the development server after changing environment values.

The service-role key bypasses ordinary row-level access protections. It must never become a `NEXT_PUBLIC_*` value or be pasted into an issue, screenshot or commit. A public anonymous key does not replace proper database and storage policies.

## AI and file handling

[The AI client](../src/lib/ai/client.ts) uses `AI_PROVIDER` (`anthropic` by default, or `openai`) and the corresponding server-side API key. `AI_MODEL` can select the chat model. Embeddings use OpenAI's `text-embedding-3-small` regardless of the selected chat provider, so retrieval can transmit document text to a different provider from chat.

Do not enable a paid integration just to make sample mode look complete. Confirm the permitted documents, provider destination, usage limits and error behavior before a real-data trial.

The current [file route](../src/app/api/files/route.ts):

- Limits accepted files to 50 MB and a small MIME allowlist.
- Uploads to `private-files`, creates a database record and starts asynchronous processing.
- Calls `.text()` on the stored object, which is not a PDF/DOCX/PPTX parser.
- Chunks text and writes embeddings, but does not use a durable queue.

Before calling this a document-grounded tutor, implement and test format-aware extraction, durable retryable ingestion, failure recovery and page/source mapping. Use ordinary text fixtures for limited development checks, and confirm that “ready” means searchable content actually exists.

## Optional services

Stripe subscription routes and email-related code are present. Leave these unconfigured unless the integration is in scope. Enabling them requires separate credentials, appropriate test-mode coverage and explicit decisions about billing or outbound messages. A subscription page is not evidence that charging, cancellation or webhook handling has been accepted.

A PWA manifest and service worker are present. Verify what is cached before using shared devices. Do not describe the application as fully offline: live authentication, storage, AI and billing still depend on their services.

## Local checks and deployment

The existing CI baseline uses Node.js 20 and the committed npm lockfile:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The root [vercel.json](../vercel.json) and Next.js configuration belong to the existing application. Use a preview environment for validation before any production release. Do not expose a local Ollama server publicly to follow inherited prompt-tooling examples; the current tutor/embedding path must be evaluated on its own implementation.

## Acceptance checklist

- [ ] Demo mode is off for real-data testing and no sample identity is treated as authenticated user data.
- [ ] Two users cannot read, modify, search or download each other's private records or files.
- [ ] Course, deadline, task and grade changes survive refresh and a server restart.
- [ ] Readiness handles empty graded work honestly and uses verified records.
- [ ] Each supported document format yields readable text, traceable citations and recoverable processing failures.
- [ ] AI unavailability, quota limits and provider errors are visible rather than replaced by fabricated success.
- [ ] Account export/deletion and file retention match the product's stated behavior.
- [ ] Existing billing identities remain intact; any enabled payment/email flows have separate acceptance evidence.
- [ ] The deployed revision, test outcomes, backup/restore procedure and known limitations are recorded.

Do not replace those checks with a blanket “production ready” badge.
