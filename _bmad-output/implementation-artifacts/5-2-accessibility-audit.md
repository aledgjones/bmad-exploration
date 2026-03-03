# Story 5.2: Accessibility audit with axe-core

Status: ready-for-dev
Assignee: AI

## Story

As a QA engineer,
I want an automated accessibility audit integrated into the E2E test suite,
So that WCAG AA compliance is verified on every test run and a report is generated.

## Acceptance Criteria

1. **Given** the E2E test suite,
   **When** tests run,
   **Then** at least one test performs an axe-core accessibility scan on the main page in its default, empty, and populated states.

2. **Given** the axe-core scan results,
   **When** critical or serious violations are found,
   **Then** the test fails with a clear summary of each violation (rule ID, impact, affected nodes).

3. **Given** a passing scan,
   **When** the test completes,
   **Then** a markdown accessibility report is generated at `docs/qa-accessibility-report.md` summarising the audit results.

## Tasks / Subtasks

- [ ] Install `@axe-core/playwright` as a dev dependency
- [ ] Add E2E test(s) that run axe scans on: empty state, populated state, error state
- [ ] Assert zero critical/serious violations
- [ ] Generate `docs/qa-accessibility-report.md` with findings

## Dev Notes

- Use `@axe-core/playwright` AxeBuilder with the existing Playwright + Vitest setup.
- Scope scans to WCAG 2.1 AA tags: `['wcag2a', 'wcag2aa']`.
