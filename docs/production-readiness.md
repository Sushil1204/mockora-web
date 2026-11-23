# Production Readiness

**Status:** Hardening work complete locally. Not approved for production until
the blockers in this document are resolved.

**Last updated:** 2026-11-23

## Scope

This review covers the Mockoraa API and web application as committed on
`sprint/11-production-hardening`. It does not cover staging or production
infrastructure, which do not exist yet.

## Security Review

| Area                    | Finding                                                                      | Status                 |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Mock payments           | Disabled when `NODE_ENV=production`; covered by an existing test             | Verified               |
| Session cookies         | httpOnly, SameSite=Lax, secure in production, rotated on refresh             | Verified               |
| Admin authorization     | Every `/admin` controller is role-guarded; admin writes are audited          | Verified               |
| Resource ownership      | Bookings, reports, interview tokens, and payments are scoped to participants | Verified               |
| Input validation        | Zod schemas on HTTP inputs; Prisma parameterization for queries              | Verified               |
| Rate limiting           | Auth endpoints limited per IP; process-local                                 | Added, limited         |
| Security headers        | Helmet defaults on the API; no Content-Security-Policy on the web app        | Open                   |
| Email verification      | Not implemented                                                              | Blocking before launch |
| Password reset delivery | Token flow exists, but no email provider is connected                        | Blocking before launch |
| MFA                     | Not implemented; not an MVP requirement                                      | Deferred               |

### Rate limiting

| Endpoint                     | Limit                    |
| ---------------------------- | ------------------------ |
| `POST /auth/register`        | 30 per hour per IP       |
| `POST /auth/login`           | 10 per minute per IP     |
| `POST /auth/refresh`         | 30 per minute per IP     |
| `POST /auth/forgot-password` | 5 per 15 minutes per IP  |
| `POST /auth/reset-password`  | 10 per 15 minutes per IP |

Responses return `429 RATE_LIMITED` with `Retry-After`. The limiter is stored in
process memory, so each API instance enforces its own quota. Before horizontal
scaling, replace it with a shared store such as Redis or enforce limits at the
edge proxy. Set `TRUST_PROXY=true` only when exactly one trusted reverse proxy
sets the client IP; otherwise `X-Forwarded-For` can be spoofed.

## Authorization Review

- Authentication and role checks run globally through `SessionAuthGuard` and
  `RolesGuard`.
- Public routes are explicitly marked with `@Public()`: authentication,
  health, taxonomies, marketplace, and public availability.
- Candidate, expert, payment, feedback, and admin operations validate the
  caller's role and ownership in the service layer, not only in the UI.
- Suspended accounts lose existing sessions; suspended experts lose their active
  expert role and public eligibility.
- Interview tokens are issued only to the assigned participant inside the join
  window.
- Admin role assignment rejects self-assignment and requires an active admin.

## Dependency Review

Run on 2026-11-23:

| Application | Production audit result |
| ----------- | ----------------------- |
| Frontend    | 0 vulnerabilities       |
| Backend     | 4 high, 0 critical      |

The backend findings are `deepmerge-ts` and `effect`, reached through
`@prisma/config` in the Prisma CLI toolchain. `npm audit` reports them in the
production view because `prisma` is an optional peer of `@prisma/client`, but
the generated client does not load `@prisma/config` at runtime. The available
fix requires Prisma 7, a major upgrade that is not approved in the current
stack. This is a known tooling risk for now, not a claim that the backend is
vulnerability-free; the release owner must accept it or approve the upgrade.

The development audit also reports 19 moderate findings in Jest and Nest CLI
packages. Those packages are not part of the deployed API artifact.

No dependency was added during this sprint. Re-run both audits before each
release and upgrade Prisma after explicit approval.

## Secret Review

- Only `backend/.env.example` and `frontend/.env.example` are tracked.
- `backend/.env`, `frontend/.env.local`, and root `.env` are gitignored.
- No `.env` file exists anywhere in Git history.
- No live provider keys, private keys, or production database URLs were found.
- Test-only database credentials and the fake `test-stream-api-secret` live in
  test fixtures and are not used outside the test environment.
- Production secrets must be supplied by the hosting secret manager, never by
  committed files.
