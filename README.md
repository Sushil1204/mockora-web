# Mockoraa

Mockoraa is a managed marketplace connecting candidates with verified industry
professionals for realistic, one-to-one mock interviews. The product covers
expert discovery and verification, booking and scheduling, mock payments,
interview delivery, structured feedback, and administrator operations.

The repository currently contains the Next.js frontend, the NestJS API, the
Sprint 1 identity foundation, the Sprint 2 candidate and expert onboarding
foundation, the Sprint 3 public expert marketplace, the Sprint 4 availability
engine, the Sprint 5 booking lifecycle, the Sprint 6 mock payment system, the
Sprint 7 notification system, the Sprint 8 video interview room, the Sprint 9
feedback and review workflow, the Sprint 10 administrator operations console,
and the Sprint 11 production-hardening work. Live payments and real payouts are
not implemented yet.

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
| Client cache    | TanStack Query 5 (candidate overview)            |
| Backend         | NestJS 11, Express                               |
| Database        | PostgreSQL with Prisma 6                         |
| Validation      | Zod (HTTP), HTML constraint validation           |
| Authentication  | Opaque database sessions, bcrypt password hashes |
| Video           | Stream Video (React 1.46.4, Node 0.9.6)          |
| Testing         | Vitest + Testing Library, Jest + Supertest       |
| Browser UAT     | Playwright + axe-core                            |
| Language        | TypeScript 5 (strict)                            |
| Package manager | npm (per-application installs, no workspace)     |
| CI              | GitHub Actions                                   |

Planned but **not installed** yet: Resend, S3-compatible storage, React Hook
Form, Zustand, and shadcn/ui.

Playwright and axe-core are installed at the repository root for browser-based
UAT and accessibility checks. Install Chromium once with
`npx playwright install chromium`.

## Frontend UI Foundation

The frontend now has separate public, authentication, workspace, and immersive
shells. Public URLs did not change; the Next.js route groups only control
chrome. Candidate, expert, and admin pages share a role-aware workspace shell
with a desktop sidebar, mobile bottom navigation and More sheet, notification
entry, account menu, and workspace switching.

Shared primitives live in `frontend/components/ui/`, and semantic design tokens
live in `frontend/app/globals.css`. The UI uses `lucide-react` icons and a
`cn` helper built on `clsx` and `tailwind-merge`. The legacy class constants in
`frontend/lib/ui.ts` remain only for screens not yet migrated.

Navigation rules are defined and tested in `frontend/lib/navigation.ts`. The
workspace provides a skip link, visible focus treatment, native dialog
semantics, branded loading/error/not-found states, and reduced-motion support.

The public home, expert marketplace, expert profile, and authentication screens
now share the same primitives and tokens. Marketplace cards expose verified
status and interview focus; filters preserve their GET query parameters;
loading, empty, and error states are explicit. Authentication uses a compact
mobile form and a desktop brand panel, with field-level errors and pending
states on the shared controls.

Candidate and expert workspace screens now use the same system. The candidate
overview at `/account` is an action dashboard: it shows real interview-activity
counts, a prioritized next action, confirmed sessions, recent booking history,
and expert discovery. Account editing lives on the candidate profile page, and
non-candidates get a compact account-settings fallback on `/account`. Booking
and availability behavior, including mutations and validation, is unchanged.
The workspace views were checked at 320, 390, 768, 1024, and 1440 with no axe
WCAG 2.1 AA violations, overflow, or runtime errors.

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
npm run seed:feedback
npm run dev:backend
```

The taxonomy seed is idempotent and creates the industries, job roles,
specializations, interview types, and experience levels used by onboarding.
The feedback seed creates the active five-criterion evaluation template used by
expert feedback reports.

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

### Demo Data

After the taxonomy has been seeded, create a candidate, three published
experts with weekly availability, and one expert awaiting review:

```bash
npm run seed:demo
```

The seed is idempotent: it upserts the demo users and profiles, then replaces
the demo experts' availability rules and exceptions. It uses
`MockoraaDemo!2026` by default and prints the credentials; set `DEMO_PASSWORD`
to use a different demo-only password.

### Database Commands

```bash
npm run db:start       # start embedded PostgreSQL (foreground)
npm run db:deploy      # apply committed migrations
npm run db:migrate     # create/apply a migration during schema changes
npm run seed:admin     # create/update the initial administrator
npm run seed:taxonomy  # seed industries, roles and interview taxonomy
npm run seed:feedback  # seed the evaluation template and criteria
npm run seed:demo      # seed demo candidate and expert accounts
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
in. Availability is published on profiles. A signed-in candidate can choose an
open time and send a booking request directly from the profile; signed-out
visitors are prompted to sign in first.

## Availability API

All endpoints are under `/api/v1`.

| Method | Endpoint                              | Access | Purpose                                       |
| ------ | ------------------------------------- | ------ | --------------------------------------------- |
| GET    | `/experts/:expertId/availability`     | Public | Open slots for a published expert             |
| GET    | `/expert/availability/rules`          | Expert | Get weekly windows and upcoming blocked dates |
| PUT    | `/expert/availability/rules`          | Expert | Replace all weekly availability windows       |
| POST   | `/expert/availability/exceptions`     | Expert | Block a date range                            |
| DELETE | `/expert/availability/exceptions/:id` | Expert | Remove a blocked date range                   |

Weekly rules use ISO weekdays (1 = Monday, 7 = Sunday), local start and end
times, an IANA timezone, a slot length of 30, 45, 60, or 90 minutes, and
optional effective dates. The server converts each window to UTC and validates
the round trip, including daylight-saving gaps. Public availability accepts
`from` and `to` dates and returns at most 14 days of slots; it never offers a
slot less than two hours away and removes slots covered by blocked dates or
active reservations.

Slot reservations are created transactionally. A PostgreSQL advisory lock per
expert serializes claims, and overlapping `HELD` or `CONSUMED` reservations are
rejected with `SLOT_UNAVAILABLE`. Expired `HELD` reservations stop blocking
availability immediately and are marked `EXPIRED` lazily on read or reserve.
The booking endpoint creates its reservation through the same locked path, so
the booking and hold commit or roll back together.

## Booking API

All endpoints are under `/api/v1` and require an authenticated session.

| Method | Endpoint                       | Access          | Purpose                                        |
| ------ | ------------------------------ | --------------- | ---------------------------------------------- |
| POST   | `/bookings`                    | Candidate       | Request a slot and hold it temporarily         |
| GET    | `/bookings`                    | Participant     | List the caller's candidate or expert bookings |
| GET    | `/bookings/:bookingId`         | Participant     | Read one booking with its status history       |
| POST   | `/bookings/:bookingId/approve` | Assigned expert | Approve and start the payment deadline         |
| POST   | `/bookings/:bookingId/decline` | Assigned expert | Decline and release the slot                   |

`POST /bookings` accepts `expertProfileId` and an ISO `startsAt`. The server
derives the candidate, slot duration, timezone, and both deadlines from trusted
data. It returns `201` with a `PENDING_EXPERT_APPROVAL` booking and a `HELD`
reservation. Candidates cannot book their own expert profile, and overlapping
claims return `409 SLOT_UNAVAILABLE`.

The optional `Idempotency-Key` header makes booking creation retry-safe for one
candidate. Keys are 8–100 letters, numbers, dots, colons, dashes, or
underscores. Repeating a successful request with the same key and candidate
returns the original booking instead of creating another hold.

Experts have two hours to respond. Approval changes the booking to
`APPROVED_PENDING_PAYMENT`, extends the hold by one hour, and does not confirm
the booking. Declining changes it to `DECLINED`, records an optional reason, and
releases the slot. Overdue pending approvals and unpaid approvals become
`EXPIRED` lazily when bookings or availability are read; their reservations are
released at the same time. Client clocks cannot extend a deadline, and actions
on an expired request return `409 BOOKING_EXPIRED`. `GET /bookings` accepts
`as=candidate`, `as=expert`, or no `as` for both, plus `status`, `page`, and
`limit` (maximum 50).

Booking creation looks up the active pricing rule for the reserved duration and
snapshots the candidate price, expert payout, platform share, and currency onto
the booking. Payment attempts inherit that snapshot. If no active rule exists,
the booking remains unpriced and payment amounts are null. Editing a pricing
rule never changes an existing booking because the amounts are already stored
on it.

## Mock Payment API

All endpoints are under `/api/v1` and require an authenticated candidate.

| Method | Endpoint                                | Purpose                        |
| ------ | --------------------------------------- | ------------------------------ |
| POST   | `/bookings/:bookingId/payment-attempts` | Create or reuse a mock attempt |
| GET    | `/payments/:paymentId`                  | Read payment status            |
| POST   | `/payments/:paymentId/mock-result`      | Simulate success or failure    |

Payment attempts are only valid for `APPROVED_PENDING_PAYMENT` bookings before
the one-hour payment deadline. A booking has at most one open attempt; failed
attempts remain recorded and allow a new attempt.

`POST /payments/:paymentId/mock-result` accepts:

```json
{ "outcome": "SUCCESS" }
```

Use `"outcome": "FAILURE"` to simulate a decline, optionally with a
`failureReason`. A successful result is validated by the backend and, in one
transaction, marks the payment `SUCCEEDED`, confirms the booking, consumes the
slot reservation, and records the confirmation in booking history. Repeating a
successful result is idempotent and cannot confirm twice. Failure leaves the
booking approved and the slot held until the payment deadline.

Mock payment creation and results are disabled when `NODE_ENV=production`, and
no live Razorpay integration exists. The UI labels the checkout as a simulation
and states that no real money is collected. Payment and booking statuses remain
separate. Expiring a booking cancels any open payment attempt.

`POST /bookings/:bookingId/payment-attempts` accepts an optional
`Idempotency-Key` with the same format as booking creation. Keys are unique per
booking and return the original attempt on retry.

## Notification API

All endpoints are under `/api/v1` and require an authenticated session.

| Method | Endpoint                  | Purpose                            |
| ------ | ------------------------- | ---------------------------------- |
| GET    | `/notifications`          | List the caller's in-app updates   |
| POST   | `/notifications/:id/read` | Mark one notification as read      |
| POST   | `/notifications/read-all` | Mark all caller notifications read |

`GET /notifications` accepts `unreadOnly=true`, `page`, and `limit` (maximum
50). The response includes an `unreadCount` used by the header indicator.

Notifications are generated for booking requests, expert approval or decline,
payment deadline reminders, booking confirmation, booking expiry, upcoming
interview reminders, feedback requests, pending feedback reminders, and
submitted feedback reports. Both candidates and experts receive events relevant
to their role. The in-app inbox and bell indicator are the delivery surface;
email delivery is not connected yet.

Booking and payment operations write deduplicated events to a transactional
outbox. Recipient notifications and delivery attempts run after the business
transaction commits, so a notification or delivery failure cannot roll back a
booking. Events are unique by key, and notifications are unique per event and
recipient, so retries do not create duplicates. Failed deliveries retry with
tracked attempt counts and last errors.

A backend scheduler runs every 30 seconds. It expires overdue bookings, queues
payment reminders within 15 minutes of the deadline, queues interview reminders
within 60 minutes of the start time, queues one feedback reminder per pending
report after `FEEDBACK_REMINDER_DELAY_HOURS` (default 24), and retries pending
notifications. These jobs use server time and do not depend on a browser
session.

## Interview Session API

All endpoints are under `/api/v1` and require a participant session on the
booking.

| Method | Endpoint                                       | Purpose                   |
| ------ | ---------------------------------------------- | ------------------------- |
| GET    | `/bookings/:bookingId/interview-session`       | Get room state and window |
| POST   | `/bookings/:bookingId/interview-session/token` | Get a participant JWT     |

The backend validates that the caller is the assigned candidate or expert,
the account is active, the booking is confirmed or in progress, and the current
server time is inside the join window. A non-participant receives `404` so the
booking's existence is not disclosed.

A participant token is a short-lived Stream user token signed with
`STREAM_API_SECRET`. Each participant receives a token for their own user ID, so
neither client can act as the other participant. The API key is returned with
the token because the browser SDK needs it; the API secret never leaves the
backend. The room exposes no recording controls. Configure the Stream call type
to disable recording and, for defense-in-depth, allow `join-call` only for call
members; the backend already refuses to issue tokens to anyone who is not the
assigned candidate or expert.

The first successful token request moves a confirmed booking to `IN_PROGRESS`
and creates one `interview_sessions` row for the booking. Subsequent token
requests, reconnects, and both participants share that session. A scheduler
ends sessions after the scheduled end plus the close grace period and moves the
booking to `COMPLETED_PENDING_FEEDBACK` for the feedback sprint.

The join window is provisional: it opens 15 minutes before the scheduled start
and closes 15 minutes after the scheduled end. Change
`INTERVIEW_JOIN_EARLY_MINUTES` and `INTERVIEW_JOIN_CLOSE_GRACE_MINUTES` when the
product late-join policy is approved.

## Feedback and Review API

All endpoints are under `/api/v1`.

| Method | Endpoint                        | Access               | Purpose                     |
| ------ | ------------------------------- | -------------------- | --------------------------- |
| GET    | `/bookings/:bookingId/feedback` | Assigned participant | Get the report and template |
| POST   | `/bookings/:bookingId/feedback` | Assigned expert      | Submit the feedback report  |
| POST   | `/bookings/:bookingId/review`   | Assigned candidate   | Review the expert           |
| GET    | `/candidate/reports`            | Candidate            | List the caller's reports   |

An expert can submit feedback only after the interview ends and the booking is
in `COMPLETED_PENDING_FEEDBACK`. The report uses the active five-criterion
template: Technical knowledge, Problem solving, Communication, Interview
readiness, and Overall performance. Every criterion is scored on a 1–5 integer
scale. An overall summary, at least one strength, and at least one improvement
area are required; evidence comments and recommendations are optional.

Submitting the report moves the booking to `COMPLETED` in the same transaction,
records the status change, and queues a candidate notification. A booking has at
most one report, and reports cannot be edited in this sprint because the
editing-window policy is still open.

Reports are visible only to the booking's candidate and expert. A non-participant
receives `404`, and a candidate sees no report content until the expert submits
it. Once the report exists, the candidate may submit one review with a 1–5
rating and an optional comment. Reviews are separate from the expert feedback
and appear on the expert's public profile as an aggregate rating and recent
comments attributed to a "Verified candidate" without the candidate's name.

## Admin Operations API

All endpoints are under `/api/v1` and require an active `ADMIN` role. Every
sensitive write is recorded in the audit log with its before and after state.

| Method | Endpoint                               | Purpose                                 |
| ------ | -------------------------------------- | --------------------------------------- |
| GET    | `/admin/analytics`                     | Operational overview and totals         |
| GET    | `/admin/candidates`                    | Search and filter candidate accounts    |
| GET    | `/admin/candidates/:userId`            | Candidate detail and recent activity    |
| POST   | `/admin/candidates/:userId/suspend`    | Suspend an account and revoke sessions  |
| POST   | `/admin/candidates/:userId/reactivate` | Restore a suspended account             |
| GET    | `/admin/experts/applications`          | Search expert applications and profiles |
| POST   | `/admin/experts/:id/approve`           | Approve and publish                     |
| POST   | `/admin/experts/:id/reject`            | Request changes                         |
| POST   | `/admin/experts/:id/suspend`           | Suspend a published expert              |
| POST   | `/admin/experts/:id/reactivate`        | Restore a suspended expert              |
| GET    | `/admin/bookings`                      | Search and filter bookings              |
| GET    | `/admin/bookings/:bookingId`           | Full booking, payment and history       |
| POST   | `/admin/bookings/:bookingId/cancel`    | Cancel and optionally record a refund   |
| GET    | `/admin/payments`                      | Payment records                         |
| GET    | `/admin/refunds`                       | Manual refund records                   |
| GET    | `/admin/payouts`                       | Expert payout ledger                    |
| POST   | `/admin/payouts/:payoutId/mark-paid`   | Record an offline payout                |
| GET    | `/admin/pricing-rules`                 | List active or all pricing rules        |
| POST   | `/admin/pricing-rules`                 | Create a pricing rule                   |
| PATCH  | `/admin/pricing-rules/:ruleId`         | Edit a pricing rule                     |
| GET    | `/admin/feedback`                      | Search feedback reports                 |
| GET    | `/admin/feedback/:reportId`            | Inspect a report and its review         |
| GET    | `/admin/audit-logs`                    | Filter the append-only audit log        |

Pricing uses a fixed candidate price and a fixed expert payout per duration.
The platform share and commission percentage are derived from the difference;
clients cannot submit a platform amount. Overlapping active rules for the same
duration are rejected with `409 PRICING_RULE_OVERLAP`. Amounts are stored as
whole currency units, matching the illustrative prices in the product spec.

Administrators can cancel bookings that are awaiting approval, awaiting payment,
or confirmed. Cancellation always requires a reason, releases any held slot, and
may record a manual refund up to the successfully paid amount. Full refunds move
the payment to `REFUNDED`; partial refunds move it to `REFUND_PENDING`. The
refund record is a ledger entry only: Mockoraa does not call a payment provider
or move money. The final cancellation and refund policy remains an open product
decision.

The payout ledger creates one entry when a priced booking completes and its
feedback report is submitted. Entries start as `ELIGIBLE`. An administrator can
mark an eligible entry `PAID` to record an offline transfer; no payout provider
is integrated. Feedback quality review is read-only in this sprint; it does not
hide reports or reviews.

Audit entries are append-only and capture administrator ID, action, entity,
before and after state, and timestamp. Passwords, session tokens, and Stream
credentials are never written to the audit payload.

## Observability and Health

Every API response includes an `x-request-id` header. A valid caller-supplied
request ID is preserved; otherwise the API generates one. Requests are logged
as one JSON object per line with the request ID, method, path, status, duration,
and authenticated user ID. Query strings, bodies, headers, passwords, and tokens
are not logged.

| Method | Endpoint        | Access | Purpose                              |
| ------ | --------------- | ------ | ------------------------------------ |
| GET    | `/health`       | Public | Process liveness                     |
| GET    | `/health/ready` | Public | Database readiness; `503` on failure |

Authentication endpoints are rate limited per IP: login 10/minute, registration
30/hour, refresh 30/minute, forgot-password 5/15 minutes, and reset-password
10/15 minutes. Limits are process-local and return `429 RATE_LIMITED` with a
`Retry-After` header. Set `TRUST_PROXY=true` only behind exactly one trusted
reverse proxy.

The production hardening review, deployment checklist, backup/restore
procedure, rollback plan, monitoring requirements, and UAT blockers are in
[`docs/production-readiness.md`](docs/production-readiness.md) and
[`docs/operations-runbook.md`](docs/operations-runbook.md).

## Repository Commands

Run from the repository root:

```bash
npm run dev          # frontend development server
npm run dev:backend  # API development server
npm run build        # build frontend and backend
npm run lint         # ESLint for frontend and backend
npm run typecheck    # TypeScript for both applications
npm run test         # Vitest and backend integration tests
npm run perf:smoke   # API latency/throughput smoke test
npm run format       # apply Prettier
npm run format:check # verify formatting
npm run check        # format, lint, types, tests, and builds
```

Backend tests start an isolated embedded PostgreSQL on port 55433 and apply
migrations automatically. They do not use the development database. The
critical-journey suite covers registration through feedback, review, and payout.

`npm run perf:smoke` targets an already-running API. Configure `PERF_BASE_URL`,
`PERF_REQUESTS`, `PERF_CONCURRENCY`, `PERF_PATHS`, and optionally `PERF_COOKIE`
and `PERF_P95_MS`. Local baseline instructions and results are in the operations
runbook.

## Environment Variables

Never commit `.env` files or secrets. Commit only `.env.example` templates.

- `frontend/.env.example` — `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`
- `backend/.env.example` — database, session, `TRUST_PROXY`, admin seed,
  `PAYMENT_PROVIDER=mock`, Stream Video credentials and call type, interview
  join-window settings, `FEEDBACK_REMINDER_DELAY_HOURS`, and future provider
  placeholders

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Stream, email, storage, and payment credentials are backend-only and must never
use the `NEXT_PUBLIC_` prefix. The Stream API key is sent to participants at
join time with their token; the API secret is never exposed.

## Security Notes

- Passwords are hashed with bcrypt; raw passwords and session tokens are never
  stored.
- Session tokens are random, hashed at rest, expire, rotate on refresh, and are
  revoked on logout and password reset.
- Role checks and account-status checks happen on the backend for every
  protected request.
- Expert applications are reviewed server-side; approval, rejection,
  suspension, and reactivation require an active `ADMIN` role and are audited.
- Admin role assignment requires an active `ADMIN` role and blocks
  self-assignment of admin access.
- Admin pricing, cancellation, refund, payout, and account actions are written
  to an append-only audit log in the same transaction as the change.
- Suspending a candidate sets the account status and revokes existing sessions
  immediately. Suspending an expert removes the active expert role.
- Feedback reports are scoped to the booking's assigned candidate and expert,
  and public reviews never include the candidate's identity.
- Authentication endpoints are rate limited per IP, but the limiter is
  process-local. Email verification and distributed rate limiting are not
  implemented yet and are required before production launch.
- Production readiness details and unresolved launch blockers are documented in
  [`docs/production-readiness.md`](docs/production-readiness.md).

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
git switch -c sprint/04-availability-engine
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
