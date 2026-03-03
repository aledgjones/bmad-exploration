# Story 5.3: Security review document

Status: ready-for-dev
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

- [ ] Review backend routes for injection risks (Prisma parameterised queries, schema validation)
- [ ] Review frontend for XSS risks (React auto-escaping, dangerouslySetInnerHTML usage)
- [ ] Check input validation and sanitisation (both client and server)
- [ ] Run `npm audit` and document dependency vulnerability status
- [ ] Review CORS, headers, and transport security configuration
- [ ] Produce `docs/qa-security-review.md`
