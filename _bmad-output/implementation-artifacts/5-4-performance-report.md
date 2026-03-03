# Story 5.4: Performance testing report

Status: ready-for-dev
Assignee: Human (Aled)

## Story

As a QA engineer,
I want a documented performance analysis of the running application,
So that I can confirm it meets the <100ms API / ≤1s frontend paint targets.

## What to do

1. Start the app: `docker compose up --build`
2. Open Chrome DevTools → **Network** tab → note API response times for creating/listing/updating/deleting todos
3. Run a Lighthouse audit (Chrome DevTools → Lighthouse → check Performance + Best Practices)
4. Screenshot or export the results
5. Create `docs/qa-performance-report.md` with:
   - Lighthouse scores (Performance, Accessibility, Best Practices)
   - Observed API response times (are they under 100ms?)
   - First Contentful Paint time (under 1s?)
   - Any issues found and recommendations

Keep it brief — a table of scores and a short summary paragraph is enough.
