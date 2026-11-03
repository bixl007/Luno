"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  placeholder: string;
  autoFocus?: boolean;
  className?: string;
};

/** Auto-growing message box. Enter sends, Shift+Enter adds a line. */
export function Composer({ value, onChange, onSubmit, disabled, placeholder, autoFocus, className }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form onSubmit={onSubmit} className={cn("w-full", className)}>
      <div className="flex items-end gap-2 rounded-2xl border border-border-strong bg-card py-2 pr-2 pl-4 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-md">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Message Luno"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-[200px] min-h-6 flex-1 resize-none self-center bg-transparent py-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-subtle-foreground"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-95 disabled:bg-muted disabled:text-subtle-foreground disabled:opacity-100"
        >
          <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </form>
  );
}
