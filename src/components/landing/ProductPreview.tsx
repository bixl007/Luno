"use client";

import { useReducedMotion } from "motion/react";
import { ArrowUp, Globe, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { Chopper } from "@/components/brand/Chopper";

const CHATS = ["Weekend in Lisbon", "Rewrite my cover letter", "Explain the Raft algorithm", "Trip budget"];
const ANSWER =
  "Saturday looks sunny with a high near 22°C and a light westerly breeze. Sunday clouds over in the afternoon, with a small chance of showers in the evening.";

/** A drawing of the chat screen that plays one reply (search, stream, sources), built from the same tokens as the real app. */
export function ProductPreview() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0); // 0 waiting, 1 searching, 2 writing
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let tick: ReturnType<typeof setInterval> | undefined;
    const searching = setTimeout(() => setPhase(1), 600);
    const writing = setTimeout(() => {
      setPhase(2);
      tick = setInterval(() => setCount((c) => Math.min(c + 2, ANSWER.length)), 24);
    }, 2000);
    return () => {
      clearTimeout(searching);
      clearTimeout(writing);
      clearInterval(tick);
    };
  }, [reduce]);

  const p = reduce ? 2 : phase;
  const shown = reduce ? ANSWER.length : count;
  const done = shown >= ANSWER.length;

  return (
    <div
      role="img"
      aria-label="Illustration of the Luno chat: a question about the weather, a web search, then an answer with its sources listed underneath"
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border-strong bg-card shadow-lg ring-1 ring-brand/10"
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-sidebar px-4 py-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
      </div>
      <div className="flex min-h-[26rem] sm:min-h-[28rem]" aria-hidden>
        <div className="hidden w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 md:flex">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium">
            <Plus className="size-3.5" /> New chat
          </div>
          <p className="mt-4 mb-1.5 px-2 text-[11px] font-medium text-subtle-foreground">Recent</p>
          <ul className="space-y-0.5">
            {CHATS.map((c, i) => (
              <li key={c} className={cn("truncate rounded-md px-2.5 py-1.5 text-xs", i === 0 ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground")}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-5 sm:p-8">
          <div className="space-y-6">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm">
                What&rsquo;s the weather like in Lisbon this weekend?
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card">
                <LogoMark className="size-4" />
              </div>
              <div className="min-w-0 space-y-3 text-sm leading-6">
                <p className={cn("inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand transition-opacity duration-500", p === 0 && "opacity-0")}>
                  <Search className="size-3" /> {p === 1 ? "Searching the web…" : "Searched the web"}
                </p>
                {/* The unwritten part stays in the flow, invisible, so the box never changes size while typing. */}
                <p>
                  <span className={cn(!done && p === 2 && "caret")}>{ANSWER.slice(0, shown)}</span>
                  <span className="opacity-0">{ANSWER.slice(shown)}</span>
                </p>
                <div className={cn("flex flex-wrap gap-2 pt-1 transition-all duration-500", !done && "translate-y-1 opacity-0")}>
                  {["ipma.pt", "weather.com", "meteoblue.com"].map((host) => (
                    <span key={host} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      <Globe className="size-3" /> {host}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            {/* Chopper sits on the box edge, as in the real chat: his hip on the border, legs and cape over the box. */}
            <div className="relative z-10 flex items-end justify-end gap-2 px-4 sm:px-6">
              <div
                className={cn(
                  "relative mb-9 max-w-[min(15rem,calc(100%-5rem))] rounded-2xl border border-border bg-popover px-3 py-2 text-xs leading-5 text-muted-foreground shadow-md transition-all duration-500",
                  !done && "translate-y-1 opacity-0",
                )}
              >
                <span className="font-medium text-foreground">Chopper:</span> a reindeer&rsquo;s eyes turn from gold in summer to blue in winter.
                <span aria-hidden className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rotate-45 border-t border-r border-border bg-popover" />
              </div>
              <Chopper className="-mb-[18px] h-[5.5rem] w-auto shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-strong bg-card pt-6 pr-2.5 pb-2.5 pl-4 text-sm text-subtle-foreground shadow-xs">
              <span className="truncate">Ask a follow-up…</span>
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
