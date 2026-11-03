import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Built by{" "}
            <a href="https://xyrix.fun/" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground">
              Bishal Baira
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/signin" className="hover:text-foreground">Log in</Link>
          <Link href="/signup" className="hover:text-foreground">Sign up</Link>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
