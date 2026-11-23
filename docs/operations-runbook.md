# Operations Runbook

**Last updated:** 2026-11-23

## Observability

The API emits one JSON line per request to stdout:

```json
{
  "timestamp": "2026-11-23T08:30:29.535Z",
  "level": "info",
  "event": "http_request",
  "requestId": "9acfe233-9b67-4227-b490-9e458db121d5",
  "method": "PUT",
  "path": "/api/v1/candidate/profile",
  "statusCode": 200,
  "durationMs": 17.2,
  "userId": "b0a8487d-ee1b-4f36-944b-6f437c3d16d5"
}
```

- `x-request-id` is accepted when it is 8–100 safe characters and generated
  otherwise. It is returned on every response.
- Query strings, headers, bodies, passwords, and tokens are never logged.
- 4xx responses log at `warn`; 5xx responses and unhandled exceptions log at
  `error` with a serialized stack.
- `/api/v1/health` is a liveness probe.
- `/api/v1/health/ready` checks `SELECT 1` and returns `503` with
  `{"status":"unavailable","checks":{"database":"down"}}` when PostgreSQL is
  unreachable.
- Health-check requests are not written to the request log.

### Required monitoring provider

No external error-monitoring or log-drain provider is connected yet. Before
launch, select a provider and ship stdout JSON to it. At minimum alert on:

1. `/health/ready` returning non-2xx for two consecutive checks.
2. Any 5xx response or `unhandled_exception` event.
3. p95 latency above the staging SLO.
4. Spikes in `RATE_LIMITED` responses.
5. Notification delivery failures or a growing pending outbox.
6. Failed or stuck payment attempts.
7. Scheduled-job failures or an API process that stops logging.

Do not log or attach request bodies when configuring the provider.

## Performance Baseline

Command:

```bash
npm run build --prefix backend
PERF_BASE_URL=http://localhost:4000/api/v1 \
PERF_REQUESTS=100 \
PERF_CONCURRENCY=10 \
npm run perf:smoke
```

Local result using embedded PostgreSQL and seeded demo data:

| Metric      | Result      |
| ----------- | ----------- |
| Requests    | 100         |
| Concurrency | 10          |
| Failures    | 0           |
| Throughput  | 223.9 req/s |
| p50         | 30.6 ms     |
| p95         | 87.4 ms     |
| p99         | 103.5 ms    |

The same workload against the remote development database produced a p95 of
approximately 2,004 ms. That confirms the API and database must be co-located in
production. These are smoke baselines, not capacity numbers. Repeat against
staging with realistic data and add authenticated booking writes before setting
an SLO.

The load-smoke script accepts `PERF_P95_MS` to fail when a threshold is exceeded
and `PERF_COOKIE` to exercise authenticated GET endpoints.

## Backup and Recovery

These are proposed objectives and require owner approval:

- **RPO:** 15 minutes
- **RTO:** 2 hours
- **Snapshot retention:** 30 days
- **Restore drill:** quarterly, and before any high-risk migration

Use the managed PostgreSQL provider's automated snapshots and
point-in-time-recovery. Take an on-demand snapshot immediately before every
production migration.

### Restore procedure

1. Declare an incident and pause writes (maintenance page or scale the API to
   zero).
2. Provision an empty PostgreSQL instance with the same major version.
3. Restore the latest snapshot, or recover to the last known-good timestamp.
4. Point a staging API at the restored database.
5. Run `npm run db:deploy --prefix backend` and `prisma migrate status`.
6. Verify row counts for users, bookings, payments, payouts, feedback, and
   audit logs.
7. Run `/health/ready`, the critical-journey smoke test, and a read-only admin
   check.
8. Rotate database credentials if compromise is suspected.
9. Switch production traffic to the restored instance and monitor errors.

Never restore over production in place. Restore to a new instance so the
original remains available for investigation.

## Deployment Checklist

### Before deployment

- [ ] Release commit is merged and CI is green.
- [ ] `npm audit --omit=dev` results reviewed for both applications.
- [ ] No secrets or generated artifacts are staged.
- [ ] Production environment variables are set in the secret manager.
- [ ] `FRONTEND_URL` contains only trusted HTTPS origins.
- [ ] `SESSION_COOKIE_SECURE` is true or `NODE_ENV=production`.
- [ ] `TRUST_PROXY` matches the actual proxy topology.
- [ ] `PAYMENT_PROVIDER=mock` and `NODE_ENV=production` so mock results are
      rejected.
- [ ] Stream call type has recording disabled.
- [ ] Database snapshot completed.
- [ ] Rollback artifact and previous release tag are identified.

### Deploy

1. Install with `npm ci` in root, `frontend`, and `backend`.
2. Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
   `npm run test`, and `npm run build`.
3. Run `npm run db:deploy --prefix backend`.
4. Deploy the backend and wait for `/api/v1/health/ready` to return 200.
5. Deploy the frontend and verify the public landing page and expert listing.
6. Run the critical journey against staging.
7. Confirm logs include request IDs and no secrets.
8. Announce the release only after smoke checks pass.

### Rollback

1. Shift traffic back to the previous backend and frontend artifacts.
2. Verify `/health/ready` and the public marketplace.
3. Check whether the migration was additive. Prisma migrations are
   forward-only; do not hand-edit migration history.
4. If the old application is incompatible with the new schema, roll forward
   with a fix. Restore a snapshot only for data corruption or an incompatible,
   unrecoverable migration.
5. Record the incident, data impact, and follow-up actions.

## UAT and Policy Blockers

Staging/UAT verification is blocked: no staging environment or hosting target
has been selected. The local critical-journey test covers registration, expert
approval, discovery, booking, payment, interview access, feedback, review, and
payout creation, but it is not a substitute for browser UAT.

Before launch, the following remain required:

- Approved cancellation, refund, no-show, rescheduling, join-window, feedback,
  and review policies.
- Email delivery and verification.
- External error monitoring and alert routing.
- CSP and edge rate limiting.
- A real payment provider decision; live payments remain out of scope.
- Staging UAT including keyboard, screen-reader, and mobile checks.
