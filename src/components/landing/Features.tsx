import {
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  MessagesSquare,
  Radio,
  Search,
  SlidersHorizontal,
  SunMoon,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Chopper } from "@/components/brand/Chopper";
import { Reveal } from "./Reveal";

function Tile({ title, text, Icon, className, children }: { title: string; text: string; Icon: typeof Search; className?: string; children?: ReactNode }) {
  return (
    <li className={cn("group", className)}>
      <Reveal className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-md sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="grid size-9 place-items-center rounded-lg border border-border bg-background text-brand">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <h3 className="mt-5 text-base font-semibold">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{text}</p>
        {children && (
          <div aria-hidden className="mt-6 flex-1">
            {children}
          </div>
        )}
      </Reveal>
    </li>
  );
}

const chip = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground";

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-brand">What Luno does</p>
          <h2 className="font-display mt-3 text-4xl leading-tight text-balance sm:text-5xl">
            Everything a good answer needs, <span className="text-gradient-brand italic">nothing it doesn&rsquo;t.</span>
          </h2>
        </Reveal>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Tile
            Icon={Search}
            title="Searches the web, shows its sources"
            text="Ask about news, prices, releases or scores. Luno decides when a question needs fresh facts, looks them up, and lists the pages behind the answer so you can check them yourself."
            className="sm:col-span-2 lg:col-span-4"
          >
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                <Search className="size-3" /> Searched the web
              </p>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-11/12 rounded-full bg-muted" />
                <div className="h-2 w-4/5 rounded-full bg-muted" />
                <div className="h-2 w-2/3 rounded-full bg-muted" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["reuters.com", "bbc.com", "wikipedia.org"].map((h) => (
                  <span key={h} className={chip}>
                    <Globe className="size-3" /> {h}
                  </span>
                ))}
              </div>
            </div>
          </Tile>

          <Tile
            Icon={MessagesSquare}
            title="Meet Chopper"
            text="A friendly reindeer who sits in the chat box and shares a fun fact now and then."
            className="lg:col-span-2"
          >
            <div className="flex items-end gap-3">
              <Chopper className="animate-float h-20 w-auto shrink-0" />
              <p className="rounded-2xl rounded-bl-md border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                Fun fact: reindeer are the only deer where both sexes grow antlers.
              </p>
            </div>
          </Tile>

          <Tile Icon={FileText} title="Files and photos" text="Attach a document or a picture and ask about what is in it." className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <span className={chip}><FileText className="size-3" /> report.pdf</span>
              <span className={chip}><ImageIcon className="size-3" /> receipt.jpg</span>
              <span className={chip}><FileSpreadsheet className="size-3" /> budget.csv</span>
            </div>
          </Tile>

          <Tile Icon={Layers} title="More than one model" text="Pick the model that fits the question: quick for chat, deeper for hard problems." className="lg:col-span-2">
            <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-xs">
              {["Fast", "Balanced", "Deep"].map((m, i) => (
                <span key={m} className={cn("rounded-full px-3 py-1", i === 1 ? "bg-accent font-medium text-foreground shadow-xs" : "text-subtle-foreground")}>
                  {m}
                </span>
              ))}
            </div>
          </Tile>

          <Tile Icon={Volume2} title="Read aloud" text="Listen to any answer when your eyes are busy elsewhere." className="sm:col-span-2 lg:col-span-2">
            <div className="flex h-9 items-center gap-1">
              {Array.from({ length: 22 }, (_, i) => (
                <span
                  key={i}
                  className="animate-wave h-full w-1 origin-center rounded-full bg-brand/70"
                  style={{ animationDelay: `${(i % 7) * 130}ms`, animationDuration: `${900 + (i % 5) * 160}ms` }}
                />
              ))}
            </div>
          </Tile>

          <Tile Icon={SlidersHorizontal} title="Make it yours" text="Tell Luno how you like your answers, short or thorough, formal or friendly, and pick light, dark or follow your device." className="lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              {["Short and direct", "Thorough", "Friendly"].map((t, i) => (
                <span key={t} className={cn(chip, i === 0 && "border-brand/40 bg-brand-soft text-brand")}>{t}</span>
              ))}
              <span className={chip}><SunMoon className="size-3" /> Light, dark, system</span>
            </div>
          </Tile>

          <Tile Icon={Radio} title="Built for the everyday" text="Replies stream in as they are written, every chat is saved with a short title, and any answer can be copied or exported to PDF." className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              <span className={chip}><Radio className="size-3" /> Live streaming</span>
              <span className={chip}><MessagesSquare className="size-3" /> Saved chats</span>
              <span className={chip}><Download className="size-3" /> Copy and PDF</span>
            </div>
          </Tile>
        </ul>
      </div>
    </section>
  );
}
