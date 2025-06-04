"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";

export default function Chat() {
  const { user } = useUser();
  const username = user?.username;
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "ai" }[]
  >([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, sender: "user" }]);
    setInput("");
    // Simulate AI response (for demo)
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { text: "I'm Luno! How can I help you?", sender: "ai" },
      ]);
    }, 600);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen w-full flex bg-black overflow-hidden">
      {/* Hamburger Button (always visible) */}
      <button
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="absolute top-4 left-4 z-20 p-2 rounded-full bg-[#232428] hover:bg-[#232428]/60 text-[#e3e3e3]"
      >
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          {isSidebarOpen ? (
            // “X” icon when sidebar is open
            <path d="M18 6 L6 18 M6 6 L18 18" />
          ) : (
            // Hamburger icon when sidebar is closed
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-[#232428] border-r border-[#232428]
          flex flex-col justify-between text-[#e3e3e3] overflow-hidden
          transition-all duration-300 ease-in-out
          ${
            isSidebarOpen
              ? "w-64 py-4 px-3 translate-x-0"
              : "w-0 py-0 px-0 -translate-x-full"
          }
        `}
      >
        <div>
          <div className="flex items-center gap-2 px-2 mb-6 mt-2">
            <span className="text-lg font-semibold tracking-wide"> </span>
          </div>

          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#232428] hover:bg-[#232428]/80 mb-2 text-left">
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            <span>New chat</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#232428]/80 mb-4 text-left">
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            <span>Explore Gems</span>
          </button>

          <div className="text-xs text-[#b0b0b0] px-3 mb-2">Recent</div>
          <ul className="space-y-1 px-1">
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              AI Engineer Roadmap: Beyo...
            </li>
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              Summer Break Study Sched...
            </li>
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              Changing Luno&apos;s Voice Se...
            </li>
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              how is the weather today
            </li>
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              Java String Equality: equals(...
            </li>
            <li className="truncate px-3 py-2 rounded-lg hover:bg-[#232428]/80 cursor-pointer">
              Show more
            </li>
          </ul>
        </div>
       
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-4xl font-semibold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent select-none">
          Hello, {username}
        </div>

        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <div className="flex flex-wrap gap-4 mt-32 mb-8">
            <button className="rounded-xl border border-[#35363a] bg-[#232428] px-4 py-3 text-left text-sm text-[#e3e3e3] hover:bg-[#232428]/80 min-w-[220px]">
              <span className="block font-medium">Write requirements for</span>
              <span className="block text-xs text-[#b0b0b0]">
                a fitness tracking app
              </span>
            </button>
            <button className="rounded-xl border border-[#35363a] bg-[#232428] px-4 py-3 text-left text-sm text-[#e3e3e3] hover:bg-[#232428]/80 min-w-[220px]">
              <span className="block font-medium">Design an interactive</span>
              <span className="block text-xs text-[#b0b0b0]">kaleidoscope</span>
            </button>
            <button className="rounded-xl border border-[#35363a] bg-[#232428] px-4 py-3 text-left text-sm text-[#e3e3e3] hover:bg-[#232428]/80 min-w-[220px]">
              <span className="block font-medium">Write a screenplay</span>
              <span className="block text-xs text-[#b0b0b0]">
                for a Chemistry 101 video
              </span>
            </button>
            <button className="rounded-xl border border-[#35363a] bg-[#232428] px-4 py-3 text-left text-sm text-[#e3e3e3] hover:bg-[#232428]/80 min-w-[220px]">
              <span className="block font-medium">Create an app</span>
              <span className="block text-xs text-[#b0b0b0]">
                for tracking tasks
              </span>
            </button>
          </div>

          {/* Floating input at the bottom */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="fixed bottom-0 left-0 w-full flex justify-center z-10 bg-gradient-to-t from-[#232428] via-[#232428]/90 to-transparent px-2 py-4"
            style={{ pointerEvents: "auto" }}
          >
            <div className="w-full max-w-xl flex items-center rounded-2xl border border-[#35363a] bg-[#232428] px-4 py-2">
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-base text-[#e3e3e3] placeholder-[#b0b0b0] py-3"
                placeholder="Ask Luno"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="ml-2 px-4 py-2 rounded-xl bg-[#35363a] text-[#e3e3e3] hover:bg-[#44454a] font-semibold text-base transition"
              >
                Send
              </button>
            </div>
          </form>

          <div ref={messagesEndRef} />
        </div>
      </main>
    </div>
  );
}
