import { Globe, Plus, Search } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

const CHATS = ["Weekend in Lisbon", "Rewrite my cover letter", "Explain the Raft algorithm", "Trip budget"];

/** A static drawing of the chat screen, built from the same tokens as the real app. */
export function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Illustration of the Luno chat: a question about the weather answered with web sources listed underneath"
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border-strong bg-card shadow-lg"
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-sidebar px-4 py-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
        <span className="size-2.5 rounded-full bg-border-strong" />
      </div>
      <div className="flex min-h-[22rem] sm:min-h-[26rem]" aria-hidden>
        <div className="hidden w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 md:flex">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium">
            <Plus className="size-3.5" /> New chat
          </div>
          <p className="mt-4 mb-1.5 px-2 text-[11px] font-medium text-subtle-foreground">Recent</p>
          <ul className="space-y-0.5">
            {CHATS.map((c, i) => (
              <li key={c} className={`truncate rounded-md px-2.5 py-1.5 text-xs ${i === 0 ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground"}`}>
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
                <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                  <Search className="size-3" /> Searched the web
                </p>
                <p>
                  Saturday looks sunny with a high near 22°C and a light westerly breeze. Sunday clouds over in the afternoon,
                  with a small chance of showers in the evening.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["ipma.pt", "weather.com", "meteoblue.com"].map((host) => (
                    <span key={host} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      <Globe className="size-3" /> {host}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between rounded-2xl border border-border-strong bg-card py-2.5 pr-2.5 pl-4 text-sm text-subtle-foreground shadow-xs">
            Ask a follow-up…
            <span className="grid size-8 place-items-center rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
