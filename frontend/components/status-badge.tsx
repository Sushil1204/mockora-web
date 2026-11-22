import {
  verificationStatusLabels,
  verificationStatusStyles,
} from "@/lib/labels";
import type { VerificationStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${verificationStatusStyles[status]}`}
    >
      {verificationStatusLabels[status]}
    </span>
  );
}
