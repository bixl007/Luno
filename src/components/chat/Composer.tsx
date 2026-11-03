"use client";

import { ArrowUp, ChevronDown, FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { kindOf, MAX_ATTACHMENTS, type Attachment } from "@/lib/attachments";
import type { ModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { Companion } from "./Companion";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf,text/*,.md,.csv,.json,.yml,.yaml,.xml,.py,.ts,.tsx,.js,.jsx,.go,.rs,.java,.sql,.sh";

/** Everything the message box needs besides the text itself: files, the model picker and Chopper. */
export type ComposerExtras = {
  attachments: Attachment[];
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
  models: ModelOption[];
  model: string;
  onModelChange: (id: string) => void;
  companion: boolean;
  /** Luno is answering, so Chopper says something different. */
  busy: boolean;
};

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  placeholder: string;
  extras: ComposerExtras;
  autoFocus?: boolean;
  className?: string;
};

/** Auto-growing message box with file attachments and a model picker. Enter sends, Shift+Enter adds a line. */
export function Composer({ value, onChange, onSubmit, disabled, placeholder, extras, autoFocus, className }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { attachments, onAttach, onRemoveAttachment, models, model, onModelChange, companion, busy } = extras;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !disabled;
  const selected = models.find((m) => m.id === model);

  return (
    <form
      onSubmit={onSubmit}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        onAttach(Array.from(e.dataTransfer.files));
      }}
      className={cn("relative w-full", className)}
    >
      {companion && <Companion busy={busy} />}
      <div className={cn("rounded-2xl border border-border-strong bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:shadow-md", companion && "pt-6")}>
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-3 pt-3" aria-label="Attached files">
            {attachments.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-secondary py-1 pr-1 pl-2 text-xs text-secondary-foreground">
                {kindOf(file.mimeType) === "image" ? <ImageIcon className="size-3.5 shrink-0" aria-hidden /> : <FileText className="size-3.5 shrink-0" aria-hidden />}
                <span className="max-w-40 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(i)}
                  aria-label={`Remove ${file.name}`}
                  className="grid size-5 place-items-center rounded-md text-subtle-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={ref}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Message Luno"
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length === 0) return;
            e.preventDefault();
            onAttach(Array.from(e.clipboardData.files));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) e.currentTarget.form?.requestSubmit();
            }
          }}
          className="block max-h-[200px] min-h-6 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-subtle-foreground"
        />
        <div className="flex items-center gap-1.5 p-2 pt-1">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              onAttach(Array.from(e.target.files ?? []));
              e.target.value = ""; // so picking the same file again still fires
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach files or photos"
            title={attachments.length >= MAX_ATTACHMENTS ? `Up to ${MAX_ATTACHMENTS} files` : "Attach files or photos"}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
          {models.length > 1 && (
            <div className="relative">
              <select
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                aria-label="Model"
                className="h-8 max-w-44 cursor-pointer appearance-none truncate rounded-lg bg-transparent py-0 pr-7 pl-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-subtle-foreground" aria-hidden />
            </div>
          )}
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-[opacity,transform] hover:opacity-90 active:scale-95 disabled:bg-muted disabled:text-subtle-foreground disabled:opacity-100"
          >
            <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  );
}
