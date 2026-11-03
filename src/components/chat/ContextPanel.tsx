"use client";

import { ExternalLink, Globe, X } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Chat, Message } from "./types";

type Source = { title: string; url: string };

// Matches the list reply.ts appends after a web search: "---\n**Sources**\n- [title](url)".
const SOURCES_MARKER = "**Sources**\n";

function sourcesIn(messages: Message[]): Source[] {
  const found: Source[] = [];
  for (const m of messages) {
    if (m.role === "user") continue;
    const content = m.content || m.text || "";
    const at = content.lastIndexOf(SOURCES_MARKER);
    if (at === -1) continue;
    for (const match of content.slice(at).matchAll(/^- \[(.+?)\]\((https?:\/\/[^\s)]+)\)/gm)) {
      if (!found.some((s) => s.url === match[2])) found.push({ title: match[1], url: match[2] });
    }
  }
  return found;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type ContextPanelProps = {
  open: boolean;
  chat: Chat | null;
  messages: Message[];
  onClose: () => void;
};

export function ContextPanel({ open, chat, messages, onClose }: ContextPanelProps) {
  const sources = useMemo(() => sourcesIn(messages), [messages]);
  const turns = messages.filter((m) => m.role === "user").length;

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[2px] animate-fade-in lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Context"
        aria-hidden={!open}
        inert={open ? undefined : true}
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-80 max-w-[88vw] shrink-0 border-l border-border bg-card transition-transform duration-300 ease-out-soft lg:static lg:max-w-none lg:transition-[margin]",
          open ? "translate-x-0" : "translate-x-full lg:-mr-80 lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <h2 className="text-sm font-medium">Context</h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close context panel"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="scrollbar-quiet flex-1 space-y-6 overflow-y-auto p-4">
            <section>
              <h3 className="mb-2 text-xs font-medium text-subtle-foreground">This conversation</h3>
              {chat ? (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="sr-only">Title</dt>
                    <dd className="font-medium break-words">{chat.title || "Untitled chat"}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Questions asked</dt>
                    <dd className="text-foreground tabular-nums">{turns}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Sources found</dt>
                    <dd className="text-foreground tabular-nums">{sources.length}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">Start a conversation and its details will show up here.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-medium text-subtle-foreground">Sources</h3>
              {sources.length > 0 ? (
                <ul className="space-y-1">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-accent"
                      >
                        <Globe className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{s.title}</span>
                          <span className="block truncate text-xs text-subtle-foreground">{hostname(s.url)}</span>
                        </span>
                        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  When Luno searches the web to answer you, the pages it used are listed here.
                </p>
              )}
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
