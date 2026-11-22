import { bookingStatusLabels, bookingStatusStyles } from "@/lib/labels";
import type { BookingStatus } from "@/lib/types";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${bookingStatusStyles[status]}`}
    >
      {bookingStatusLabels[status]}
    </span>
  );
}
