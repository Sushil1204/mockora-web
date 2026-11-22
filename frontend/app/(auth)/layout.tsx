import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
