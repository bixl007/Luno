"use client";

import { Composer, type ComposerExtras } from "./Composer";

const PROMPTS = [
  "Get fresh perspective on tricky problems",
  "Brainstorm creative ideas",
  "Rewrite message for maximum impact",
  "Summarize key points",
];

type EmptyStateProps = {
  name?: string | null;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  extras: ComposerExtras;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function EmptyState({ name, input, onInputChange, onSubmit, disabled, extras }: EmptyStateProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-4 pb-16">
      <h1 className="font-display animate-fade-up text-center text-4xl leading-tight text-foreground sm:text-5xl" suppressHydrationWarning>
        {greeting()}
        {name ? <>, <span className="text-brand">{name}</span></> : null}
      </h1>
      <p className="mt-3 animate-fade-up text-center text-base text-muted-foreground [animation-delay:80ms]">
        What can I help you think through today?
      </p>

      <div className="mt-10 animate-fade-up [animation-delay:160ms]">
        <Composer
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={disabled}
          extras={extras}
          placeholder="Ask anything. Luno searches the web when it needs to."
          autoFocus
        />
      </div>

      <ul className="mt-5 flex animate-fade-up flex-wrap justify-center gap-2 [animation-delay:240ms]">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onInputChange(prompt)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-foreground"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
