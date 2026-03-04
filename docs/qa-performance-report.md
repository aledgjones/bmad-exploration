# QA Performance Report — bmad-todo

**Date:** 2026-03-04
**Environment:** Docker Compose production stack (Next.js production build + Fastify + PostgreSQL)
**Frontend URL:** http://localhost:3000
**API URL:** http://localhost:4000
**Tool:** Lighthouse CLI 13.0.3 (headless Chrome) + custom Node.js HTTP benchmark

---

## Lighthouse Scores

| Category       | Score     | Status          |
| -------------- | --------- | --------------- |
| Performance    | 98 / 100  | ✅ Excellent    |
| Accessibility  | 94 / 100  | ⚠️ Minor issues |
| Best Practices | 100 / 100 | ✅ Perfect      |

---

## Core Web Vitals

| Metric                         | Value | Target   | Status               |
| ------------------------------ | ----- | -------- | -------------------- |
| First Contentful Paint (FCP)   | 0.8 s | ≤ 1.0 s  | ✅ Pass              |
| Largest Contentful Paint (LCP) | 2.5 s | ≤ 2.5 s  | ✅ Pass (borderline) |
| Time to Interactive (TTI)      | 2.5 s | —        | ✅ Good              |
| Total Blocking Time (TBT)      | 60 ms | ≤ 200 ms | ✅ Pass              |
| Cumulative Layout Shift (CLS)  | 0     | ≤ 0.1    | ✅ Pass              |
| Speed Index                    | 0.8 s | —        | ✅ Good              |

---

## API Response Times

Benchmarked via direct HTTP calls (5 warm runs per endpoint, after a warm-up request). All measurements taken against the running Docker Compose stack on localhost.

| Endpoint                   | Avg   | Min  | Max   | Target   | Status  |
| -------------------------- | ----- | ---- | ----- | -------- | ------- |
| GET /todos (list all)      | 5 ms  | 2 ms | 8 ms  | < 100 ms | ✅ Pass |
| POST /todos (create)       | 10 ms | 8 ms | 14 ms | < 100 ms | ✅ Pass |
| PATCH /todos/:id (update)  | 9 ms  | 7 ms | 13 ms | < 100 ms | ✅ Pass |
| DELETE /todos/:id (delete) | 7 ms  | 6 ms | 9 ms  | < 100 ms | ✅ Pass |

All API endpoints respond well under the 100 ms target, with typical round-trip times in single-digit milliseconds.

---

## Issues Found

### Performance

| Severity | Issue                    | Detail                                                                                                               |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Low      | Unused JavaScript        | ~51 KiB of unused JS detected; potential savings via code splitting                                                  |
| Low      | Render-blocking requests | Estimated 110 ms savings possible by deferring non-critical resources                                                |
| Low      | Legacy JavaScript        | ~13 KiB savings from removing older polyfill transforms                                                              |
| Info     | LCP borderline           | LCP of 2.5 s sits at the exact Core Web Vitals "Good" boundary; worth monitoring under real-world network conditions |

### Accessibility (score 94 — 2 failing audits)

| Severity | Issue          | Detail                                                                                     |
| -------- | -------------- | ------------------------------------------------------------------------------------------ |
| Medium   | Color contrast | One or more text/background colour combinations do not meet WCAG AA contrast ratio (4.5:1) |
| Low      | Heading order  | Heading elements (`h1`–`h6`) are not in a sequentially-descending order                    |

---

## Recommendations

1. **Fix colour contrast** — Review and adjust any text colours (likely status badge labels or placeholder text) to achieve a minimum 4.5:1 contrast ratio against their background.
2. **Fix heading hierarchy** — Ensure heading levels do not skip (e.g. `h1` → `h3`); use `h2` for sub-sections.
3. **Monitor LCP under production network conditions** — LCP at 2.5 s is technically "Good" but leaves no margin; adding a `loading="eager"` hint to the hero/main content element or preloading the main bundle could improve this.
4. **Investigate render-blocking resources** — Consider deferring or inlining critical CSS and lazy-loading non-essential scripts to recover the estimated 110 ms.
5. **Code-split large JS chunks** — Next.js dynamic imports (`next/dynamic`) can reduce the 51 KiB of unused JavaScript that Lighthouse flagged.

---

## Summary

The application performs **very well** against both targets defined in the specification:

- ✅ **API response times** all under 15 ms — significantly below the 100 ms target.
- ✅ **First Contentful Paint** at 0.8 s — meets the ≤ 1 s frontend paint target.

The two most actionable improvements are fixing the colour contrast and heading-order accessibility issues, which would bring the Accessibility score to 100. The performance score of 98 is production-ready as-is.
