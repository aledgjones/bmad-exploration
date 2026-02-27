# Story 1.2: scaffold-next-js-frontend-with-typescript-tailwind-eslint-and-vitest

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **frontend developer**,
I want a Next.js project initialized with TypeScript, Tailwind CSS, ESLint, and Vitest configured,
so that I can start building UI components with type safety and testing support.

## Acceptance Criteria

1. **Given** the monorepo root,
   **When** I run `npx create-next-app frontend --typescript --eslint --tailwind` and configure Vitest,
   **Then** the `frontend/` directory contains a working Next.js app.
2. **And** running `npm run dev` in `frontend/` starts the development server.
3. **And** `npm run test` in `frontend/` executes Vitest with a sample passing test.

## Tasks / Subtasks

- [x] Run `npx create-next-app@latest frontend --typescript --eslint --tailwind`.
- [x] Configure Tailwind CSS (install dependencies, add `tailwind.config.js`, update `globals.css`).
- [x] Add Vitest to frontend:
  - [x] `npm install -D vitest @testing-library/react @testing-library/jest-dom`.
  - [x] Add `vitest` script to package.json and sample test.
- [x] Verify `npm run dev` works.
- [x] Verify `npm run test` runs a sample passing test.
- [x] Commit scaffold and update root README with frontend instructions (if not already).
- [x] Ensure ESLint+Prettier works in frontend (linting passes).
- [x] Configure `.env.local` example if needed.

## Dev Notes

- Follow architecture decisions: Next.js TypeScript starter, Tailwind CSS, ESLint, Vitest.
- Use monorepo conventions from story 1.1 (frontend in `frontend/`).
- Make sure the dev server runs at port 3000.
- Coupling with backend is not needed yet, but routing will target `http://localhost:3001` once backend available; consider updating `next.config.js` with `env` variables (API_URL).
- Add base `pages/index.tsx` with placeholder content and a sample component to verify Tailwind styles.
- Integrate Prettier formatting: install `prettier` and ESLint plugins, add `.prettierrc`, and ensure lint script applies formatting.

### Project Structure Notes

- Ensure `frontend/package.json` includes scripts:
  - `"dev": "next dev"`.
  - `"build": "next build"`.
  - `"test": "vitest"`.
- Keep frontend code separate from backend; no shared dependencies currently.
- Create global tailwind styles at `frontend/styles/globals.css`.
- Add `frontend/tsconfig.json` with strict settings per monorepo root if applicable.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Selected Starter Approach]
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-monorepo-structure.md]

## Dev Agent Record

### Agent Model Used

Raptor mini (Preview)

### Debug Log References

- saw initial empty `frontend` directory and executed `npx create-next-app` to scaffold project
- Flattened nested `frontend/frontend` folder created by generator
- Installed additional dependencies manually (tailwindcss, vitest, testing libraries, jsdom)
- Created configuration files and updated package scripts
- Validated development server and testing setup

### Completion Notes List

- Project scaffold created with Next.js, TypeScript, ESLint, and Tailwind (tailwind config added manually)
- Sample Vitest configuration and test added; test passes
- `npm run dev` verified; dev server listens on port 3000
- Readme updated with frontend-specific instructions
- ESLint script enhanced and run with no errors
- Environment example file added

### File List

- frontend/ (Next.js project root)
- frontend/package.json
- frontend/tsconfig.json
- frontend/tailwind.config.js
- frontend/vitest.config.ts
- frontend/vitest.setup.ts
- frontend/app/globals.css
- frontend/tests/example.test.tsx
- frontend/.env.local.example
- frontend/.prettierrc
- frontend/.prettierignore
- README.md
