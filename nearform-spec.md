Goal: Apply Spec-Driven Development to build a complete, well-tested, and deployable application.

In this activity, you will use the BMAD Framework to drive the development of the full-stack Todo application described in the PRD below. This is where all roles converge: developers build the application, QA engineers ensure quality from day one, and DevOps engineers containerize and deploy.

Why BMAD for this project? BMAD provides a structured, agent-driven workflow that guides you from PRD through implementation. Its persona-based approach (PM, Architect, Developer, etc.) helps cross-functional teams understand their role in the spec-driven process and ensures comprehensive coverage of all project aspects.

Please note, the todo app is the suggested project to implement, but we're open to different applications as long as the methodology is used correctly. No matter which project you decide to complete, you will need to share it in the next step.

We have created a channel to support all learners on this pathway, please join #aine-training-support in slack to get additional support.

Step 1: Initialize BMAD and Generate Specifications
Using the PRD as your input, work through BMAD's workflow to generate project artifacts:

Project Brief & PRD Refinement: Use BMAD's PM persona to refine the PRD and create a detailed project brief

Architecture Design: Use the Architect persona to define the technical architecture, API contracts, and component structure

Story Creation: Break down the work into well-defined stories with acceptance criteria

Test Strategy: Define test scenarios for unit, integration, and E2E tests as part of the story definitions

Step 2: Build the Application (with QA Integration from Day One)
Use AI agents to implement the BMAD-generated specifications. QA activities are integrated throughout, not added at the end.

Component: Project Setup

Implementation Task: Initialize project structure using AI assistance. Create appropriate structure for frontend, backend, and tests.

QA Integration: Set up test infrastructure immediately: Jest/Vitest for unit tests, Playwright for E2E tests. Configure test commands in package.json.

Component: Backend

Implementation Task: Build the API for CRUD operations on todos. Use AI to generate endpoints, validation, and error handling based on BMAD specs.

QA Integration: Write integration tests for each API endpoint as you build them. Use Postman MCP or similar to validate API contracts.

Component: Frontend

Implementation Task: Build the UI for todo management. Use AI to generate components and state management based on BMAD specs.

QA Integration: Write component tests as you build. Use Chrome DevTools MCP to debug and inspect during development.

Component: E2E Tests

Implementation Task: Create end-to-end tests covering all user journeys defined in stories.

QA Integration: Use Playwright MCP to automate browser interactions. Cover: create todo, complete todo, delete todo, empty state, error handling.

Step 3: Containerize with Docker Compose
Use Docker Compose to containerize and orchestrate your application.

Task: Dockerfiles

Description: Create Dockerfiles for frontend and backend with multi-stage builds, non-root users, and health checks. AI should assist in generating optimized Dockerfiles.

Task: Docker Compose

Description: Create a docker-compose.yml that orchestrates all containers (app, database if needed). Include proper networking, volume mounts, and environment configuration.

Task: Health Checks

Description: Implement health check endpoints. Ensure containers report health status and logs are accessible via docker-compose logs.

Task: Environment Config

Description: Support dev/test environments through environment variables and compose profiles.

Step 4: Quality Assurance Activities
QA Task: Test Coverage

Description: Use AI to analyze test coverage and identify gaps. Target minimum 70% meaningful coverage.

QA Task: Performance Testing

Description: Use Chrome DevTools MCP to analyze application performance. Document any issues found.

QA Task: Accessibility Testing

Description: Run accessibility audits using Lighthouse or axe-core (can be automated via Playwright). Ensure WCAG AA compliance.

QA Task: Security Review

Description: Use AI to review code for common security issues (XSS, injection, etc.). Document findings and remediations.

Deliverables for 4.2:
BMAD artifacts (project brief, architecture docs, stories with acceptance criteria)

Working Todo application (frontend + backend or CLI)

Unit, integration, and E2E test suites

Dockerfiles and docker-compose.yml (application runs with docker-compose up)

QA reports (coverage, accessibility, security review)

Documentation of how BMAD guided the implementation

AI Integration Documentation
Throughout Phase 3, maintain a log documenting:

Agent Usage: Which tasks were completed with AI assistance? What prompts worked best?

MCP Server Usage: Which MCP servers did you use? How did they help?

Test Generation: How did AI assist in generating test cases? What did it miss?

Debugging with AI: Document cases where AI helped debug issues.

Limitations Encountered: What couldn't the AI do well? Where was human expertise critical?

Success Criteria
Criterion

Target

Phase 1-2 Deliverables

All activities completed with documented learnings

Working Application

Todo app fully functional with all CRUD operations

Test Coverage

Minimum 70% meaningful code coverage

E2E Tests

Minimum 5 passing Playwright tests

Docker Deployment

Application runs successfully via docker-compose up

Accessibility

Zero critical WCAG violations

Documentation

README with setup instructions, AI integration log

Framework Comparison

Product Requirement Document (PRD) for the Todo App

The goal of this project is to design and build a simple full-stack Todo application that allows individual users to manage personal tasks in a clear, reliable, and intuitive way. The application should focus on clarity and ease of use, avoiding unnecessary features or complexity, while providing a solid technical foundation that can be extended in the future if needed.
From a user perspective, the application should allow the creation, visualization, completion, and deletion of todo items. Each todo represents a single task and should include a short textual description, a completion status, and basic metadata such as creation time. Users should be able to immediately see their list of todos upon opening the application and interact with it without any onboarding or explanation.
The frontend experience should be fast and responsive, with updates reflected instantly when the user performs an action such as adding or completing a task. Completed tasks should be visually distinguishable from active ones to clearly communicate status at a glance. The interface should work well across desktop and mobile devices and include sensible empty, loading, and error states to maintain a polished user experience.
The backend will expose a small, well-defined API responsible for persisting and retrieving todo data. This API should support basic CRUD operations and ensure data consistency and durability across user sessions. While authentication and multi-user support are not required for the initial version, the architecture should not prevent these features from being added later if the product evolves.
From a non-functional standpoint, the system should prioritize simplicity, performance, and maintainability. Interactions should feel instantaneous under normal conditions, and the overall solution should be easy to understand, deploy, and extend by future developers. Basic error handling is expected both client-side and server-side to gracefully handle failures without disrupting the user flow.
The first version of the application intentionally excludes advanced features such as user accounts, collaboration, task prioritization, deadlines, or notifications. These capabilities may be considered in future iterations, but the initial delivery should remain focused on delivering a clean and reliable core experience.
Success for this project will be measured by the ability of a user to complete all core task-management actions without guidance, the stability of the application across refreshes and sessions, and the clarity of the overall user experience. The final result should feel like a complete, usable product despite its deliberately minimal scope.
