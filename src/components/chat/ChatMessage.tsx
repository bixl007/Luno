"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { HTMLAttributes } from "react";

interface ChatMessageProps {
  message: string;
  onCopyCode?: (code: string, language?: string) => Promise<void>;
}

interface CodeComponentProps extends HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopyCode }) => {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, inline, ...props }: CodeComponentProps) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");
            
            return !inline && match ? (
              <div className="my-4 rounded-lg overflow-hidden border border-slate-600/50 relative group">
                <div className="bg-slate-700/50 px-4 py-2 text-xs text-slate-300 font-mono border-b border-slate-600/50 flex items-center justify-between">
                  <span>{match[1].toUpperCase()}</span>
                  {onCopyCode && (
                    <button
                      onClick={() => onCopyCode(codeContent, match[1])}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-600/50 hover:bg-slate-600/80 text-slate-300 hover:text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                      title="Copy code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      Copy
                    </button>
                  )}
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                  }}
                  {...props}
                >
                  {codeContent}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-slate-700/50 text-orange-300 px-1.5 py-0.5 rounded-md text-sm font-mono border border-slate-600/30" {...props}>
                {children}
              </code>
            );
          },
          
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold text-white mb-4 mt-6 border-b border-slate-600/50 pb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-semibold text-white mb-3 mt-5" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold text-slate-100 mb-2 mt-4" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-base font-semibold text-slate-200 mb-2 mt-3" {...props}>
              {children}
            </h4>
          ),
          
          p: ({ children, ...props }) => (
            <p className="text-slate-200 leading-relaxed mb-3" {...props}>
              {children}
            </p>
          ),
          
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside text-slate-200 space-y-1 mb-3 ml-4" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside text-slate-200 space-y-1 mb-3 ml-4" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-slate-200 leading-relaxed" {...props}>
              {children}
            </li>
          ),
          
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-blue-500/50 bg-slate-700/30 pl-4 py-2 my-4 italic text-slate-300 rounded-r-md" {...props}>
              {children}
            </blockquote>
          ),
          
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-slate-600/50 rounded-lg overflow-hidden" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="bg-slate-700/50 border border-slate-600/50 px-3 py-2 text-left font-semibold text-slate-100" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-slate-600/50 px-3 py-2 text-slate-200" {...props}>
              {children}
            </td>
          ),
          
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-white" {...props}>
              {children}
            </strong>
          ),
          
          em: ({ children, ...props }) => (
            <em className="italic text-slate-100" {...props}>
              {children}
            </em>
          ),
          
          hr: ({ ...props }) => (
            <hr className="border-0 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent my-6" {...props} />
          ),
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessage;
