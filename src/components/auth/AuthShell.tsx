import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type AuthShellProps = {
  heading: string;
  subheading: string;
  children: React.ReactNode;
};

/** Shared frame for the sign-in and sign-up screens; Clerk's form sits in the right-hand column. */
export function AuthShell({ heading, subheading, children }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between border-r border-border bg-sidebar p-12 lg:flex">
        <Link href="/" aria-label="Luno home" className="w-fit rounded-md">
          <Logo />
        </Link>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-[1.08] text-balance text-foreground">{heading}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{subheading}</p>
        </div>
        <p className="text-sm text-subtle-foreground">Luno searches the web when it needs to, and shows you where it looked.</p>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-5 py-16">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Luno home" className="rounded-md lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex w-full justify-center animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
