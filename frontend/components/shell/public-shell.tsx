import { Suspense, type ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { SkipLink } from "./skip-link";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SkipLink />
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="h-16 border-b border-border bg-background"
          />
        }
      >
        <SiteHeader />
      </Suspense>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
