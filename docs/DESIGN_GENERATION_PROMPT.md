# Design-generation prompt · Tweenz AI Learning OS (Maktab)

Copy-paste ready prompt for feeding into a 2026 AI design-generation tool
(**v0.dev** recommended — same stack — with tool-specific tweaks for
Lovable, Bolt, Framer AI, and Figma Make at the bottom).

Grounded in what actually exists on `origin/main`: Next.js 14 App Router,
Supabase auth + RLS, Stripe billing, framer-motion, recharts,
react-day-picker, react-dropzone, zod, Tailwind with the tokens declared
in `src/app/globals.css` and `tailwind.config.ts`.

---

## 1 · Product in one paragraph

**Tweenz AI Learning OS** (Arabic name: **مكتب / Maktab**, meaning
"desk") is a bilingual (English + Arabic, full RTL) SaaS for MBA students
in the UAE. It is one workspace where a student's whole academic life
lives: courses, lectures, study packs, flashcards, quizzes, tasks,
calendar, grades, group projects, weekly briefs, and an on-demand AI
tutor plus a specialised "Ask My MBA" agent. Positioning line: **"Your
MBA, on one desk."** Users pay Student or Pro monthly / annually via
Stripe; auth + data through Supabase.

## 2 · Users you are designing for

- **Primary:** MBA students at UAE universities (AASTMT, MBS Dubai,
  Hult, Heriot-Watt). Studying part-time while working. Arabic-first for
  personal / cultural context, English-first for coursework. Mobile-
  heavy commute usage, laptop for deep work.
- **Secondary:** Course tutors / TAs (announcements, feedback).
- **Admin:** Product team (feedback triage, user stats).

## 3 · Design DNA

- **Personality**: calm, credible, adult, expensive-feeling. Think
  Notion × Linear × Apple Intelligence, not a colourful "study app" for
  teens. Bilingual serif for warmth (Fraunces), grotesque sans for
  clarity (Space Grotesk), Tajawal for Arabic.
- **Mood**: glassmorphic surfaces on soft blue-white ground, with
  ambient orbs (very low-opacity coloured blurs) drifting in the
  background. Never rainbow. Never emoji-driven.
- **References**: Linear's density and keyboard-first feel. Arc's soft
  glass. Apple Intelligence's ambient orbs. Notion Calendar's calm
  density. Cron's serif accents.
- **What to avoid**: generic "AI SaaS" clichés — no purple-to-pink
  gradients everywhere, no hero robot illustrations, no rounded-square
  3D icons, no glassmorphism on 100% of elements (only on hero
  surfaces), no chatgpt-style "type here" plaintext text areas.

## 4 · Design tokens — use exactly these

```css
/* Light mode */
--bg:             #f0f4ff;
--surface:        rgba(255,255,255,0.72);   /* glass panels */
--surface-line:   rgba(255,255,255,0.5);
--surface-shadow: 0 8px 32px rgba(31,38,135,0.15);

/* Dark mode */
--bg-dark:        #080c18;
--surface-dark:   rgba(15,20,40,0.75);

/* Ambient orbs (background only, blur ~180px, drifting slowly) */
--orb-1: rgba(59,130,246,0.15);   /* brand blue */
--orb-2: rgba(99,102,241,0.12);   /* navy */
--orb-3: rgba(20,184,166,0.10);   /* teal */
--orb-4: rgba(168,85,247,0.08);   /* violet */

/* Palette */
brand:  50 #eef6ff · 500 #3b82f6 · 600 #2563eb (primary) · 700 #1d4ed8 · 950 #172554
navy:   50 #f0f4ff · 500 #4f56f5 · 700 #2f2ecf · 950 #16164d
teal:   500 #14b8a6 · 700 #0f766e (secondary + success)
gold:   500 #f59e0b (accent, sparingly, for achievements/streaks)
ink:    slate-900 #0f172a (light) · slate-200 #e2e8f0 (dark)
```

**Fonts (Google Fonts):**
- Sans: `Space Grotesk` (400, 500, 600, 700)
- Display / serif accent: `Fraunces` (400 opt-size, 600, 700, italic)
- Arabic: `Tajawal` (400, 500, 700) — automatically swap when `[dir="rtl"]`
- Mono: `JetBrains Mono`

**Radius:** 12px controls · 20px cards · 28px hero surfaces · 999px pills.
**Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px scale.
**Elevation:** never native `box-shadow: 0 4px 6px black`. Use the
`--surface-shadow` glass drop only.
**Motion:** Framer Motion. Every mount uses `fade-up` (10px, 240 ms,
easeOut). Stagger children by 60 ms (`stagger-1 .. stagger-5`). Hover on
cards lifts 2 px + subtle scale 1.01 + shadow bloom.

## 5 · Bilingual + RTL requirements

- `<html lang>` and `dir` swap live via a header toggle. Layout uses
  Tailwind logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`,
  `start-*`, `end-*`) — no `pl-*` / `pr-*` in components.
- Arabic font (`Tajawal`) auto-applied via `html[dir="rtl"] body`.
  Fraunces is Latin-only — Arabic headings switch to Tajawal in
  `[dir="rtl"] h1, h2`.
- Chevrons, arrows, and stepper progress **mirror** when RTL. Icons keep
  their orientation (no mirrored search glass).
- All copy comes in `{ en, ar }` pairs.

### Punctuation: pick the mark for the job

This codebase does not use em dashes. That rule is enforced on the
dictionary, but it must be applied by rewriting the sentence, never by
swapping one character for another. A blind replacement produced real
breakage that had to be repaired: a parenthetical pair became two
separators, a select placeholder read `· Select course ·`, a date range
read `Aug 17 · Aug 23`, and definitions in the lecture summary read
`**Competitive Rivalry** · Intensity of competition`.

Use the mark the sentence actually needs:

| Intent | Use |
|---|---|
| Parenthetical aside | commas, or parentheses |
| Two joined clauses | a comma, or split the sentence |
| Term followed by its definition | a colon |
| A range (dates, numbers) | `to`, or an en dash `–` |
| "No value yet" in a table cell | an en dash `–`, never `·` |
| Genuine separator between peer items | `·` |

## 6 · Priority screens (build in this order)

Design each as a full page, with the **shared app chrome** (§7) always
visible.

### 6.1 · `/dashboard` — Today

A calm decision screen for a working MBA student. Ask how much time is available
(15 / 30 / 60 / 90 minutes), recommend one course with a factual reason, and link
to `/study?course_id=...&minutes=...`. The learner can override the suggestion.
Show at most three nearest open deadlines; reveal readiness details on request.
No grades means unknown readiness, not a blocked study action. Never fabricate
identity, notifications, exam dates, flashcard counts, or AI recommendations.
The first session is a self-guided review with a timer, personal notes and three
retrieval prompts. Notes persist only in the current browser tab, scoped by user
and course, with a download option and an honest storage warning. Practice does
not create official grades or alter readiness. Keep assets and legacy routes.

### 6.2 · `/ask-mba` — Ask My MBA agent (the killer feature)

Bilingual conversational chat with an MBA-domain agent.

- Left rail: session list (grouped by course), pinned threads on top,
  search.
- Centre column: chat transcript. Bubbles are glass panels, sender name
  is small caps above, timestamp on hover. Streaming responses render
  with a soft cursor. Every AI reply carries **inline source pills**
  (course PDF, lecture recording, Kotler chapter) — clickable, opens
  the source in a right-side drawer.
- The composer is **not** a plain textarea. It has: a chip strip above
  (`@course`, `@lecture`, `#topic`) that filters retrieval; a
  language-toggle pill (EN / AR); an attachment button
  (react-dropzone); a "Send + copy" secondary action.
- **Empty state**: three suggestion cards — "Explain Porter's 5 Forces
  in the Careem case", "Draft a 200-word answer to yesterday's HRM quiz
  Q3", "شرح ماتريكس بوسطن بالعربي" — each pre-fills the composer.
- **Model picker** in the top-right (Anthropic / OpenAI); saved per
  thread.

### 6.3 · `/study-packs` — Study Packs

An AI-generated study pack is a bundle of: summary + flashcards +
practice quiz + citations for one lecture or chapter.

- Grid of pack cards, filterable by course. Each card shows: cover
  gradient (course colour), pack title, "12 flashcards · 8 questions · 3
  min read", freshness badge ("Generated today"), progress bar (how many
  flashcards mastered).
- Prominent "Generate new pack" CTA at the top — opens a modal with a
  file dropzone + course picker + language.
- Pack detail view is a **3-tab** layout: Summary · Flashcards · Quiz.
  Flashcards are horizontal swipe (mobile) or arrow-keys (desktop). Quiz
  is one-question-at-a-time with immediate feedback + explanation.

### 6.4 · `/lecture` — Honest transcript capture and import

Use existing browser speech recognition only when supported, with a visible
warning that the browser provider may require an online service. This captures
the microphone, not system audio. Unsupported or failed recognition must show
an error; it must never substitute a sample transcript. There is no generated
AI summary or working email provider on this route. Offer a local transcript
download instead. An example requires an explicit click and stays labelled.
Accept an explicit Hader version-1 JSON export (maximum 2 MB), preserving segment
timestamps and live/import/demo provenance. Untimed segments remain untimed.
This does not add an ASR engine, automatic Hader sync, or server-side storage.

### 6.5 · `/courses` + `/courses/[id]`

- Index: grid of enrolled courses, each with colour band, next
  assignment, current grade, cover image.
- Detail: tabs for Syllabus · Lectures · Assignments · Grades · Files ·
  Group projects. Each tab is a dense table (Linear-style) with sticky
  header, keyboard row nav.

### 6.6 · `/calendar` + `/timeline`

- Calendar: month + week views using `react-day-picker`; overlay events
  for assignments, quizzes, lectures. Colour-coded per course.
  Drag-to-reschedule.
- Timeline: a horizontal Gantt showing the semester at a glance — each
  course as a swim lane, deadlines as pills.

### 6.7 · `/tasks`

- Kanban board (columns: To do · Doing · Waiting · Done) with drag-drop.
  Each card carries course badge, due date pill (colour-graded by
  urgency), one-line description. Keyboard shortcuts (J/K/X/Enter).

### 6.8 · `/subscription` + `/pricing`

- Public pricing page has 3 tiers: Free (limited) · Student · Pro.
  Two-column comparison, feature table, "Start free" CTA, monthly ↔
  annual toggle with "Save 20%" badge.
- Signed-in `/subscription` shows current plan, next billing date, usage
  meters (AI-tutor messages this month, storage), upgrade / cancel
  buttons that call the Stripe portal.

### 6.9 · `/settings`

- Left rail sections: Account · Notifications · Language & region · Data
  & privacy (PDPL — export my data / delete my account) · Integrations ·
  Developers (API keys).
- Right column: dense forms, save-on-blur with a toast confirmation.

### 6.10 · `/(public)` marketing

- Landing (`/`): hero (headline + subhead + primary CTA + secondary "See
  how it works" ghost), a live product screenshot (mobile + laptop
  mockup), 6 feature tiles, testimonials, pricing preview, footer.
- `/features`, `/how-it-works`, `/for-students`, `/pricing`, `/faq`,
  `/contact`, `/terms`, `/privacy` — same header/footer, one hero +
  content section each.
- Above-fold on landing has one clear CTA. No "Enter your email" nag
  before the user knows what the product does.

## 7 · Shared app chrome

Four primary sections: Today (`/dashboard`), My courses (`/courses`), Study
(`/study`), My deadlines (`/timeline`). The same four appear in the mobile drawer.
Account is secondary; Admin is visible only for a profile with the admin role,
without changing server authorization. Identity comes from `/api/profile`.
Use a neutral fallback, never another student's name or a fabricated plan badge.
Course tools link to existing file, pack, tutor, quiz, flashcard and lecture routes
with `course_id` context. Additional collaboration and learning tools remain
available from the course/study surface. Calendar and tasks remain under deadlines;
billing is under account. The dashboard also exposes announcements and weekly brief.
Onboarding is a single optional name/language screen, then one course name. Put
optional course metadata behind a disclosure. Save failures stay visible and never
navigate away as if completed. New surfaces ship Arabic and English together.
Retain existing tokens, fonts and assets. All touch targets are at least 44 px.

## 8 · Motion + interactions

- Page mount: parent uses `layout` + `AnimatePresence`, children
  `fade-up` staggered.
- Hover: card `translateY(-2px)` + shadow bloom, 180 ms easeOut.
- Cmd+K palette: modal springs in from 0.96 scale + backdrop blur 8 px.
- Progress bars: `animate-shimmer` at the leading edge while
  indeterminate.
- Ambient orbs: 4 large blurred coloured circles positioned in the
  corners of the viewport, drifting slowly (`animate-float-slow`, 20 s
  cycle, translate ± 40 px).
- `prefers-reduced-motion` disables all non-essential motion.

## 9 · Responsiveness

Design for these viewports: **360 · 390 · 768 · 1024 · 1440 · 1920**.
Mobile-first CSS. Touch targets ≥ 44 × 44 px. Type scale reduces on
`<sm` (h1 44→32, h2 32→24). Sidebar hides on `<lg`, replaced by bottom
tab bar.

## 10 · Accessibility (WCAG 2.2 AA)

- All text meets 4.5:1 contrast; large text and non-text UI 3:1.
- Keyboard-first navigation everywhere. Every interactive element has
  visible focus (2 px ring in brand-500 with 2 px offset).
- Every icon-only button has an `aria-label`.
- Modal dialogs trap focus, restore on close, close on Escape.
- Live regions announce toasts + streaming AI responses.
- RTL layouts pass the same audit; do not lose logical order.

## 11 · Constraints — what NOT to do

- No purple-to-pink gradients, no rainbow accents, no glow-on-every-
  button.
- No stock "AI" 3D illustrations, no generic hero photo of "students
  studying".
- No emojis in navigation, buttons, or headings (allowed only in user-
  generated content).
- No skeuomorphic drop shadows on text.
- No "Coming soon" placeholders — if a screen isn't ready, don't render
  it.
- No English-only labels on RTL screens; both languages ship together,
  not "add Arabic later".
- No autoplay video, no sound.
- No cookie banner on landing beyond the actual PDPL requirement.

## 12 · Tech constraints (for code-generating tools)

- **Framework**: Next.js 14 App Router (`src/app`), TypeScript, React
  18, `use client` only where needed.
- **Styling**: Tailwind CSS (config already defined), `clsx`, no CSS-
  in-JS.
- **Components**: shadcn/ui as the base, extended with the design
  tokens above. Icons from `lucide-react`.
- **Motion**: `framer-motion` v12.
- **Forms**: `react-hook-form` + `zod` for validation.
- **Charts**: `recharts` (already installed).
- **Dates**: `date-fns` + `react-day-picker`.
- **Uploads**: `react-dropzone`.
- **Auth data**: assume `@supabase/ssr` and RLS-scoped queries — don't
  design flows that require public reads of private tables.
- **Payments**: Stripe Checkout redirect, not embedded card fields.
- **Output structure**: one file per route
  (`src/app/(app)/dashboard/page.tsx`), shared components in
  `src/components/`, hooks in `src/hooks/`, types in `src/lib/types.ts`.

## 13 · Tool-specific tuning

**v0.dev (recommended, matches stack):**

- Paste §1–§12 as the prompt. In the first message, name shadcn
  primitives you want: `Card`, `Button`, `Tabs`, `Sheet`, `Dialog`,
  `Command`, `Badge`, `Skeleton`.
- Iterate one screen at a time, starting with `/dashboard`. Ask v0 to
  "extend the same design system" on each subsequent screen.
- End every prompt with: *"Do not use any purple gradient. Do not use
  lucide's `Sparkles` icon."*

**Lovable:**

- Paste §1–§12 as the initial brief. Explicitly say: *"Use the
  Next.js 14 App Router with Supabase Auth Helpers. Do not create a new
  backend."*
- Ask for the marketing site + auth flow + dashboard as separate builds
  so you can review each.

**Bolt (StackBlitz):**

- Same as v0. Prefer Bolt when you want a fully-runnable preview in-
  browser without deploying.

**Figma Make / Framer AI (design-only, no code):**

- Feed §1–§11 (skip §12). Ask for a component library first
  (typography, colours, buttons, cards, inputs, badges, glass surfaces),
  then compose the screens from it. Include one dark-mode variant of the
  dashboard.
- Explicitly request bilingual mockups: one EN screen and its RTL
  Arabic mirror, side by side.

**Galileo AI / Uizard:**

- Paste §1–§4 + §6 + §11. These tools work best with dense product
  briefs and short screen lists.

## 14 · Priming line (paste as the very first sentence)

> *"Design a bilingual (English + Arabic RTL) SaaS product called
> Tweenz AI Learning OS ('Maktab') for UAE MBA students — a single
> workspace for courses, AI tutoring, study packs, tasks, and grades.
> Adult, calm, glassmorphic on soft blue-white, ambient orbs, Space
> Grotesk + Fraunces + Tajawal. No AI clichés."*

---

_Version 2. Update this file when tokens (`src/app/globals.css`,
`tailwind.config.ts`) or route structure (`src/app/(app)/**`) change —
the prompt drifts if the code drifts._
