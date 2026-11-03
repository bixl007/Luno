import { BookOpenCheck, MessageSquareText, Search } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS = [
  { Icon: MessageSquareText, title: "Ask anything", text: "Type a question the way you would say it. No special syntax." },
  { Icon: Search, title: "Luno checks the web", text: "If the answer could have changed lately, it searches by itself and reads what it finds." },
  { Icon: BookOpenCheck, title: "Read it, check it", text: "The answer streams in with its sources listed, so you can open the pages yourself." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-border bg-sidebar/50">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand">How it works</p>
          <h2 className="font-display mt-3 text-4xl leading-tight text-balance sm:text-5xl">Three steps, no learning curve.</h2>
        </Reveal>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="absolute top-6 right-[16.7%] left-[16.7%] hidden border-t border-dashed border-border-strong md:block" />
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title}>
              <Reveal delay={i * 0.1} className="relative flex flex-col items-center text-center">
                <span className="relative grid size-12 place-items-center rounded-full border border-border-strong bg-card text-brand shadow-sm">
                  <Icon className="size-5" aria-hidden />
                  <span aria-hidden className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
