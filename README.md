# Mockoraa

Mockoraa is a monorepo project for a frontend application, its backend services,
and the shared code between them. The repository currently contains only the
monorepo scaffold — application code and dependency manifests have not been
added yet.

## Purpose

The repository keeps three code areas separated while sharing a single Git
history:

- `frontend/` — the client application
- `backend/` — backend services and APIs
- `shared/` — types, schemas and utilities used by both

AI-generated plans, research and reports live in a local-only `agents/`
workspace that is never committed.

## Repository Structure

```text
mockoraa/
├── agents/          # Local-only AI agent workspace (Git-ignored)
│   ├── project.md
│   ├── design.md
│   ├── architecture.md
│   ├── implementation-plan.md
│   ├── tasks/
│   ├── plans/
│   ├── research/
│   ├── context/
│   ├── reports/
│   ├── screenshots/
│   ├── assets/
│   └── archive/
├── frontend/        # Client application (not scaffolded yet)
├── backend/         # Backend services and APIs (not scaffolded yet)
├── shared/          # Shared types, schemas and utilities
├── .gitignore
└── README.md
```

## Technology Stack

No application stack has been chosen yet. There are no `package.json`,
lockfiles, or source files in the repository, so no frameworks, libraries or
runtime versions are listed here. Update this section when dependencies are
added, and record the corresponding decisions in `agents/architecture.md`.

## Local Development

There are currently no applications to run. Once `frontend/` and `backend/` are
scaffolded, their setup commands will be documented here.

Cloning and browsing the repository is all that is required today:

```bash
git clone <repository-url>
cd mockoraa
```

## Frontend Setup

Not yet available. When the frontend is scaffolded, document its package
manager, install command, development server command and build command here.

## Backend Setup

Not yet available. When the backend is scaffolded, document its runtime,
dependency installation, migration steps (if any), development command and
environment variables here.

## Environment Variables

Do not commit `.env` files or secrets — the root `.gitignore` excludes them.
Commit only `.env.example` templates (explicitly allowed by the ignore rules).

When configuration is introduced, place a `.env.example` next to the app that
needs it (`frontend/.env.example`, `backend/.env.example`) listing every
required key with placeholder values, and document how to copy it:

```bash
cp backend/.env.example backend/.env
```

## Development Workflow

1. Keep frontend, backend and shared code separated by responsibility.
2. Put shared types and utilities in `shared/` instead of duplicating them.
3. Add dependencies only when they are needed.
4. Never commit anything inside `agents/`.
5. Keep `.env` files and secrets out of Git.
6. Do not add nested Git repositories.
7. Do not change business logic for organizational reasons.
8. Preserve existing functionality when restructuring.

## Git

A single repository at the root tracks `frontend/`, `backend/` and `shared/`.
The `agents/` directory is excluded via `/agents/` in `.gitignore` and exists
only on local machines.
