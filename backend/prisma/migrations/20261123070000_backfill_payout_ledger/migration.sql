-- Backfill one eligible payout entry for each priced booking that completed
-- before the payout ledger existed. New completions are written by the
-- feedback submission transaction.
INSERT INTO "payouts" (
    "id",
    "expert_profile_id",
    "booking_id",
    "amount",
    "currency",
    "status",
    "eligible_at",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    "bookings"."expert_profile_id",
    "bookings"."id",
    "bookings"."expert_payout_amount",
    "bookings"."currency",
    'ELIGIBLE',
    COALESCE("bookings"."completed_at", "bookings"."updated_at"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "bookings"
WHERE
    "bookings"."status" = 'COMPLETED'
    AND "bookings"."expert_payout_amount" IS NOT NULL
    AND "bookings"."currency" IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM "payouts"
        WHERE "payouts"."booking_id" = "bookings"."id"
    );
