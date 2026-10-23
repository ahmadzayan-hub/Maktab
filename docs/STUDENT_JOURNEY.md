# A first useful MBA study session

## Current change

- Four primary destinations: Today, My courses, Study, My deadlines. Existing routes and assets remain. Account settings are secondary; admin navigation requires an admin profile.
- One optional name/language setup screen. A failed save stays on screen with input intact. API writes canonical schema columns, checks each stage and marks completion last. A retry upserts the same user key, rather than creating a second profile. This is not a new database transaction or migration.
- Course creation requires a name; additional metadata is optional. Today offers 15/30/60/90 minutes, one suggested course and a learner override. It does not require grades.
- Readiness is unknown without actual finite graded work. Null/pending/invalid grades are not zero scores. Study practice does not write official grades or increase readiness.
- The study timer and notes are self-guided, not AI-generated. Drafts use browser session storage scoped to the profile and course. They survive a refresh in that tab, not tab closure or another device. Download notes before leaving. No cloud note-sync claim is made.
- Lecture capture is browser speech recognition only when supported. It can use the browser provider's online service and is not system-audio capture or guaranteed offline recording. Failure never inserts a fake transcript. Examples require an explicit click and remain labelled. No placeholder summary or successful unsent email is shown.
- Hader import is an explicit, local JSON file action (version 1, maximum 2 MB). Timestamps, untimed segments and live/import/demo provenance remain visible. No Hader engine, automatic sync or ASR service was added.

## Acceptance evidence

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
Unit tests cover no-grades decisions, malformed grades, navigation, profile save failures and idempotent retry, local draft validation, transcript provenance, and unavailable email delivery.

The **Student journey acceptance** workflow builds an isolated workspace with demo mode off and runs Python Playwright against intercepted synthetic API fixtures. It uses no credentials, private files or live AI/database calls. The artifact includes Arabic desktop/mobile screenshots and a scenario result file. A workflow definition is not a passing result: inspect the check for the exact commit being released.

Browser scenarios: an unknown-readiness learner starts a 15-minute session; notes survive refresh but do not leak across courses; failed onboarding retains input and a deliberate retry makes exactly one further request, then one course creation opens its study session; mobile primary navigation has four destinations; unsupported microphone capture leaves the transcript empty; explicit sample/Hader import is labelled; course-load failure does not masquerade as an empty account.

## Follow-on release blockers

Binary PDF/Office extraction and durable ingestion are **not repaired by this interface change**. Existing upload acceptance must not be interpreted as successful extraction/indexing. Validate two-user isolation and real persistence using disposable backend fixtures before a real-student release.

AI lifecycle resilience is a separate coherent repair: central configurable provider/model IDs, verified official model support, distinct missing-key/retired-model/quota/outage failures, bounded retries and cancellation, and no silent paid or cross-provider fallback. Core study must remain usable without AI. Deterministic study prompts are not model output. Remove absolute “free/unlimited AI” promises wherever retained inherited pages make them; provider quotas, hosting and optional external services have their own conditions.

Use provider documentation, not a model identifier copied from old source, to verify support. Source-backed provider tests must mock 401, retired-model 404, 429 quota/rate-limit, 5xx and abort paths without paid calls. No keys or production migrations are part of this change.

## Design rationale

[Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports keeping secondary features available without presenting them all at once. [IES study guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) supports spaced study and retrieval practice; it does not imply that a timer or self-check guarantees grades. The full Arabic study is maintained separately from implementation evidence.
