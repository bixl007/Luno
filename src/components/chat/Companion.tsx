"use client";

import { useEffect, useState } from "react";
import { Chopper } from "@/components/brand/Chopper";
import { GREETING, WORKING, nextLine } from "./chopperLines";

const ROTATE_MS = 12000;

/**
 * Chopper sitting on the top edge of the message box, with a speech bubble beside him. It takes up room in the layout
 * (it is not floated over the page), so the bubble can never cover the text above it.
 */
export function Companion({ busy }: { busy: boolean }) {
  // Starts with a fixed line: a random one would differ between the server render and the browser.
  const [line, setLine] = useState(GREETING);
  const [workingLine, setWorkingLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setLine((previous) => nextLine(previous)), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (busy) setWorkingLine(Math.floor(Math.random() * WORKING.length));
  }, [busy]);

  const said = busy ? WORKING[workingLine] : line;

  return (
    <div className="relative z-10 flex items-end justify-end gap-2 px-6">
      <p
        key={said}
        className="relative mb-9 min-w-0 max-w-[min(22rem,calc(100%-7rem))] animate-pop-in rounded-2xl border border-border-strong bg-popover px-3 py-1.5 text-xs leading-snug text-popover-foreground shadow-sm"
      >
        {said}
        <span aria-hidden className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rotate-45 border-t border-r border-border-strong bg-popover" />
      </p>
      {/* He sits on the box's top edge: his hip is on the border, so his legs and cape dangle about 21px over the box (the box has extra top padding for them). */}
      <button
        type="button"
        onClick={() => setLine((previous) => nextLine(previous))}
        aria-label="Chopper: tell me something else"
        title="Chopper"
        className="-mb-[21px] shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Chopper className="h-24 w-auto" />
      </button>
    </div>
  );
}
