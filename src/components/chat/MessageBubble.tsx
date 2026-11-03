"use client";

import { Copy, Download, FileText, ImageIcon, Square, Volume2 } from "lucide-react";
import { memo } from "react";
import { kindOf } from "@/lib/attachments";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import ChatMessage from "./ChatMessage";
import type { Message } from "./types";

type MessageBubbleProps = {
  message: Message;
  index: number;
  isListening: boolean;
  onCopy: (text: string) => void;
  onCopyCode: (code: string, language?: string) => Promise<void>;
  onSpeak: (text: string, index: number) => void;
  onExport: (text: string, index: number) => void;
};

function ActionButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-md text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}

function MessageBubbleView({ message, index, isListening, onCopy, onCopyCode, onSpeak, onExport }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = message.content || message.text || "";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          {message.attachments && message.attachments.length > 0 && (
            <ul className="flex flex-wrap justify-end gap-1.5" aria-label="Attached files">
              {message.attachments.map((file, i) => (
                <li key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                  {kindOf(file.mimeType) === "image" ? <ImageIcon className="size-3.5" aria-hidden /> : <FileText className="size-3.5" aria-hidden />}
                  <span className="max-w-48 truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
          {content && (
            <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[15px] leading-7 text-foreground">
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3.5 animate-fade-in">
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground">
        <LogoMark className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {message.id === -1 ? (
          <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground" role="status" aria-live="polite">
            <span className="flex items-center gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-dot rounded-full bg-brand" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            {message.status || "Luno is thinking…"}
          </div>
        ) : (
          <>
            <div data-message-index={index}>
              <ChatMessage message={content} onCopyCode={onCopyCode} />
            </div>
            {content && (
              <div className="mt-2 -ml-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <ActionButton label="Copy message" onClick={() => onCopy(content)}>
                  <Copy className="size-3.5" aria-hidden />
                </ActionButton>
                <ActionButton label={isListening ? "Stop reading" : "Read aloud"} active={isListening} onClick={() => onSpeak(content, index)}>
                  {isListening ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
                </ActionButton>
                <ActionButton label="Export as PDF" onClick={() => onExport(content, index)}>
                  <Download className="size-3.5" aria-hidden />
                </ActionButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * While a reply streams only the last message changes, so the others are not re-rendered (each one re-parses its
 * markdown and re-highlights its code). The handlers are left out of the comparison on purpose: they only read state
 * that the compared props already cover.
 */
export const MessageBubble = memo(
  MessageBubbleView,
  (a, b) => a.message === b.message && a.index === b.index && a.isListening === b.isListening,
);
