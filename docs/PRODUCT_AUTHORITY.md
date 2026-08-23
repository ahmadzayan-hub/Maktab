# Product Authority — Maktab · مكتب

## Primary User

A working adult studying alongside a job — an MBA candidate, a
professional certification, a part-time degree. Time is the scarce
resource, not motivation.

## Job To Be Done

Know what to study next, and why that and not something else — based on
the learner's own graded work rather than on how long they have been
logged in.

## System of Record

Courses, deadlines, tasks, graded work, study sessions, tutor
conversations, templates and generated study packs.

## System of Intelligence

Readiness: how prepared this learner is for each course, derived from
their actual grades, and what to do with the next free block of time.

## Primary Workflow

```
courses and deadlines in
  → graded work accumulates
    → readiness computed per course
      → study plan for the time actually available
        → session
          → readiness moves
```

## Human Decision Boundary

- **Readiness comes from graded work, or it does not exist.** A course
  with nothing graded reports "No graded work yet" and no score. It does
  not report a plausible-looking number, and it does not fall back to
  activity as a proxy for understanding.
- **No fabricated encouragement.** No invented streaks, no progress rings
  filled from a number that means nothing else. If the screen shows a
  figure, something real produced it.
- The plan proposes; the learner chooses. Study blocks have a floor of
  15 minutes because a five-minute suggestion is noise, not a plan.
- AI-generated surfaces are labelled as such.

## Measurable Outcome

**North star:** readiness at the moment of assessment.

Supporting: graded coverage per course, planned time actually used,
deadlines met without a final-week scramble.

## Explicit Non-Goals

- Not a presentation tool → **Pitchora**
- Not a document-understanding product → **Mutabasir**
- Not a commerce system → **Masaar**
- Not a prompt-management product → **PromptOps**
- Not a course marketplace, and not a credential issuer

## External Systems

- **Supabase** — Postgres, Auth, Storage.
- **Stripe** — subscriptions. The hard boundary: customer, subscription
  and payment records live outside this repository entirely, keyed by ids
  the database stores. Renaming the repo is safe; changing the Supabase
  project is not, unless the Stripe keys move with it.
- Model provider for the tutor and study packs.

## Data Ownership

Maktab owns courses, deadlines, tasks, grades, sessions and study packs.
Billing state is Stripe's; Maktab holds references, never a copy it
edits.

## Canonical Repository

`github.com/ahmadzayan-hub/Maktab` · branch `main`

Absorbed the `tweenz-ai` identity. A full copy of this application's
routes still exists inside `Pitchora-studio-Private`, inherited from the
original monorepo; that copy is not authoritative and nothing should be
built on it.

## Production Deployment

Vercel project `maktab`.

## Known limitations

- The tutor and study-pack generation need a configured model provider;
  without one those surfaces return an "unavailable" envelope rather than
  failing loudly, which is deliberate but easy to mistake for working.
- Demo data is anchored to the current date so the app never shows
  items 100 days overdue on a fresh install. Useful for demos, and a
  reason not to read demo numbers as real ones.
