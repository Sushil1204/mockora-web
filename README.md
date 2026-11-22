# Mockoraa

Mockoraa is a managed marketplace connecting candidates with verified industry
professionals for realistic, one-to-one mock interviews. The product covers
expert discovery and verification, booking and scheduling, mock payments,
interview delivery, structured feedback, and administrator operations.

The repository currently contains the Next.js frontend, the NestJS API, the
Sprint 1 identity foundation, the Sprint 2 candidate and expert onboarding
foundation, and the Sprint 3 public expert marketplace. Availability, booking,
and payment workflows are not implemented yet.

## Repository Structure

```text
mockoraa/
├── agents/          # Local-only AI agent workspace (Git-ignored)
│   ├── context/     # Canonical product, design, architecture and API docs
│   ├── adr/         # Architecture decision records
│   └── ...
├── backend/         # NestJS API, Prisma schema, migrations and tests
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   └── test/
├── frontend/        # Next.js application
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
├── shared/          # Shared types, schemas and utilities (not implemented)
├── package.json     # Repository-wide scripts
└── README.md
```

Canonical product, design, architecture, database, and API specifications live
in `agents/context/` and are intentionally not committed.

## Technology Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Frontend        | Next.js 16.4.6 (App Router), React 19.3.0        |
| Styling         | Tailwind CSS 4.3.3, Forest Slate design tokens   |
| Backend         | NestJS 11, Express                               |
| Database        | PostgreSQL with Prisma 6                         |
| Validation      | Zod (HTTP), HTML constraint validation           |
| Authentication  | Opaque database sessions, bcrypt password hashes |
| Testing         | Vitest + Testing Library, Jest + Supertest       |
| Language        | TypeScript 5 (strict)                            |
| Package manager | npm (per-application installs, no workspace)     |
| CI              | GitHub Actions                                   |

Planned but **not installed** yet: Zoom Video SDK, Resend, S3-compatible
storage, mock payment provider, TanStack Query, React Hook Form, Zustand,
shadcn/ui, and Playwright.

## Prerequisites

- Node.js 22 or newer
- npm
- No Docker or system PostgreSQL is required for local development

## Local Development

Install root tooling and each application:

```bash
npm install
npm ci --prefix frontend
npm ci --prefix backend
```

Start the embedded PostgreSQL database in its own terminal and leave it running:

```bash
npm run db:start
```

It listens on `localhost:55432` and stores data in `backend/.pgdata` (ignored by
Git). In a second terminal, apply the committed migrations and start the API:

```bash
npm run db:deploy
npm run seed:taxonomy
npm run dev:backend
```

The taxonomy seed is idempotent and creates the industries, job roles,
specializations, interview types, and experience levels used by onboarding.

The API runs at [http://localhost:4000/api/v1](http://localhost:4000/api/v1).
In a third terminal, start the frontend:

```bash
npm run dev
```

The application runs at [http://localhost:3000](http://localhost:3000).

### Initial Administrator

Administrator access cannot be self-assigned through the API. Create the first
administrator from environment variables:

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='a-long-local-password' \
npm run seed:admin
```

The script is idempotent and grants the `ADMIN` role.

### Database Commands

```bash
npm run db:start       # start embedded PostgreSQL (foreground)
npm run db:deploy      # apply committed migrations
npm run db:migrate     # create/apply a migration during schema changes
npm run seed:admin     # create/update the initial administrator
npm run seed:taxonomy  # seed industries, roles and interview taxonomy
```

For a hosted PostgreSQL instance, set `DATABASE_URL` in `backend/.env` and run
`npm run db:deploy`.

## Authentication API

All endpoints are under `/api/v1`.

| Method | Endpoint                 | Access        |
| ------ | ------------------------ | ------------- |
| POST   | `/auth/register`         | Public        |
| POST   | `/auth/login`            | Public        |
| POST   | `/auth/logout`           | Authenticated |
| POST   | `/auth/refresh`          | Authenticated |
| POST   | `/auth/forgot-password`  | Public        |
| POST   | `/auth/reset-password`   | Reset token   |
| GET    | `/me`                    | Authenticated |
| PATCH  | `/me`                    | Authenticated |
| POST   | `/admin/users/:id/roles` | Admin         |

Sessions are delivered as an httpOnly, SameSite=Lax cookie and rotated on
refresh. `Authorization: Bearer <token>` is also supported for API clients.
Public registration always creates a candidate account; client-supplied roles
are ignored. Password reset tokens are generated and stored hashed, but email
delivery is not connected yet, so no reset email is sent in local development.

## Onboarding API

All endpoints are under `/api/v1` and require an authenticated session.

| Method | Endpoint                      | Purpose                                                            |
| ------ | ----------------------------- | ------------------------------------------------------------------ |
| GET    | `/taxonomies`                 | Active industries, roles, specializations, interview types, levels |
| GET    | `/candidate/profile`          | Get the signed-in candidate profile                                |
| PUT    | `/candidate/profile`          | Create or update the candidate profile                             |
| GET    | `/expert/application`         | Get the signed-in expert application                               |
| PATCH  | `/expert/application`         | Save an editable draft                                             |
| POST   | `/expert/application`         | Submit the application for review                                  |
| GET    | `/expert/profile`             | Get an approved expert's own profile                               |
| PATCH  | `/expert/profile`             | Update an approved expert's own profile                            |
| GET    | `/admin/experts/applications` | List applications for review                                       |
| POST   | `/admin/experts/:id/approve`  | Approve and publish an expert                                      |
| POST   | `/admin/experts/:id/reject`   | Request changes to an application                                  |
| POST   | `/admin/experts/:id/suspend`  | Suspend a published expert                                         |

Submitting an application creates a pending `EXPERT` role. The role becomes
active only when an administrator approves the application. Verification and
publication statuses are derived on the server and cannot be set by clients.
Only approved and published experts are eligible for public listing.

## Marketplace API

All endpoints are under `/api/v1` and are public.

| Method | Endpoint             | Purpose                                                       |
| ------ | -------------------- | ------------------------------------------------------------- |
| GET    | `/experts`           | Browse published experts with search, filters, and pagination |
| GET    | `/experts/filters`   | Filter options used by currently published experts            |
| GET    | `/experts/:expertId` | View a published expert's public profile                      |

`/experts` accepts `q`, `industryId`, `specializationId`, `interviewTypeId`,
`jobRoleId`, `levelId`, `language`, `page`, and `limit` (maximum 24). Filtering
and pagination are evaluated on the server.

Only experts with `APPROVED` verification, `PUBLISHED` publication, an active
expert role, and an active account are returned. Unpublished or suspended
profiles return `404` from the profile endpoint so their existence is not
revealed. Public responses never include email addresses, LinkedIn URLs, review
notes, or verification controls.

Public visitors can browse `/experts` and read expert profiles without signing
in. Requesting a booking requires authentication and becomes available with the
availability and booking sprints, so the profile page currently gates the
booking call to action behind sign-in.

## Repository Commands

Run from the repository root:

```bash
npm run dev          # frontend development server
npm run dev:backend  # API development server
npm run build        # build frontend and backend
npm run lint         # ESLint for frontend and backend
npm run typecheck    # TypeScript for both applications
npm run test         # Vitest and backend integration tests
npm run format       # apply Prettier
npm run format:check # verify formatting
npm run check        # format, lint, types, tests, and builds
```

Backend tests start an isolated embedded PostgreSQL on port 55433 and apply
migrations automatically. They do not use the development database.

## Environment Variables

Never commit `.env` files or secrets. Commit only `.env.example` templates.

- `frontend/.env.example` — `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`
- `backend/.env.example` — database, session, admin seed, and future provider
  placeholders

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Zoom, email, storage, and payment credentials are backend-only and must never
use the `NEXT_PUBLIC_` prefix.

## Security Notes

- Passwords are hashed with bcrypt; raw passwords and session tokens are never
  stored.
- Session tokens are random, hashed at rest, expire, rotate on refresh, and are
  revoked on logout and password reset.
- Role checks and account-status checks happen on the backend for every
  protected request.
- Expert applications are reviewed server-side; approval, rejection, and
  suspension require an active `ADMIN` role and record the reviewing
  administrator.
- Admin role assignment requires an active `ADMIN` role and blocks
  self-assignment of admin access.
- Rate limiting and email verification are not implemented yet; both are
  required before production launch.

## Development Workflow

The engineering rules in `agents/context/development-rules.md` govern this
repository. Run the applicable formatter, linter, type checker, tests, and build
before declaring work complete. Never commit secrets, build output, or
AI-generated artifacts. The repository uses Conventional Commits.

### Branch Strategy

| Branch              | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `main`              | Production-ready code. Protected.                 |
| `develop`           | Integration branch for reviewed sprint work.      |
| `sprint/<n>-<name>` | Sprint-level delivery branch.                     |
| `feature/<name>`    | Individual feature implementation.                |
| `fix/<name>`        | Non-urgent bug fixes.                             |
| `hotfix/<name>`     | Urgent production fixes.                          |
| `release/<version>` | Release stabilization before promotion to `main`. |

Start every sprint from the latest `develop`:

```bash
git switch develop
git pull --ff-only
git switch -c sprint/02-expert-marketplace
```

Create `feature/*` branches from the sprint branch for individual tasks where
useful, then merge them back into the sprint branch. When the sprint is ready:

1. Push the sprint branch and open a PR into `develop` using the repository PR
   template.
2. Wait for CI, address review feedback, and merge after approval.
3. Promote release candidates from `develop` to `main` through a `release/*`
   PR.

Never push directly to `main`. CI runs on pushes and pull requests targeting
`main`, `develop`, and the legacy `dev-v1` branch.

> Repository owners must enable branch protection for `main` and `develop` in
> GitHub: require a pull request, require the CI status check, and block force
> pushes. These settings cannot be configured from the repository files.

## Git

A single repository at the root tracks `frontend/`, `backend/` and `shared/`.
The `agents/` directory is excluded via `/agents/` and exists only on local
machines. Do not create nested Git repositories.
