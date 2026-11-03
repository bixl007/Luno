import { Download, MessagesSquare, Radio, Search, SunMoon, ListChecks } from "lucide-react";

const FEATURES = [
  {
    Icon: Search,
    title: "Searches the web on its own",
    text: "Ask about news, prices, releases or scores. Luno decides when a question needs fresh facts and looks them up.",
  },
  {
    Icon: ListChecks,
    title: "Sources, always shown",
    text: "The pages behind an answer are listed under it and in the context panel, so you can check them yourself.",
  },
  {
    Icon: Radio,
    title: "Replies as they're written",
    text: "Answers stream in word by word, with a plain status line while Luno is searching.",
  },
  {
    Icon: MessagesSquare,
    title: "Conversations you can come back to",
    text: "Every chat is saved with a short generated title. Pick up where you left off, or delete what you don't need.",
  },
  {
    Icon: Download,
    title: "Read, copy, export",
    text: "Listen to an answer, copy it or a single code block, or export a message to PDF.",
  },
  {
    Icon: SunMoon,
    title: "Light, dark or system",
    text: "Luno follows your device by default, and remembers your choice if you pick a side.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand">What Luno does</p>
          <h2 className="font-display mt-3 text-4xl leading-tight text-balance sm:text-5xl">Everything a good answer needs, nothing it doesn&rsquo;t.</h2>
        </div>
        <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title} className="bg-background p-7 transition-colors hover:bg-card">
              <span className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
