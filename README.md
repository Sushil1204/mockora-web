# Mockoraa

Mockoraa is a managed marketplace connecting candidates with verified industry
professionals for realistic, one-to-one mock interviews. The product covers
expert discovery and verification, booking and scheduling, mock payments,
interview delivery, structured feedback, and administrator operations.

This repository is at an early stage: the Next.js frontend scaffold exists, the
backend and shared code have not been implemented, and no product workflows are
available yet.

## Repository Structure

```text
mockoraa/
├── agents/          # Local-only AI agent workspace (Git-ignored)
│   ├── context/     # Canonical product, design, architecture and API docs
│   ├── assets/      # Brand assets
│   ├── reports/     # Inspection and review reports
│   └── ...          # tasks/, plans/, research/, screenshots/, archive/
├── frontend/        # Next.js application
│   ├── app/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/         # Backend services (not implemented)
├── shared/          # Shared types, schemas and utilities (not implemented)
├── .github/         # CI workflows
├── package.json     # Repository-wide scripts and formatting
├── .prettierrc.json
├── .gitignore
└── README.md
```

The canonical product, design, architecture, database and API specifications
live in `agents/context/` and are intentionally kept out of Git for now. The
tracked repository does not yet contain its own documentation set.

## Technology Stack

Currently installed and verified in `frontend/`:

| Layer           | Technology                            |
| --------------- | ------------------------------------- |
| Framework       | Next.js 16.4.6 (App Router)           |
| UI              | React 19.3.0                          |
| Language        | TypeScript 5 (strict mode)            |
| Styling         | Tailwind CSS 4.3.3 (Turbopack loader) |
| Linting         | ESLint 9 + `eslint-config-next`       |
| Package manager | npm (`package-lock.json`)             |

Planned but **not installed** yet: NestJS backend, PostgreSQL + Prisma,
Auth.js, Zod, React Hook Form, TanStack Query, Zustand, shadcn/ui, Lucide,
Zoom Video SDK, Resend, S3-compatible storage, Vitest/Jest/Playwright, and CI.
Do not assume these are available.

## Local Development

Node.js 22 or newer and npm are required. Dependencies are installed per
application; there is no workspace manager or Turborepo setup. Install both the
root tooling and the frontend dependencies:

```bash
git clone https://github.com/Sushil1204/mockora-web.git
cd mockora-web
npm install
npm ci --prefix frontend
npm run dev
```

The development server runs at [http://localhost:3000](http://localhost:3000).

### Repository Commands

Run from the repository root:

```bash
npm run dev          # start the frontend development server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript without emitting
npm run test         # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run format       # apply Prettier
npm run format:check # verify formatting
npm run check        # format, lint, types, tests and build
```

Individual frontend commands remain available from `frontend/` with `npm run
dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`,
`npm run test`, and `npm run test:watch`.

### Testing

Unit tests use Vitest with jsdom and React Testing Library. Test files live
beside the code they cover and use the `*.test.ts` or `*.test.tsx` suffix.
End-to-end tests are not configured yet.

### Continuous Integration

`.github/workflows/ci.yml` installs both lockfiles and runs `format:check`,
`lint`, `typecheck`, `test`, and `build` on pushes and pull requests targeting
`main` or `develop`.

### Backend Setup

Not available. There is no backend application, API, database schema migration,
or environment configuration in the repository yet. Setup instructions will be
added when the backend is scaffolded.

## Environment Variables

Never commit `.env` files or secrets. Commit only `.env.example` templates with
placeholder values.

The root `.gitignore` excludes `.env` and `.env.*` while allowing
`.env.example` and `.env.*.example`; `frontend/.gitignore` now follows the same
rule. No environment variables are required by the current frontend build.

When configuration is introduced, add a `.env.example` beside the application
that needs it and document how to copy it:

```bash
cp backend/.env.example backend/.env
```

## Development Workflow

The engineering rules in `agents/context/development-rules.md` govern this
repository. In summary:

1. Inspect existing code and documentation before changing anything.
2. Keep frontend, backend and shared code logically separated.
3. Put types, schemas and utilities in `shared/` rather than duplicating them.
4. Add dependencies only when needed and approved.
5. Never commit secrets, build output or AI-generated artifacts.
6. Enforce business rules and authorization on the backend.
7. Include loading, empty, error and success states in UI work.
8. Run the applicable formatter, linter, type check, tests and build before
   declaring work complete.

## Git

A single repository at the root tracks `frontend/`, `backend/` and `shared/`.
The `agents/` directory is excluded via `/agents/` and exists only on local
machines. Do not create nested Git repositories.
