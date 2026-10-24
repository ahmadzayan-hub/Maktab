# Bounded schema validation security update

Pins Zod to 4.6.7 for GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404). The advisory marks releases below 4.6.6 affected. The maintainer says v3 releases are no longer published; their disagreement about severity is not used as an audit suppression.

- Advisory: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- v3 status: https://github.com/colinhacks/zod/issues/6653
- Migration reference: https://zod.dev/v4/changelog

This is a major-version dependency migration. Omitted template bodies remain optional and retain normalization to empty sections/slots/defaults. Detailed Zod messages and issue codes may change; public flattened error envelopes remain. UUID/email checks are stricter in v4, so invalid legacy values are not promised compatibility.

Legacy session answers and extension clarification requests now reject more than 100 entries rather than walking unbounded invalid arrays. These are new generous request limits requiring product review, not claims about existing pagination or maximum question counts. The current clarification pipeline normally starts from at most six gaps; externally supplied batches may historically exceed that. Oversize requests receive the existing 400 invalid_body envelope. No database or model call follows failed validation.

The Hader import keeps its 2 MB raw file guard and 10,000-segment maximum; v4 now rejects over-limit arrays with one issue before element parsing/refinement.

## Scope and residual risk

The patch does not cap general JSON reception/parsing, string accumulation, request rates, template normalization, arbitrary records, or non-Zod loops. Only explicitly bounded arrays gain the fixed early termination. A clean dependency audit is not a comprehensive denial-of-service guarantee. No auth, permissions, database schema, paid-provider settings, deployment or broad dependency changes are included.

All security fixtures are synthetic. No resource-exhaustion attack, live database action, real account, provider call or external credentials are used. Local focused tests with reused dependencies do not replace a clean frozen-lockfile install and exact-head CI.
