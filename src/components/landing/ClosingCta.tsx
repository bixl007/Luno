import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <h2 className="font-display mx-auto max-w-2xl text-4xl leading-tight text-balance sm:text-5xl">
          Ask the thing you&rsquo;d normally have to google.
        </h2>
        <div className="mt-9 flex justify-center">
          <Link href="/signup" className={buttonVariants({ variant: "default", size: "lg" })}>
            Start chatting <ArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
