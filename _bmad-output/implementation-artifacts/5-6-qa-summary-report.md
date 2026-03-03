# Story 5.6: Consolidated QA summary report

Status: ready-for-dev
Assignee: AI

## Story

As a training reviewer,
I want a single QA report consolidating coverage, accessibility, and security findings,
So that all quality evidence is in one place.

## Acceptance Criteria

1. **Given** the coverage output, accessibility report, and security review already exist,
   **When** this story is executed,
   **Then** a consolidated `docs/qa-summary-report.md` is produced.

2. **Given** the report,
   **When** I read it,
   **Then** it includes: coverage percentages (frontend + backend), accessibility audit result, security review summary, and an overall pass/fail assessment against the spec's success criteria.

## Tasks / Subtasks

- [ ] Extract latest coverage stats from `npm run coverage` output
- [ ] Summarise accessibility audit findings from `docs/qa-accessibility-report.md`
- [ ] Summarise security review findings from `docs/qa-security-review.md`
- [ ] Include performance summary from `docs/qa-performance-report.md` (if available)
- [ ] Produce `docs/qa-summary-report.md`

## Dev Notes

- This story depends on stories 5.2, 5.3, and ideally 5.4 being done first.
- Run after the other QA stories are complete.
