import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Luno home" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1.5 sm:gap-2">
          <Link href="#features" className="mr-2 hidden rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block">
            Features
          </Link>
          <Link href="#how-it-works" className="mr-2 hidden rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-block">
            How it works
          </Link>
          <ThemeToggle className="mr-1 hidden sm:inline-flex" />
          <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Log in
          </Link>
          <Link href="/signup" className={buttonVariants({ variant: "default", size: "sm" })}>
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
