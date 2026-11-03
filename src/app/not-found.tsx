import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-5 text-center">
      <Logo />
      <div>
        <p className="font-display text-7xl text-foreground">404</p>
        <h1 className="mt-3 text-lg font-medium">This page isn&rsquo;t here.</h1>
        <p className="mt-1.5 text-muted-foreground">The link may be old, or the address mistyped.</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "default" })}>Back to Luno</Link>
    </main>
  );
}
