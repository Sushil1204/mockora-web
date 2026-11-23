import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PublicUser, Role } from "@/lib/types";

const roleLabels: Record<Role, string> = {
  CANDIDATE: "Candidate",
  EXPERT: "Expert",
  ADMIN: "Administrator",
};

export function AccountDetailsCard({ user }: { user: PublicUser }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-surface-muted/60 px-5 py-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Account details
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Read-only facts tied to this sign-in.
        </p>
      </div>
      <dl className="divide-y divide-border px-5">
        <div className="py-4">
          <dt className="text-xs font-medium text-muted">Email</dt>
          <dd className="mt-1 break-all text-sm font-medium text-foreground">
            {user.email}
          </dd>
        </div>
        <div className="py-4">
          <dt className="text-xs font-medium text-muted">Roles</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <Badge key={role} variant="brand">
                {roleLabels[role]}
              </Badge>
            ))}
          </dd>
        </div>
        <div className="py-4">
          <dt className="text-xs font-medium text-muted">Member since</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">
            {new Date(user.createdAt).toLocaleDateString("en", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
