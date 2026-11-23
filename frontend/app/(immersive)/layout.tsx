import type { ReactNode } from "react";

import { ImmersiveShell } from "@/components/shell/immersive-shell";

export default function ImmersiveLayout({ children }: { children: ReactNode }) {
  return <ImmersiveShell>{children}</ImmersiveShell>;
}
