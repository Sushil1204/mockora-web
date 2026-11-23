import Link from "next/link";

import { Logo } from "@/components/shell/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:px-6"
      >
        <p className="text-overline font-semibold uppercase text-terracotta-600">
          404 · Not found
        </p>
        <h1 className="mt-3 text-page font-semibold tracking-tight text-foreground">
          We could not find that page.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The link may be out of date, or the page may have moved. Your account
          and bookings are unchanged.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className={buttonClasses()}>
            Return home
          </Link>
          <Link
            href="/experts"
            className={buttonClasses({ variant: "secondary" })}
          >
            Browse experts
          </Link>
        </div>
      </main>
    </div>
  );
}
