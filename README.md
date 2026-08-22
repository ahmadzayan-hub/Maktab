# Maktab · مكتب

> **Your MBA, on one desk.**

Maktab is a bilingual (English + Arabic) study platform for MBA students,
managers and entrepreneurs. It brings your courses, lectures, tasks,
grades, study packs, group projects, flashcards, quizzes, weekly briefs,
and an AI study tutor into one calm, mobile-first workspace.

Built on **Next.js 14 (App Router) + Supabase + Tailwind + Framer Motion**.
Deployable to **Vercel** on a free tier.

## What you can do with Maktab

- **Ask MBA** — an AI tutor grounded in business-school topics.
- **Weekly Brief** — a Monday summary of what's due, what to study, what
  to prep for.
- **Study Packs** — bundle lecture notes, flashcards, and quizzes for a
  topic or an exam.
- **Group Project** — coordinate roles, deliverables, and deadlines with
  your team.
- **Grades + Timeline** — see where you stand and what's next.
- **Files, Messages, Announcements** — one inbox for everything from
  your programme.
- **Bilingual EN / AR** with a real RTL layout, native fonts (Space
  Grotesk + Fraunces + Tajawal + IBM Plex Sans Arabic + JetBrains Mono),
  light and dark themes.
- **Offline-ready PWA** with a service worker and installable manifest.

## Repository layout

```
.
├── src/
│   ├── app/
│   │   ├── (app)/         Authenticated study workspace (23 pages)
│   │   ├── (auth)/        Login, signup, reset-password
│   │   ├── (public)/      Landing, pricing, features, faq, terms, privacy
│   │   ├── api/           22 API routes (ask-mba, tutor, tasks, files, …)
│   │   ├── admin/         Feedback console
│   │   ├── layout.tsx     Root layout + fonts + PWA registration
│   │   └── sitemap.ts     SEO sitemap
│   ├── lib/               engine, safe-fetch, supabase, i18n, services
│   ├── components/        UI kit (glass cards, motion, icons, forms)
│   └── middleware.ts      Supabase session refresh
├── public/                icon, manifest.webmanifest, sw.js, offline assets
├── supabase/              migrations, seed
├── extension/             Browser extension (MV3)
├── mobile/                Capacitor scaffold
├── desktop/               Electron wrapper
├── docs/                  Audit, deploy, mobile, desktop notes
├── vercel.json            Deploy config
├── tailwind.config.ts     Design tokens (brand / navy / teal / gold)
└── package.json
```

Sibling products that used to live in this repository now have their own
repositories: [wisal](https://github.com/ahmadzayan-hub/wisal),
[lahza](https://github.com/ahmadzayan-hub/lahza),
[masaar](https://github.com/ahmadzayan-hub/masaar),
[vertex](https://github.com/ahmadzayan-hub/vertex),
[mutabasir](https://github.com/ahmadzayan-hub/mutabasir),
[annual-operation-plan-2026](https://github.com/ahmadzayan-hub/annual-operation-plan-2026).

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (Supabase + optional OpenAI + optional Stripe)
cp .env.example .env.local

# 3. Run the dev server
npm run dev
# open http://localhost:3000
```

Maktab boots with **no backend credentials required** — the demo flow
redirects `/`, `/login`, and `/signup` to `/dashboard` and every page
renders sample content. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable real auth and
persistence; add `OPENAI_API_KEY` (server-only) for higher-quality Ask
MBA responses; add `STRIPE_*` for the subscription page.

## Quality gates

Run any of these locally:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm test             # vitest run (18 tests)
npm run build        # next build
```

## Design

If you want to regenerate a screen (or the whole product) with an AI
design tool — v0.dev, Lovable, Bolt, Framer AI, Figma Make, Galileo AI,
Uizard — start from
[docs/DESIGN_GENERATION_PROMPT.md](docs/DESIGN_GENERATION_PROMPT.md).
It is grounded in the exact tokens, fonts, palette, and route paths on
`main`, with per-tool tuning notes at the bottom.

A CI check (`.github/workflows/design-prompt-drift.yml`) fails any PR
that changes `src/app/globals.css`, `tailwind.config.ts`, or a route
inside `src/app/(app|public|auth)/` without also updating the prompt,
so the design brief cannot silently drift from the code. Add
`[skip-design-drift]` to a PR title or commit message to acknowledge
intentional drift.

## Docs

- `docs/PROJECT_AUDIT_BASELINE.md` — current-state audit + findings
- `docs/API.md` — API reference
- `docs/DEPLOY.md` — deployment guide
- `docs/MOBILE.md` — installable PWA + Capacitor wrapper
