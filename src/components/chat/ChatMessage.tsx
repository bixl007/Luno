"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { HTMLAttributes } from "react";
import { Check, Copy } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ChatMessageProps {
  message: string;
  onCopyCode?: (code: string, language?: string) => Promise<void>;
}

interface CodeComponentProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

function CopyCodeButton({ code, language, onCopy }: { code: string; language: string; onCopy: NonNullable<ChatMessageProps["onCopyCode"]> }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await onCopy(code, language);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Copy code"
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopyCode }) => {
  const { resolvedTheme } = useTheme();
  return (
    <div className="max-w-none text-[15px] leading-7 text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, inline, ...props }: CodeComponentProps) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");

            return !inline && match ? (
              <div className="my-4 overflow-hidden rounded-xl border border-border bg-code">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{match[1]}</span>
                  {onCopyCode && <CopyCodeButton code={codeContent} language={match[1]} onCopy={onCopyCode} />}
                </div>
                <SyntaxHighlighter
                  style={(resolvedTheme === "dark" ? oneDark : oneLight) as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    fontSize: "0.8125rem",
                    lineHeight: "1.65",
                  }}
                  codeTagProps={{ style: { fontFamily: "var(--font-geist-mono), ui-monospace, monospace" } }}
                  {...props}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="rounded-md border border-border bg-code px-1.5 py-0.5 font-mono text-[0.85em] text-foreground" {...props}>
                {children}
              </code>
            );
          },

          h1: ({ children, ...props }) => (
            <h1 className="font-display mt-7 mb-3 text-2xl font-semibold text-foreground" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="font-display mt-6 mb-2.5 text-xl font-semibold text-foreground" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="mt-5 mb-2 text-base font-semibold text-foreground" {...props}>{children}</h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="mt-4 mb-1.5 text-[15px] font-semibold text-foreground" {...props}>{children}</h4>
          ),

          p: ({ children, ...props }) => (
            <p className="my-3" {...props}>{children}</p>
          ),

          ul: ({ children, ...props }) => (
            <ul className="my-3 list-disc space-y-1 pl-5 marker:text-subtle-foreground" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5 marker:text-subtle-foreground" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="pl-1" {...props}>{children}</li>
          ),

          blockquote: ({ children, ...props }) => (
            <blockquote className="my-4 border-l-2 border-border-strong pl-4 text-muted-foreground" {...props}>{children}</blockquote>
          ),

          table: ({ children, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm [&_tbody_tr:last-child_td]:border-b-0" {...props}>{children}</table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border-b border-border bg-muted px-3 py-2 text-left font-medium text-foreground" {...props}>{children}</th>
          ),
          td: ({ children, ...props }) => (
            <td className="border-b border-border px-3 py-2" {...props}>{children}</td>
          ),

          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="font-medium text-brand underline decoration-brand/35 underline-offset-[3px] transition-colors hover:decoration-brand"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),

          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>{children}</strong>
          ),

          em: ({ children, ...props }) => (
            <em className="italic" {...props}>{children}</em>
          ),

          hr: ({ ...props }) => (
            <hr className="my-6 border-0 border-t border-border" {...props} />
          ),
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessage;
