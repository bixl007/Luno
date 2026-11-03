import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductPreview } from "./ProductPreview";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(60%_60%_at_50%_0%,var(--brand-soft),transparent)] opacity-70"
      />
      <div className="mx-auto w-full max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-fade-up text-sm font-medium text-brand">An AI assistant that checks the web</p>
          <h1 className="font-display mt-4 animate-fade-up text-5xl leading-[1.05] text-balance text-foreground [animation-delay:70ms] sm:text-6xl lg:text-7xl">
            Answers that are current, and show their work.
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-pretty text-muted-foreground [animation-delay:140ms]">
            Luno is a calm AI chat. When a question needs fresh facts, it searches the web on its own and lists the sources it used.
          </p>
          <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:210ms] sm:flex-row">
            <Link href="/signup" className={buttonVariants({ variant: "default", size: "lg", className: "w-full sm:w-auto" })}>
              Start chatting <ArrowRight aria-hidden />
            </Link>
            <Link href="/signin" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
              Log in
            </Link>
          </div>
        </div>
        <div className="mt-16 animate-fade-up [animation-delay:300ms] sm:mt-20">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
