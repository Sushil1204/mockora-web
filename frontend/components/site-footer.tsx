import Link from "next/link";

import { Logo } from "@/components/shell/logo";

const footerLinks = [
  { href: "/experts", label: "Find experts" },
  { href: "/expert/application", label: "Become an expert" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr] sm:gap-10">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Mock interviews with verified professionals, built to make your
              next interview feel more familiar.
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Explore
            </h2>
            <ul className="mt-4 space-y-1">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center rounded-control text-sm font-medium text-foreground transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Mockoraa</p>
          <p>Practice the interview before it counts.</p>
        </div>
      </div>
    </footer>
  );
}
