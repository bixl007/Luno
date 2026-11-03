import { ArrowRight, Globe, Moon, Search } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductPreview } from "./ProductPreview";

const POINTS = [
  { Icon: Search, text: "Live web search" },
  { Icon: Globe, text: "Sources on every answer" },
  { Icon: Moon, text: "Light and dark" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="aurora-blob aurora-brand -top-40 left-[8%] h-[34rem] w-[34rem]" />
        <div className="aurora-blob aurora-warm -top-24 right-[4%] h-[28rem] w-[28rem] [animation-delay:-6s] [animation-duration:22s]" />
        <div className="aurora-blob aurora-cool top-56 left-[38%] h-[26rem] w-[26rem] [animation-delay:-11s] [animation-duration:26s]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-20 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border-strong bg-card/80 py-1 pr-3 pl-1.5 text-[13px] font-medium text-muted-foreground shadow-xs backdrop-blur">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">New</span>
            Meet Chopper, the reindeer in your chat box
          </p>
          <h1 className="font-display mt-6 animate-fade-up text-5xl leading-[1.05] text-balance text-foreground [animation-delay:70ms] sm:text-6xl lg:text-7xl">
            Answers that are current, and <span className="text-gradient-brand italic">show their work.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-pretty text-muted-foreground [animation-delay:140ms]">
            Luno is a calm AI chat. When a question needs fresh facts, it searches the web on its own and lists the sources it used.
          </p>
          <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:210ms] sm:flex-row">
            <Link href="/signup" className={buttonVariants({ variant: "default", size: "lg", className: "w-full shadow-md sm:w-auto" })}>
              Start chatting <ArrowRight aria-hidden />
            </Link>
            <Link href="/signin" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
              Log in
            </Link>
          </div>
          <ul className="mt-8 flex animate-fade-up flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground [animation-delay:280ms]">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5 text-brand" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-14 animate-fade-up [animation-delay:360ms] sm:mt-20">
          <div aria-hidden className="aurora-brand absolute -inset-x-6 -inset-y-10 -z-10 rounded-[3rem] opacity-60" />
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
