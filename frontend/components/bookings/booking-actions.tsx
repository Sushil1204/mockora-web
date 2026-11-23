"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { SectionHeader } from "@/components/ui/page-header";
import { ApiError, apiRequest } from "@/lib/api";
import type { BookingResponse } from "@/lib/types";

export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "approve" | "decline" | null
  >(null);
  const [showDecline, setShowDecline] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "approve" | "decline") {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setError(null);
    setMessage(null);

    try {
      await apiRequest<BookingResponse>(`/bookings/${bookingId}/${action}`, {
        method: "POST",
        ...(action === "decline"
          ? {
              body: JSON.stringify({
                reason: reason.trim() || undefined,
              }),
            }
          : {}),
      });

      setMessage(
        action === "approve"
          ? "Request approved. The candidate now has one hour to pay."
          : "Request declined. The slot has been released.",
      );
      setShowDecline(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not update this booking. Check your connection and try again.",
      );

      if (
        requestError instanceof ApiError &&
        ["BOOKING_EXPIRED", "BOOKING_NOT_PENDING"].includes(requestError.code)
      ) {
        router.refresh();
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="mt-6 bg-surface-muted p-5">
      <SectionHeader
        title="Your response"
        description="Approving keeps the slot reserved while the candidate pays. Declining releases the slot immediately."
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          loading={pendingAction === "approve"}
          disabled={pendingAction !== null}
          onClick={() => void act("approve")}
        >
          {pendingAction === "approve" ? "Approving…" : "Approve request"}
        </Button>
        <Button
          variant="secondary"
          disabled={pendingAction !== null}
          aria-expanded={showDecline}
          onClick={() => setShowDecline((current) => !current)}
        >
          {showDecline ? "Cancel decline" : "Decline request"}
        </Button>
      </div>

      {showDecline ? (
        <div className="mt-5 rounded-control border border-border bg-surface p-4">
          <Field
            id="decline-reason"
            label="Reason for declining"
            hint="Optional. The candidate sees this reason."
          >
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Let the candidate know why this time does not work."
            />
          </Field>
          <Button
            variant="secondary"
            className="mt-4"
            loading={pendingAction === "decline"}
            disabled={pendingAction !== null}
            onClick={() => void act("decline")}
          >
            {pendingAction === "decline" ? "Declining…" : "Confirm decline"}
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}
        {message ? (
          <Alert variant="success" className="mt-4">
            {message}
          </Alert>
        ) : null}
      </div>
    </Card>
  );
}
