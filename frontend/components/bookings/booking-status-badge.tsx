import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { bookingStatusLabels } from "@/lib/labels";
import type { BookingStatus } from "@/lib/types";

const statusVariants: Record<BookingStatus, BadgeVariant> = {
  PENDING_EXPERT_APPROVAL: "warning",
  APPROVED_PENDING_PAYMENT: "info",
  CONFIRMED: "success",
  DECLINED: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED_PENDING_FEEDBACK: "warning",
  COMPLETED: "success",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      {bookingStatusLabels[status]}
    </Badge>
  );
}
