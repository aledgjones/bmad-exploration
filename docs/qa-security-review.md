# Security Review — bmad-todo

**Date:** 2026-03-04  
**Reviewer:** AI (Amelia — Dev Agent)  
**Scope:** Full codebase — frontend (Next.js/React), backend (Fastify/Prisma), infrastructure (Docker Compose)  
**Story:** 5.3 — Security review document

---

## Summary

| Area                            | Status                           |
| ------------------------------- | -------------------------------- |
| SQL/NoSQL Injection             | ✅ Mitigated                     |
| XSS                             | ✅ Mitigated                     |
| Input Validation & Sanitisation | ⚠️ Partially mitigated           |
| Dependency Vulnerabilities      | ⚠️ Needs action (dev-only)       |
| HTTPS / Transport Security      | ⚠️ Needs action (prod hardening) |
| CORS Configuration              | ⚠️ Needs action (prod hardening) |
| Security Headers                | ⚠️ Needs action                  |

---

## 1. SQL / NoSQL Injection

**Severity:** N/A — mitigated by ORM  
**Status:** ✅ Mitigated

**Evidence:**  
All database operations are performed via Prisma Client's type-safe ORM methods — no raw SQL strings:

```ts
// backend/src/routes/todos.ts
await fastify.prisma.todo.create({ data: { text, status: 'todo' } });
await fastify.prisma.todo.findMany({ orderBy: { createdAt: 'desc' } });
await fastify.prisma.todo.update({ where: { id: idNum }, data: updateData });
await fastify.prisma.todo.delete({ where: { id: idNum } });
```

Prisma uses parameterised queries internally, eliminating SQL injection risk. No `$queryRaw` or `$executeRaw` is used anywhere in the codebase.

**Recommendation:** None required. Maintain the convention of avoiding raw query methods.

---

## 2. XSS (Cross-Site Scripting)

**Severity:** N/A — mitigated by React/JSX  
**Status:** ✅ Mitigated

**Evidence:**

- **`dangerouslySetInnerHTML`:** A codebase-wide search across all application source files (`frontend/app/**`, `frontend/src/**`, `frontend/components/**`) returned **zero matches**. All `dangerouslySetInnerHTML` occurrences are confined to Next.js internal build artefacts (`.next/` directory) and are not application code.
- **React auto-escaping:** All user-supplied content (todo `text` field) is rendered via React JSX text nodes and controlled `<input>` values, both of which escape HTML entities automatically. No raw HTML rendering path exists.
- **API layer:** `frontend/src/api/todos.ts` serialises user input as JSON body (`JSON.stringify({ text })`), not interpolated into any HTML or SQL context.

**Recommendation:** Maintain the convention of never using `dangerouslySetInnerHTML`. If rich-text input is ever required in future, adopt a sanitisation library (e.g., DOMPurify).

---

## 3. Input Validation and Sanitisation

**Severity:** Low  
**Status:** ⚠️ Partially mitigated

**Evidence — Strengths:**

- **Fastify JSON schema validation** is applied on all mutating endpoints:

  | Endpoint            | Validation                                                                                                                                   |
  | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
  | `POST /todos`       | `body.text`: `{ type: 'string', minLength: 1 }` — required                                                                                   |
  | `PATCH /todos/:id`  | `body.status`: enum `['todo', 'in_progress', 'done']`; `body.text`: `{ type: 'string', minLength: 1 }`; `anyOf` requiring at least one field |
  | `DELETE /todos/:id` | `params.id`: string; numeric guard via `Number.isNaN`                                                                                        |

- **Server-side trim + re-validation**: After schema validation, `text` is trimmed and re-checked for emptiness:

  ```ts
  text = text.trim();
  if (!text)
    return reply.code(400).send({ error: 'text must be a non-empty string' });
  ```

- **Enum enforcement**: `status` values are validated against a strict enum, both at the Fastify schema layer and enforced by Prisma's `Status` enum in `schema.prisma`.

**Gap — Missing max-length constraint:**

The `text` field has no `maxLength` constraint at either the Fastify schema layer or the Prisma model level. While PostgreSQL's `text` type has no hard limit, an adversary could submit extremely long strings, increasing storage and response payload size.

```ts
// current: no maxLength
text: { type: 'string', minLength: 1 }

// recommended: add maxLength
text: { type: 'string', minLength: 1, maxLength: 500 }
```

**Recommendation:** Add `maxLength: 500` (or suitable business limit) to the `text` field schema in `POST /todos` and `PATCH /todos/:id`.

---

## 4. Dependency Vulnerabilities

**Severity:** High (dev-only scope)  
**Status:** ⚠️ Needs action

**Audit results:**

```
npm audit (root workspace):
3 high severity vulnerabilities

npm audit (backend workspace):  0 vulnerabilities
npm audit (frontend workspace): 0 vulnerabilities
```

**Vulnerability detail:**

| Package              | Vulnerability                                           | Advisory                                                                 | Severity |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| `tar-fs` 2.0.0–2.1.3 | Symlink validation bypass (predictable destination dir) | [GHSA-vj76-c3g6-qr5v](https://github.com/advisories/GHSA-vj76-c3g6-qr5v) | High     |
| `tar-fs` 2.0.0–2.1.3 | Extract outside specified dir with crafted tarball      | [GHSA-8cj5-5rvv-wf4v](https://github.com/advisories/GHSA-8cj5-5rvv-wf4v) | High     |
| `tar-fs` 2.0.0–2.1.3 | Link following and path traversal via crafted tar file  | [GHSA-pq67-2wwv-3xjx](https://github.com/advisories/GHSA-pq67-2wwv-3xjx) | High     |

**Dependency chain:**

```
testcontainers@^9.1.5 (devDependency, root package.json)
  └─ dockerode@3.0.0–4.0.4
       └─ tar-fs@2.0.0–2.1.3  ← vulnerable
```

**Scope / Risk Assessment:**

`testcontainers` is declared in `devDependencies` in the root `package.json`. It is **not present in production Docker images** (backend and frontend workspaces have 0 vulnerabilities). Exploitation of these `tar-fs` vulnerabilities requires a crafted tarball to be extracted — this only occurs in dev/CI environments when testcontainers pulls and unpacks Docker images.

**Recommendation:**

1. **Immediate (low-effort):** Track this in the project's risk register. No production exposure exists.
2. **Short-term:** Run `npm audit fix --force` to upgrade `testcontainers` to `^11.12.0`. This is a breaking change — review testcontainers migration guide and update `e2e/compose-helper.ts` accordingly.
3. **CI:** Add `npm audit --audit-level=high` to the CI pipeline, scoped to exclude devDependencies in production contexts.

---

## 5. HTTPS / Transport Security

**Severity:** Medium (production context)  
**Status:** ⚠️ Needs action (production hardening required)

**Evidence:**

The application is deployed exclusively over HTTP in the current Docker Compose configuration:

```yaml
# docker-compose.yml
frontend:  ports: ["3000:3000"]   # HTTP
backend:   ports: ["4000:4000"]   # HTTP
```

Inter-service communication (frontend → backend) uses HTTP within the Docker network, proxied via Next.js rewrites:

```ts
// frontend/next.config.ts
source: '/todos', destination: `${backendUrl}/todos`  // backendUrl = http://backend:4000
```

This is appropriate for a development/internal deployment where TLS is terminated upstream.

**Findings:**

- No TLS termination is configured at the application level.
- The `backend/src/start.ts` binds to `0.0.0.0` on HTTP.
- No HTTP → HTTPS redirect is in place.
- No HSTS header (`Strict-Transport-Security`) is set.

**Recommendation:**

For production deployment:

1. Terminate TLS at a reverse proxy (nginx, AWS ALB, Cloudflare, etc.) in front of the frontend container.
2. Do not expose the backend port (`4000`) publicly — it should only be reachable from the frontend container or internal VPC.
3. Add HSTS header once HTTPS is in place (see Security Headers section).

---

## 6. CORS Configuration

**Severity:** Medium (production context)  
**Status:** ⚠️ Needs action (production hardening)

**Evidence:**

No CORS middleware is registered on the Fastify backend. A search for `@fastify/cors` or any `Access-Control-Allow-Origin` header configuration found no matches in the backend codebase.

**Current architecture mitigates direct browser exposure:**

In the Docker Compose setup, the browser communicates only with the Next.js frontend (port 3000). Next.js proxies API calls to the backend via server-side rewrites (`next.config.ts`). The browser never makes direct cross-origin requests to `http://backend:4000`, so no CORS headers are required for normal operation.

**Risk:**

If the backend port (`4000`) is ever exposed directly to the internet without a CORS policy, any origin could make credentialled API requests to it.

**Recommendation:**

1. **Do not expose backend port `4000` publicly.** Keep it internal to the Docker network.
2. If direct backend access is ever required (e.g., for a mobile client), add `@fastify/cors` with an explicit `origin` allowlist:
   ```ts
   fastify.register(require('@fastify/cors'), {
     origin: ['https://yourdomain.com'],
     methods: ['GET', 'POST', 'PATCH', 'DELETE'],
   });
   ```

---

## 7. Security Headers

**Severity:** Low–Medium  
**Status:** ⚠️ Needs action

**Evidence:**

Neither the Next.js frontend (`next.config.ts`) nor the Fastify backend defines HTTP security response headers. The following headers are absent:

| Header                            | Purpose                                              | Status     |
| --------------------------------- | ---------------------------------------------------- | ---------- |
| `Content-Security-Policy`         | Restricts resource loading origins, mitigates XSS    | ❌ Not set |
| `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing                          | ❌ Not set |
| `X-Frame-Options: DENY`           | Prevents clickjacking via iframe embedding           | ❌ Not set |
| `Referrer-Policy: no-referrer`    | Prevents referrer leakage                            | ❌ Not set |
| `Strict-Transport-Security`       | Enforces HTTPS (requires HTTPS to be in place first) | ❌ Not set |
| `Permissions-Policy`              | Restricts browser feature access                     | ❌ Not set |

**Recommendation:**

Add security headers to `next.config.ts`:

```ts
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        },
      ],
    },
  ];
},
```

Note: `CSP` value should be tightened once the application's full asset sources are enumerated. `'unsafe-inline'` for scripts should be replaced with nonces or hashes when possible.

---

## Appendix: Files Reviewed

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `backend/src/routes/todos.ts`          | CRUD API routes — injection and validation review |
| `backend/src/app.ts`                   | Fastify app setup — plugin registration review    |
| `backend/src/start.ts`                 | Server bootstrap — binding and transport review   |
| `backend/src/plugins/prisma.ts`        | PrismaClient lifecycle — ORM connection review    |
| `backend/src/plugins/sensible.ts`      | Error utilities — no security concerns            |
| `backend/prisma/schema.prisma`         | Data model — type and constraint review           |
| `frontend/app/page.tsx`                | Main page component — XSS review                  |
| `frontend/app/components/TodoItem.tsx` | Todo item component — XSS review                  |
| `frontend/src/api/todos.ts`            | API client — input and serialisation review       |
| `frontend/next.config.ts`              | Next.js config — headers and proxy review         |
| `docker-compose.yml`                   | Infrastructure — transport and exposure review    |
| `package.json` (root)                  | Dependencies — `npm audit`                        |
| `backend/package.json`                 | Dependencies — `npm audit`                        |
| `frontend/package.json`                | Dependencies — `npm audit`                        |
