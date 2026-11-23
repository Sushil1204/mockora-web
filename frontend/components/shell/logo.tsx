import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Mockoraa home"
      className={cn(
        "flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        className,
      )}
    >
      <Image
        src="/mockoraa-icon.png"
        alt=""
        width={30}
        height={30}
        className="h-[30px] w-[30px]"
        priority
      />
      {compact ? null : (
        <span className="hidden text-lg font-semibold tracking-tight text-primary-800 min-[360px]:inline">
          Mockoraa
        </span>
      )}
    </Link>
  );
}
