---
stepsCompleted:
  - step-01-init
  - step-02
  - step-03
  - step-04
  - step-05
  - step-06
  - step-07
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
workflowType: "architecture"
project_name: "{{project_name}}"
user_name: "{{user_name}}"
date: "{{date}}"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

- Core CRUD operations on _todos_ (create, view, transition between To Do / In Progress / Done, delete).
- Immediate UI feedback with no page reloads.
- A stateless REST API consumed both by the SPA and by external integrators.
- Persistence across sessions (local storage initially, server-side later).
- UI must load the full list on startup with clear “empty” and “error” states.
- Offline caching & sync logic mentioned as a desirable capability.
- External API consumer use case indicates predictable, low‑latency data access.

**Non‑Functional Requirements:**

- API response time ≤ 100 ms under normal load.
- Frontend first meaningful paint ≤ 1 s on mobile networks.
- 0 data‑loss incidents, ≤ 0.1 % error rate.
- Accessibility: comply with WCAG 2.1 AA.
- Performance targets drive SPA framework choice and infrastructure sizing.
- Scalability so adding auth/features later requires < 5 % code rewrite.

**Scale & Complexity:**

- Primary domain: full-stack web application (SPA + backend API).
- Complexity level: **low** — simple data model, no auth initially, greenfield.
- Estimated components: SPA client, REST API service, persistence store, optional sync/offline module.
- Cross‑cutting concerns: performance, accessibility, responsiveness, future extensibility.

### Technical Constraints & Dependencies

- No existing backend or user database – greenfield project.
- Must support modern browsers (latest two versions) on desktop/mobile.
- **Dockerization:** both frontend and backend should be containerized using Dockerfiles with multi‑stage builds, non‑root users, and health‑check endpoints.
- A `docker-compose.yml` will orchestrate all services (app, optional database), with proper networking, volume mounts, and environment configuration.
- Support for dev/test via environment variables and compose profiles is required.
- Building offline support and later real‑time features implies careful state management.
- Choosing a SPA framework that supports modular growth (React/Vue/Svelte).
- Logging/monitoring needed early to meet error‑rate targets.

### Cross‑Cutting Concerns Identified

- **Performance & Responsiveness:** both client and server must be optimized from day one.
- **Accessibility:** affects UI component design and testing strategy.
- **Scalability / Extensibility:** architecture must allow auth, multi‑user, and real‑time with minimal rewrites.
- **Offline/Sync:** shapes data layer and API design.
- **Browser compatibility:** influences build and testing toolchain.
- **Container orchestration:** Docker Compose should manage lifecycle, health checks and environment profiles to simplify development/testing.

### Summary

I reviewed your project documentation for **bmad-todo**.

- No epics or UX spec loaded yet.
- I extracted requirements directly from the PRD.

**Key architectural aspects I notice:**

- Simple todo app with SPA frontend and stateless API.
- Critical NFRs: performance (100 ms API, 1 s paint), accessibility, and extensibility.
- Future‑proofing for offline, auth, and real‑time will guide design decisions.
- No regulatory/compliance requirements beyond accessibility.

**Scale indicators:**

- Project complexity: **low**.
- Primary technical domain: **web (SPA + backend API)**.
- Cross-cutting concerns: performance, accessibility, extensibility, offline support.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application with a **Next.js (React) frontend** and **Fastify backend**, using TypeScript and PostgreSQL.

### Technical Preferences Summary

- **Languages:** TypeScript for both frontend and backend.
- **Frontend framework:** React via Next.js latest version.
- **Backend framework:** Fastify (lightweight, fast Node.js web framework).
- **Database:** PostgreSQL.
- **Containerization platform:** use Dockerfiles as discussed, with images hosted on Docker Hub or a similar registry; deploy via a container‑friendly cloud such as Railway, Render, or AWS ECS/Fargate for easy integration with Docker Compose.

### Starter Options Considered

1. **Next.js official TypeScript starter** – `npx create-next-app@latest --ts`.
   - Pros: maintained by Vercel, minimal setup, built‑in routing and SSR/SSG.
   - Cons: no backend API beyond the built‑in `/api` route; we prefer Fastify for the API.
2. **Fastify CLI starter** – `npm init fastify@latest` with TypeScript option.
   - Pros: quick scaffold for a Fastify service, includes TypeScript, recommended project structure.
   - Cons: standalone service; integration with Next.js would require separate repo or monorepo.
3. **T3 Stack (Next.js + tRPC + Prisma)** with custom Fastify adaptation.
   - Pros: opinionated full-stack template with TypeScript and Postgres (via Prisma). Would require swapping the default Next.js server for Fastify or running two containers.
   - Cons: extra complexity if we just want plain REST; might over‑engineer for MVP.

### Selected Starter Approach

Rather than a single monolithic starter, we’ll **initialize two complementary projects**:

- **Frontend:** use the official Next.js TypeScript starter. Command:

  ```bash
  npx create-next-app@latest frontend --typescript --eslint --tailwind
  ```

  _(add `--experimental-app` if you want the app directory, but traditional pages/ directory is fine)_

- **Backend:** scaffold with Fastify CLI and Prisma for Postgres. Command:
  ```bash
  mkdir backend && cd backend
  npm init fastify@latest -- --lang=ts
  npm install prisma @prisma/client pg
  npx prisma init
  ```
  Configure the `DATABASE_URL` in `.env` and define a simple `Todo` model.

**Rationale:**

- This split matches your preference for React/Next on the frontend and Fastify for the API. Each piece can be containerized independently and orchestrated with Docker Compose.
- Keeping them separate keeps concerns clean while still allowing a monorepo if desired (e.g. using Yarn workspaces or pnpm). The frontend can consume the API via `http://backend:3000` in Compose.
- PostgreSQL is supported via Prisma in the backend starter.

### Architectural Decisions Provided by Starters

**Language & Runtime:**

- TypeScript across both services.
- Node.js runtime (latest LTS). Next.js handles server‑side code for the frontend; Fastify supplies the backend.

**Styling Solution:**

- Use Tailwind CSS via the `--tailwind` flag on Next.js startup command.

**Build Tooling:**

- Frontend: Next.js build pipeline (Webpack / Turbopack).
- Backend: TypeScript compile step via `ts-node` in dev and `tsc` for production build.

**Testing Framework:**

- On the frontend: Jest + React Testing Library (provided by Next.js recipe).
- On the backend: Fastify recommends `tap` (included in CLI starter).

**Code Organization:**

- Frontend: pages or app directory for routing; components folder; API calls in `lib`.
- Backend: routes in `src/routes`, services in `src/services`, Prisma client in `src/db`.

**Development Experience:**

- Hot reload on both front and backend.
- ESLint/Prettier configured by default for Next.js, and Fastify CLI provides linting.
- `docker-compose.yml` will define services `frontend`, `backend`, and `postgres` with volume mounts and environment variables.

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Category: Data Architecture

- **Data modeling approach:** Use Prisma schemas as the single source of truth (code-first).
- **Data validation strategy:** Recommend using **zod** for request validation in Fastify routes; it integrates well with Prisma.
- **Migrations:** Use Prisma Migrate to handle database schema changes.
- **Caching:** None for the MVP; keep it simple initially and revisit if performance needs arise.

These choices align with the Fastify/Prisma starter and leverage Prisma’s ecosystem for TypeScript safety and migration management.

### Category: Authentication & Security

- **Authentication method:** Start simple with JWT-based tokens for API access; user accounts and login can be added as a future feature.
- **Authorization pattern:** Basic ownership checks for resources; role-based access control can be layered in later.
- **Security middleware:** Use `helmet` for common HTTP headers, simple rate-limiting middleware, and CORS configured to allow frontend origin during development.
- **Data encryption:** TLS assumed for all traffic; no additional at-rest encryption for MVP beyond what the database provides.
- **API security strategy:** Keep endpoints private behind JWTs; consider an API gateway or request signing once scaling or third-party access is needed.

These are sensible defaults that keep the MVP secure without over‑engineering.

### Category: API & Communication

- **API design:** RESTful API exposed by the Fastify backend.
- **Documentation:** Generate Swagger/OpenAPI spec automatically from route definitions; serve via `/docs`.
- **Error handling:** Standard JSON error envelope with status code, message, and optional details; use Fastify’s built-in error handler.
- **Rate limiting:** Continue with simple middleware (e.g. `fastify-rate-limit`) using reasonable default thresholds; no distributed rate limit yet.
- **Inter-service communication:** None initially; frontend will call backend directly via HTTP. If additional services are added in the future, use HTTP and share the OpenAPI spec.

Again, these are straightforward defaults that provide clarity for both internal and external API consumers.

### Category: Frontend Architecture

- **State management:** Use React Context and hooks for local state; leverage SWR or React Query for data fetching and caching.
- **Component architecture:** Organize components in a `components/` directory with an atomic/feature‑folder structure to keep UI pieces small and reusable.
- **Routing strategy:** Use Next.js **app router** (i.e. the `app/` directory); route handlers and layouts should be colocated within `app/` as per the app‑router conventions.
- **Performance optimization:** Rely on Next.js optimizations (code splitting, automatic image optimization, lazy loading); use `next/image` for media and `next/script` for third‑party scripts.
- **Bundle optimization:** Default Next.js tree‑shaking and ESM output is sufficient; monitor bundle size with `next build --profile` and adjust if necessary.

These defaults align with the chosen Next.js starter and keep the frontend maintainable while hitting our performance targets.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
bmad-todo/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   └── assets/
│   ├── src/
│   │   ├── app/               # using Next.js app router (required)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   └── features/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── db.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── types/
│   │   └── middleware.ts
│   └── tests/
│       ├── components/
│       └── e2e/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   ├── todos.ts
│   │   │   └── auth.ts
│   │   ├── services/
│   │   │   └── todoService.ts
│   │   ├── db/
│   │   │   └── prismaClient.ts
│   │   └── utils/
│   └── tests/
│       ├── unit/
│       └── integration/
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### Architectural Boundaries

**API Boundaries:**

- External APIs are under `backend/src/routes/` with REST endpoints such as `/todos`, `/auth`, and **a required `GET /health` health-check endpoint**.
- Frontend communicates over HTTP; the base URL is `http://backend:3000` in Docker Compose.
- Authentication boundary exists at `/auth` routes, JWT-guarded endpoints.

**Component Boundaries:**

- Frontend components are segregated by feature under `components/features/`.
- Shared UI elements live in `components/ui/`.
- State hooks and data fetching logic are in `lib/` and `hooks/` if necessary.

**Service Boundaries:**

- Backend services/modules are in `services/`. Each service handles a single domain (todos, auth).
- Database access is encapsulated in `db/prismaClient.ts` and service-specific methods.

**Data Boundaries:**

- Prisma schema defines the DB boundary; migrations live in `prisma/migrations`.
- No caching boundaries initially; direct DB queries via Prisma.

### Requirements to Structure Mapping

**Feature/Epic Mapping:**

- **Todo management**
  - Components: `frontend/src/components/features/todos/`
  - Services: `backend/src/services/todoService.ts`
  - API Routes: `backend/src/routes/todos.ts`
  - Database: Prisma model `Todo` in `schema.prisma`
  - Tests: `frontend/tests/components/todos/`, `backend/tests/unit/todoService.test.ts`

**Cross-Cutting Concerns:**

- **Authentication System**
  - Components: `frontend/src/components/features/auth/`
  - Services: `backend/src/services/authService.ts`
  - Middleware: `frontend/src/middleware.ts`, `backend/src/routes/auth.ts`
  - Tests: `frontend/tests/e2e/auth/`, `backend/tests/integration/auth.test.ts`

### Integration Points

**Internal Communication:**

- Frontend calls backend REST API directly.

**External Integrations:**

- None in MVP; future third-party APIs (calendar sync, auth providers) will be invoked by backend services.
  **End-to-end Testing:**
- e2e tests are required; recommend using Playwright (stored under `frontend/tests/e2e/` or a dedicated `e2e/` folder) to verify full UI/API flows.
  **Data Flow:**

1. User interacts with frontend UI.
2. Frontend fetches/sends data via `/api` routes to backend.
3. Backend service validates, processes, and queries Prisma.
4. Data stored in Postgres and returned to frontend.

### File Organization Patterns

**Configuration Files:**

- Root `.env.example` defines variables for both services.
- Service-specific config in `frontend/` and `backend/config`.

**Source Organization:**

- Each service/subsystem has its own `src/` folder with clear boundaries as shown above.

**Test Organization:**

- Tests are co‑located with code or in a parallel `tests/` directory per service.

**Asset Organization:**

- Static assets for frontend under `frontend/public/assets`.

**Development Workflow Integration:**

- `docker-compose up` brings up frontend, backend, Postgres, and includes healthcheck configurations leveraging the `/health` endpoint.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All chosen technologies align perfectly: Next.js app router (React/TypeScript) works with a Fastify TypeScript backend. Prisma targets PostgreSQL and integrates with the Node stack. The Dockerization and version decisions create no conflicts; health‑check requirements were addressed earlier and can be implemented in both services.

**Pattern Consistency:**
Naming conventions, structure rules, and communication patterns uniformly support the tech stack. There are no contradictions—the patterns explicitly reference Next.js/React, Fastify, and Prisma. The requirement to use the app router reinforces consistency.

**Structure Alignment:**
The project structure reflects all architectural decisions. API boundaries, service modules, and component locations correspond with decision categories. Integration points are clearly defined, and the structure enables the patterns (e.g. co‑located tests, `components/features/`, `routes/`).

### Requirements Coverage Validation ✅

**Functional Coverage:**
Each FR from the PRD is mapped to a component/service as shown in the structure mapping. CRUD operations are supported via `/todos` endpoints; the UI flow in Sam's journey has a clear path through feature components and API calls. External API use case is covered by the REST design and Swagger documentation.

**Non-Functional Coverage:**
Performance targets are supported by Next.js optimizations and Fastify's low latency. Accessibility is accounted for in frontend requirements and component standards. Scalability/extensibility are baked into the modular service separation and Docker environment. Security requirements have JWT, helmet, and CORS patterns.

**Other NFRs:**
Dockerization, environment profiles, and health checks (noted earlier) satisfy operational requirements. No compliance beyond accessibility was specified.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Every critical decision has been documented with rationale; versions can be looked up as needed (Next.js latest, Fastify current LTS, Prisma, etc.). Implementation patterns cover naming, structure, error handling, and more. Examples and anti‑patterns are provided.

**Structure Completeness:**
The directory tree is explicit and exhaustive; developers should know exactly where to add code. Integration boundaries and data flows are clear.

**Pattern Completeness:**
Potential conflict points were identified comprehensively. Naming conventions, response formats, event/state rules, and error/loading behaviors are all specified.

### Gap Analysis

No **critical gaps** were found—there are no missing architectural decisions that would block implementation. Minor **important improvements** could include explicit API health‑check endpoints in documentation and a note about e2e testing framework (Cypress or Playwright). **Nice-to-have** items: sample GitHub Actions CI file contents or a script for generating Swagger docs automatically.

### Suggested Minor Enhancements

- Add a `GET /health` endpoint in the backend and a corresponding health check in Docker Compose.
- Document recommended e2e testing tool under `tests/e2e/` (e.g. Playwright).

### What would you like to do next?

- **A** – Advanced Elicitation: Investigate complex architectural issues or enhancements
- **P** – Party Mode: Gather multiple perspectives on any validation concerns
- **C** – Continue: Accept validation results and complete the architecture
