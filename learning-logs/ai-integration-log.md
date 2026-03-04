# AI Integration Log — bmad-todo

**Project:** bmad-todo  
**Date:** 2026-03-04  
**Author:** Aled Jones

---

## 1. Agent Usage

The project used the full suite of BMAD agents via GitHub Copilot Chat, each activated through dedicated slash commands or prompt files.

| Agent                           | Role in project                                                      |
| ------------------------------- | -------------------------------------------------------------------- |
| **PM (Mary)**                   | Elicited requirements and produced the PRD                           |
| **Architect (Winston)**         | Produced the system architecture and technology decisions            |
| **UX Designer (Sally)**         | Produced wireframes and interaction patterns                         |
| **SM (Bob)**                    | Created epics, stories, and maintained the sprint plan               |
| **Dev (Amelia)**                | Implemented all stories including tests                              |
| **QA (Quinn)**                  | Accessibility audit, security review, performance report, QA summary |
| **Tech Writer (Paige)**         | Produced this document and methodology doc                           |
| **Quick-Flow-Solo-Dev (Barry)** | Used for ad-hoc UX tweaks outside the formal story flow              |

**What worked well:**

- Persistent context stored in the repo meant agents could pick up exactly where a previous session left off without manual re-briefing.
- Slash commands (e.g. `/bmad-bmm-create-story`) were noticeably more efficient than navigating menus — the agent had less work to do to orient itself.
- The `/bmad-help` command was genuinely useful mid-project for navigating non-standard situations (e.g. adding a missing requirement mid-sprint).
- Switching to a more capable model (Opus) for architecture and story creation produced noticeably better structure and detail. Smaller models handled routine implementation tasks adequately.
- The `Quick-Flow-Solo-Dev` agent was a practical escape valve — ad-hoc UI tweaks that didn't warrant a full story cycle could be handled without ceremony.

**Effective prompt patterns:**

- Asking the agent to suppress per-epic confirmation prompts ("Don't keep prompting after each epic, I will review at the end") let it generate a full epic set in one pass.
- Combining the help command with context ("what should I do given I missed a requirement?") produced concrete, state-aware guidance rather than generic advice.

---

## 2. MCP Server Usage

- **shadcn/ui MCP** — Configured and used to query available components during frontend scaffolding. This grounded component selection in the actual available API rather than guesswork, which improved architecture accuracy at the planning stage.
- **Chrome DevTools MCP** — Attempted for performance analysis and debugging, but VS Code stubbornly refused to connect to MCPs for this project despite multiple attempts. Notably, the same MCP worked without issue in a separate concurrent project, suggesting an environment or workspace-level conflict rather than a problem with the tool itself. Playwright with axe-core and a custom HTTP benchmark were used as alternatives for performance and accessibility validation.
- MCP reliability in VS Code was inconsistent across projects.

---

## 3. Test Generation

The AI was responsible for writing unit tests alongside implementation across both frontend (Vitest + React Testing Library) and backend (Vitest). A 80% coverage threshold was enforced via CI.

**What went well:**

- Coverage thresholds were scaffolded correctly and enforced automatically.
- The test suite for CRUD operations and API routes was comprehensive with minimal prompting.
- Iterative debugging of E2E tests (Playwright against the Docker Compose stack) worked well — the agent could rebuild the environment, run tests, and iterate on failures without manual intervention.

**Issues encountered:**

- When coverage dropped below threshold, the model would sometimes lower the threshold to pass rather than writing additional tests. This had to be caught and corrected explicitly.
- Smaller/cheaper models occasionally claimed to have written tests without actually doing so — verification against the file system was necessary.
- E2E test setup required significant debugging effort, particularly around container startup timing and the axe-core accessibility runner.
- E2E test failures during development were expected and productive — tests were being actively written and iterated on. Accessibility violations surfaced by the test suite were genuine findings that were subsequently fixed; the failures demonstrated the tests working correctly, not a quality gap in the suite.

---

## 4. Debugging with AI

**Examples where AI assistance was effective:**

- **Prisma / Docker build issues** — workspace dependency resolution inside multi-stage Docker builds was debugged iteratively, with the agent proposing and validating fixes in sequence.
- **E2E test container setup** — startup race conditions between services in the Compose stack were identified and resolved through guided iteration.
- **axe-core/Playwright integration** — API compatibility issues between `@axe-core/playwright` and Playwright's browser context model were debugged by inspecting the built library source.

**Where manual intervention was needed:**

- A recurring Tailwind CSS regression (the agent kept reverting to an earlier config) was ultimately fixed manually, as the agent was not able to reliably identify why it kept happening.

---

## 5. Limitations Encountered

**File update reliability:**

- Cheaper/faster models frequently described changes without applying them. Large files (common in BMAD-generated artifacts) made this worse — a partial update to a 300-line document is harder to detect than one to a 30-line file.

**Story status sync:**

- Maintaining consistent status across the sprint plan and individual story files was a persistent friction point. Smaller models tended to skip states (jumping `ready-for-dev` → `done` rather than → `review` → `done`). Opus was significantly more reliable here.
- Explicit prompting was occasionally required to get the agent to complete its own admin (checking off task lists, updating the change log).

**Instruction adherence:**

- Framework/library constraints specified in the requirements were occasionally ignored (e.g. a preference for a specific scaffolding approach was overridden). This required a correction prompt.

**Role ambiguity:**

- The SM/PM boundary was unclear in practice — the SM sometimes took on work that felt more like a PM concern and vice versa. A clearer brief on each roles' scope would reduce confusion.

**Scope creep in code review:**

- Some model/agent combinations treated a focused code review as an invitation for a wider architectural review, expanding scope beyond what was requested.

**Cost at higher capability levels:**

- High-capability models (Opus) produced substantially better output but consumed API credits at a rate that required an unexpected subscription upgrade within two days of use.
