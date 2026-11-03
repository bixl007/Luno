"use client";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-5 text-center">
      <Logo />
      <div>
        <h1 className="font-display text-4xl text-foreground">Something went wrong.</h1>
        <p className="mt-2 text-muted-foreground">It isn&rsquo;t you. Try again, and if it keeps happening, come back in a little while.</p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
