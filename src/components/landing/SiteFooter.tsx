import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const link = "rounded-sm text-muted-foreground transition-colors hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar/50">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">A calm AI chat that checks the web and shows its sources.</p>
        </div>
        <nav aria-label="Product" className="space-y-3 text-sm">
          <p className="font-medium">Product</p>
          <ul className="space-y-2">
            <li><Link href="#features" className={link}>Features</Link></li>
            <li><Link href="#how-it-works" className={link}>How it works</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account" className="space-y-3 text-sm">
          <p className="font-medium">Account</p>
          <ul className="space-y-2">
            <li><Link href="/signin" className={link}>Log in</Link></li>
            <li><Link href="/signup" className={link}>Sign up</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-8">
          <p className="text-sm text-muted-foreground">
            Built by{" "}
            <a href="https://xyrix.fun/" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-border-strong underline-offset-4 hover:decoration-foreground">
              Bishal Baira
            </a>
            .
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
