# BMAD Methodology — bmad-todo

**Project:** bmad-todo  
**Date:** 2026-03-04  
**Author:** Aled Jones

---

## 1. Overview

BMAD is a structured, spec-first development methodology in which a defined set of AI agent personas guide a project from initial idea through to shipped, tested software. Each persona has a distinct remit, produces explicit artifacts, and hands off to the next in a traceable workflow — all within a version-controlled repository.

---

## 2. Phases Used

The project traversed the full BMAD lifecycle:

| Phase                 | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Analysis**          | Business requirements elicited; market and domain context established                 |
| **Planning**          | Product requirements document (PRD) produced; epics and stories defined               |
| **Solutioning**       | System architecture designed; UX patterns specified; technology stack selected        |
| **Implementation**    | Stories implemented story-by-story with TDD; sprint plan maintained throughout        |
| **Quality Assurance** | Accessibility audit, security review, performance benchmarks, and QA summary produced |

---

## 3. Agents Used

| Agent                   | Persona                       | Output                                                    |
| ----------------------- | ----------------------------- | --------------------------------------------------------- |
| **PM**                  | Mary — Business Analyst       | PRD, requirements discovery                               |
| **Architect**           | Winston — Solutions Architect | Architecture document, ADRs, tech stack                   |
| **UX Designer**         | Sally — UX Designer           | Wireframes, interaction patterns, UX notes                |
| **SM**                  | Bob — Scrum Master            | Epics, stories, sprint plan, sprint-status.yaml           |
| **Dev**                 | Amelia — Senior Developer     | All implementation code and unit tests                    |
| **QA**                  | Quinn — QA Engineer           | Accessibility, security, performance, and summary reports |
| **Tech Writer**         | Paige — Technical Writer      | This document and the AI integration log                  |
| **Quick-Flow-Solo-Dev** | Barry — Solo Dev              | Ad-hoc tweaks outside the story cycle                     |

---

## 4. Artifacts Produced

All planning and implementation artifacts are version-controlled under `_bmad-output/`.

**Planning artifacts** (`_bmad-output/planning-artifacts/`):

- Product Requirements Document (PRD)
- System architecture document
- UX design notes
- Epic definitions (Epic 1–5)

**Implementation artifacts** (`_bmad-output/implementation-artifacts/`):

- Sprint plan
- `sprint-status.yaml` — live tracking of story and epic status
- Individual story files (`1-1-*.md` through `5-7-*.md`) — each containing acceptance criteria, tasks, developer notes, and a completion record

**Quality documents** (`docs/`):

- `qa-accessibility-report.md`
- `qa-security-review.md`
- `qa-performance-report.md`
- `qa-summary-report.md`
- `ai-integration-log.md`
- `bmad-methodology.md` (this document)

---

## 5. What Worked Well

**Persistent, repo-resident context:**  
Storing all BMAD artifacts in the repository meant that any new agent invocation could load prior decisions and context without manual re-briefing. Workflows could be re-run, stories regenerated, and earlier decisions revisited at any point.

**Structured story files as a development contract:**  
Each story file defined acceptance criteria, implementation tasks, and dev notes in a single place. This gave the Dev agent an unambiguous contract and made progress objectively measurable (checked vs. unchecked tasks).

**Retrospectives as genuine feedback loops:**  
The retrospective produced concrete, actionable items that were fed back into the sprint as new stories. In a sufficiently complex project, learnings from early phases improve later ones — accessibility consistency and test thoroughness were both improved this way.

**Iterative debugging with environmental automation:**  
The Docker Compose stack enabled the Dev agent to build, run, and tear down the full environment automatically during test and debug cycles — reducing the manual overhead of validating fixes.

**Code review as a quality gate:**  
Using a different model for code review (Gemini) proved effective — a fresh context with no implementation bias surface issues that the Dev agent had normalised. Generating an action-item list rather than fixing inline provided a documented, prioritised set of improvements for the human to triage.

**Model tiering by task type:**  
Using a larger model for architecture and story creation, and a smaller one for routine implementation, balanced cost against quality effectively. The BMAD workflow is model-agnostic, which made this straightforward to apply in practice.

---

## 6. What Was Challenging

**Role boundary ambiguity:**  
The SM and PM roles overlap in practice. The SM occasionally performed work that felt more PM-like, which caused confusion about where to go for certain tasks. A clearer, project-specific brief on each role's scope would help.

**Story status discipline:**  
Keeping `sprint-status.yaml` and individual story `Status` fields consistent was a recurring overhead. Cheaper models tended to skip states or forget to update one source when updating the other. This required explicit verification steps and occasional manual correction.

**Propagation of early inaccuracies:**  
Small misunderstandings or imprecisions in the PRD or architecture document propagated forward into stories and implementation. Catching these late required re-work that was difficult to scope — it was not always clear whether to re-run the upstream phase or patch the downstream artifact.

**File update reliability at scale:**  
BMAD produces large, structured documents. Cheaper models would sometimes describe an update without applying it, or apply it partially. This was harder to detect in larger files and required explicit verification.

**Tooling ceremony overhead:**  
Activating agents and workflows via the menu-driven prompt approach had noticeable friction. Slash commands were a better pattern — more direct and less reliant on the agent spending tokens orienting itself.
