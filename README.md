# Maktab · مكتب

**Your MBA, on one desk.** A bilingual study workspace for working learners who need to decide what to study next, not manage another collection of disconnected tools.

[Setup & release guide](docs/GETTING_STARTED.md) · [Product authority](docs/PRODUCT_AUTHORITY.md) · [API reference](docs/API.md) · [Design guide](docs/DESIGN_GENERATION_PROMPT.md)

## Why Maktab exists

Courses, deadlines, graded work and study time belong in one place. Maktab's core workflow connects them:

**Courses and deadlines → graded work → course readiness → a realistic study plan → study sessions.**

Readiness is meant to come from actual graded work. A course without graded work should show that evidence is missing, not a fabricated score. The learner chooses the plan; generated material remains a study aid, not an authoritative assessment.

## What is in this repository

| Area | User value | Current boundary |
| --- | --- | --- |
| Courses, tasks, deadlines and grades | See commitments and choose the next study block | Next.js pages and authenticated API routes are present; real records require the Supabase schema and policies |
| Readiness and study command center | Turn graded work into preparation priorities | Calculation code and unit tests are present; sample-mode figures are not learner evidence |
| Tutor, Ask MBA and study packs | Ask questions and organize revision material | Provider-backed routes exist; model access and retrieval must be configured and validated |
| Files and citations | Connect a question to course material | Upload and retrieval code exists, but binary parsing and durable ingestion are release blockers described below |
| Flashcards, quizzes, weekly brief, messages and group-project views | Keep related study work together | Interface presence alone does not establish an accepted end-to-end workflow |
| English / Arabic, RTL, themes and PWA shell | Use the workspace on a phone or laptop | A cached shell is not offline database synchronization or offline AI |

The current stack is **Next.js 15, React 18, TypeScript, Supabase, Tailwind CSS and Framer Motion**. The exact dependency ranges and scripts are in [package.json](package.json).

## Current status: application code, not a production certification

This repository includes both a sample-data mode and service-connected paths. They must not be confused:

- **Sample mode:** explicitly set `NEXT_PUBLIC_DEMO_MODE=true`. Routes can return canned records and simulated successful writes. Do not enter real student documents or treat the resulting numbers as saved work.
- **Connected mode:** leave demo mode off and configure Supabase authentication, storage, migrations and access policies. AI and billing are separate integrations, not prerequisites for browsing the sample workspace.
- **Known ingestion gap:** the upload route accepts PDF, DOCX and PPTX, but currently reads downloaded bytes with `.text()` rather than format-aware extraction. It also starts processing without a durable job queue. Accepting a file is not proof it was parsed or indexed correctly.
- **Retrieval cost and privacy:** the implemented embedding helper calls OpenAI, including when Anthropic is selected for chat. This is not a fully local or provider-free RAG path.
- **Release acceptance remains open:** tenant isolation, persistence across restarts, source/citation correctness, recovery and enabled external integrations need end-to-end verification.

This description is based on source review at [`ce0a283`](https://github.com/ahmadzayan-hub/Maktab/tree/ce0a2833f31b65824918582e95007f527557f3cd). It does not assert that a live deployment was tested.

## Start locally

Use Node.js 20, matching the repository's CI baseline. From a fresh checkout:

```bash
git clone https://github.com/ahmadzayan-hub/Maktab.git
cd Maktab
npm ci
```

For an explicitly labelled sample workspace, create `.env.local` containing only:

```dotenv
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Open `http://localhost:3000`. This path requires no paid AI account and does not configure a real learner database. For real-data setup, use the [connected-mode checklist](docs/GETTING_STARTED.md#connected-mode).

Do not copy placeholder credentials from `.env.example` unchanged. The implemented Supabase helper reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the older README's publishable-key instruction did not match that helper.

## Quality commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

`npm start` serves an already-built production bundle. These commands are declared in the current manifest; this documentation change does not claim a new successful test or build run. CI runs typecheck, lint, tests and build on pull requests targeting `main` and pushes to `main`.

## Repository map

- `src/app/(app)/`: study workspace pages.
- `src/app/(auth)/` and `src/app/(public)/`: account and public-facing pages.
- `src/app/api/`: account, study, file, tutor and integration routes.
- `src/lib/learning/`: readiness calculations and tests.
- `src/lib/ai/` and `src/lib/rag/`: provider and retrieval code.
- `src/lib/demo/`: explicitly synthetic sample data.
- `supabase/`: migrations and seed material. Review before applying; do not seed a live student database with samples.
- `public/`: existing icons, manifest, service worker and offline assets.
- `docs/`: product, API, design and historical deployment documentation.

## Product boundaries and preservation

Maktab is not a university LMS, course marketplace, credential issuer or prompt-management tool. The [product authority document](docs/PRODUCT_AUTHORITY.md) defines its ownership of learner records and its relationship to external billing systems.

Existing course-related code, visual assets, migrations and historical documentation are retained. Some older [deployment](docs/DEPLOY.md) and [assessment](docs/ASSESSMENT.md) instructions describe inherited prompt tooling or an extension folder that is not in this tree. Use the new [setup guide](docs/GETTING_STARTED.md) for the current boundaries; those older documents are not evidence of implemented Maktab features.

For design changes, preserve the tokens and routes documented in [DESIGN_GENERATION_PROMPT.md](docs/DESIGN_GENERATION_PROMPT.md). The design-drift workflow checks relevant source changes. Intentional drift can be acknowledged with the existing `[skip-design-drift]` convention, not used to conceal an unreviewed mismatch.

Sibling products remain separate: [Wisal](https://github.com/ahmadzayan-hub/wisal), [Lahza](https://github.com/ahmadzayan-hub/lahza), [Masaar](https://github.com/ahmadzayan-hub/masaar), [Vertex](https://github.com/ahmadzayan-hub/vertex), [Mutabasir](https://github.com/ahmadzayan-hub/mutabasir) and [Annual Operation Plan](https://github.com/ahmadzayan-hub/annual-operation-plan-2026).

## بالعربية

**مكتب** مساحة دراسة بالعربية والإنجليزية للدارس الذي يوازن بين العمل والتعلّم. تجمع المقررات والمواعيد والمهام والدرجات، وتساعده على اختيار ما يدرسه بناءً على عمل مُقيّم فعلياً، لا أرقام تقدم تجميلية.

المستودع يحتوي على وضع بيانات تجريبية ومسارات ربط حقيقية. تشغيل الواجهة لا يعني اكتمال المنتج: استخراج محتوى PDF وملفات Office، استمرارية المعالجة، عزل بيانات المستخدمين وصحة الاستشهادات ما زالت تحتاج تحققاً قبل استخدام بيانات حقيقية. ابدأ من [دليل التشغيل](docs/GETTING_STARTED.md)، ولا تضع المفاتيح السرية أو ملفات الطلاب في GitHub.

## Licensing

No repository-wide `LICENSE` file is present in the reviewed tree. This documentation does not add a license or change rights in existing code, assets or course material.
