import { cn } from "@/lib/cn";
import { initials } from "@/lib/labels";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
} as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  if (src) {
    return (
      // Avatars are user-supplied; a plain image avoids remote-host config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          sizes[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-primary-100 bg-primary-50 font-semibold text-primary-700",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
