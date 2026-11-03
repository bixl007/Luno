import { cn } from "@/lib/utils";

/** The Luno mark: a crescent with a small star. Draws in currentColor so it follows any theme. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-6", className)}>
      <path
        d="M22.5 4.6A12.4 12.4 0 1 0 27.4 22 10.2 10.2 0 0 1 22.5 4.6Z"
        fill="currentColor"
      />
      <circle cx="24.2" cy="9.6" r="1.7" fill="var(--brand)" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[1.35rem] leading-none font-medium">Luno</span>
    </span>
  );
}
