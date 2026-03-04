# Story 5.3: Security review document

Status: review
Assignee: AI

## Story

As a QA engineer,
I want a documented security review of the codebase covering common web vulnerabilities,
So that stakeholders can see that security has been evaluated and any issues addressed.

## Acceptance Criteria

1. **Given** the full codebase (frontend + backend),
   **When** the review is performed,
   **Then** a markdown report is produced at `docs/qa-security-review.md`.

2. **Given** the report,
   **When** I read it,
   **Then** it covers at minimum: XSS, SQL/NoSQL injection, input validation, dependency vulnerabilities, HTTPS/transport security, and CORS configuration.

3. **Given** each finding,
   **When** documented,
   **Then** it includes severity, current status (mitigated / not applicable / needs action), and evidence.

## Tasks / Subtasks

- [x] Review backend routes for injection risks (Prisma parameterised queries, schema validation)
- [x] Review frontend for XSS risks (React auto-escaping, dangerouslySetInnerHTML usage)
- [x] Check input validation and sanitisation (both client and server)
- [x] Run `npm audit` and document dependency vulnerability status
- [x] Review CORS, headers, and transport security configuration
- [x] Produce `docs/qa-security-review.md`

## Dev Agent Record

### Implementation Plan

Performed a full manual code-review-based security audit across all six required areas. Evidence was gathered by reading codebase files directly. `npm audit` was executed at root, backend, and frontend scopes.

### Completion Notes

- **SQL Injection:** All DB operations use Prisma ORM parameterised methods — fully mitigated. No `$queryRaw`/`$executeRaw` usage found.
- **XSS:** Zero `dangerouslySetInnerHTML` in application source (all hits were Next.js build artefact internals). React auto-escaping in place throughout.
- **Input Validation:** Fastify JSON schema validation on all mutating endpoints; trim + re-validate pattern applied. Gap identified: no `maxLength` on `text` field — documented as low-severity finding.
- **Dependencies:** 3 high-severity vulns in `tar-fs` via `testcontainers` (devDependency only). Backend and frontend production packages: 0 vulnerabilities. Documented with fix path (`npm audit fix --force` → testcontainers v11).
- **Transport Security:** HTTP-only in current Docker Compose setup. Documented as production hardening requirement; architecture correctly uses internal proxy pattern.
- **CORS:** No `@fastify/cors` registered; not required for current reverse-proxy architecture. Documented risk for future direct-access scenarios.
- **Security Headers:** None configured (CSP, X-Frame-Options, X-Content-Type-Options etc.). Documented with recommended `next.config.ts` additions.

All findings include severity, current status (mitigated / needs action / not applicable), and evidence references per AC 3.

## File List

- `docs/qa-security-review.md` (created)
- `_bmad-output/implementation-artifacts/5-3-security-review.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

## Change Log

- 2026-03-04: Produced `docs/qa-security-review.md` — full security audit covering XSS, SQL injection, input validation, dependency vulnerabilities (npm audit), HTTPS/transport security, CORS, and security headers.
