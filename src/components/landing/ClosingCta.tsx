import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Chopper } from "@/components/brand/Chopper";
import { Reveal } from "./Reveal";

export function ClosingCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="relative isolate overflow-hidden rounded-3xl border border-border-strong bg-card px-6 py-16 text-center shadow-md sm:px-12 sm:py-20">
          <div aria-hidden className="absolute inset-0 -z-10">
            <div className="bg-grid absolute inset-0 opacity-50" />
            <div className="aurora-blob aurora-brand -top-32 -left-24 h-96 w-96" />
            <div className="aurora-blob aurora-warm -right-24 -bottom-32 h-96 w-96 [animation-delay:-8s]" />
          </div>
          <Chopper className="animate-float mx-auto h-20 w-auto" />
          <h2 className="font-display mx-auto mt-5 max-w-2xl text-4xl leading-tight text-balance sm:text-5xl">
            Ask the thing you&rsquo;d normally have to <span className="text-gradient-brand italic">google.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Sign in, ask, and see where the answer came from.</p>
          <div className="mt-9 flex justify-center">
            <Link href="/signup" className={buttonVariants({ variant: "default", size: "lg", className: "shadow-md" })}>
              Start chatting <ArrowRight aria-hidden />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
