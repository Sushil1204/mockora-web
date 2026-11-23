import type { ReactNode } from "react";

import { SkipLink } from "./skip-link";

export function ImmersiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SkipLink />
      {children}
    </div>
  );
}
