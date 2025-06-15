"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Chat = { id: number; title: string; messages?: Message[] };
type Message = { id?: number; content?: string; text?: string; role: string };

const PRETRAINED_PROMPTS = [
  "What can you do?",
  "Tell me a fun fact!",
  "How can I be more productive?",
  "Explain quantum computing simply.",
  "Give me a daily motivation.",
  "Summarize the latest tech news.",
];
const DEFAULT_SYSTEM_PROMPT =
  "You are Luno, a helpful, friendly, and knowledgeable AI assistant. Always introduce yourself as Luno in your first response. Answer clearly and concisely.";

export default function Chat() {
  const { user } = useUser();
  const username = user?.username;
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to closed for all screens initially
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) fetchChats();
  }, [user]);

  useEffect(() => {
    if (selectedChat) fetchMessages(selectedChat.id);
    else setMessages([]);
  }, [selectedChat]);

  // Show default prompt if no chat is selected and no messages
  const showDefaultPrompt = !selectedChat && messages.length === 0;

  // Show welcome heading if no chat is selected and no messages
  const showWelcome = !selectedChat && messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchChats() {
    const res = await fetch("/api/chat");
    if (res.ok) setChats(await res.json());
  }

  async function fetchMessages(chatId: number) {
    const res = await fetch(`/api/message?chatId=${chatId}`);
    if (res.ok) setMessages(await res.json());
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    if (!selectedChat) {
      setIsThinking(true);
      // Add a temporary "thinking" message for the first prompt
      setMessages([
        { content: input, role: "user" },
        { content: "Luno is thinking", role: "assistant", id: -1 }
      ]);
      setInput("");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 30), firstMessage: input }),
      });
      if (res.ok) {
        const chat = await res.json();
        setChats([chat, ...chats]);
        setSelectedChat(chat);
        // Only set the messages returned from the backend (do not add the user message again)
        setMessages(chat.messages || []);
      } else {
        setMessages([]);
      }
      setIsThinking(false);
      return;
    }
    // Add a temporary "thinking" message
    setIsThinking(true);
    setMessages([...messages, { content: input, role: "user" }, { content: "Luno is thinking", role: "assistant", id: -1 }]);
    setInput("");
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: selectedChat.id, content: input }),
    });
    if (res.ok) {
      const { user, assistant } = await res.json(); // 'user' is the user message from backend
      setMessages((prev) => [
        ...prev.slice(0, -1), // Removes the "Luno is thinking" message, leaves the optimistic user message
        // The 'user' message from the backend is no longer added here to prevent duplication
        ...(assistant ? [assistant] : []) // Only add the assistant's message
      ]);
      fetchChats();
    } else {
      // Remove the temp "thinking" message on error
      setMessages((prev) => prev.slice(0, -1));
    }
    setIsThinking(false);
  }

  async function deleteChat(chatId: number) {
    await fetch(`/api/chat?chatId=${chatId}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
      setMessages([]);
    }
  }

  return (
    <div className="h-screen w-full flex bg-black overflow-hidden min-h-0">
      {/* User profile button (top right) */}
      <div className="fixed top-4 right-4 z-50"> {/* Increased z-index */}
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Hamburger Button (always visible, but icon changes) */}
      <button
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-20 p-2 rounded-full bg-slate-800/80 backdrop-blur-md text-slate-200 hover:bg-slate-700/80 transition-colors shadow-lg md:hidden" // Only show on mobile (md:hidden)
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-4 z-40 p-2 rounded-full bg-slate-800/80 backdrop-blur-md text-slate-200 hover:bg-slate-700/80 transition-all duration-300 ease-in-out shadow-lg hidden md:block ${
          isSidebarOpen ? "left-[calc(16rem+0.5rem)]" : "left-4"
        }`}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col justify-between text-slate-200 transition-transform duration-300 ease-in-out border-r border-black/30 shadow-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-black/80 backdrop-blur-lg ${
          isSidebarOpen ? "translate-x-0 px-3 py-4" : "-translate-x-full px-0 py-0"
        }`}
      >
        <div className="flex flex-col flex-grow min-h-0">
          <div className="flex items-center justify-between px-2 mb-6 mt-2">
            <span className="flex-1 text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent truncate min-w-0">
              Luno Chats
            </span>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="p-1 rounded-full hover:bg-slate-700/50 text-slate-400 flex-shrink-0 ml-2 md:hidden" // Only on mobile
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/70 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 mb-4 text-left transition-all duration-200 ease-in-out shadow-md hover:shadow-lg transform hover:scale-105"
            onClick={() => {
              setSelectedChat(null);
              setMessages([]);
              router.refresh();
              if (window.innerWidth < 768) setIsSidebarOpen(false); // Close on mobile after action
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="font-medium">New Chat</span>
          </button>

          <div className="text-xs text-slate-500 px-3 mb-2 uppercase tracking-wider font-semibold">Recent</div>
          <ul className="space-y-1.5 px-1 flex-grow overflow-y-auto pb-4">
            {chats.length === 0 && (
              <li className="px-3 py-2 text-slate-500 italic">No recent chats</li>
            )}
            {chats.map((chat) => (
              <li
                key={chat.id}
                className={`px-3 py-2 rounded-lg flex items-center justify-between hover:bg-slate-700/50 transition-colors duration-150 cursor-pointer group ${
                  selectedChat?.id === chat.id ? "bg-gradient-to-r from-cyan-600 to-blue-700 shadow-md" : "bg-slate-800/50"
                }`}
              >
                <span
                  className="flex-1 truncate font-medium text-sm group-hover:text-white transition-colors duration-150"
                  onClick={() => {
                    setSelectedChat(chat);
                    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile after selection
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {chat.title || "Untitled Chat"}
                </span>
                <button
                  className="ml-2 text-slate-500 hover:text-red-500 transition-colors duration-150 opacity-50 group-hover:opacity-100"
                  onClick={() => deleteChat(chat.id)}
                  aria-label="Delete chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col items-center justify-center relative min-h-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'ml-0' }`}>
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-4xl font-semibold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent select-none" style={{display: showWelcome ? 'block' : 'none'}}>
          Hello, {username}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0">
          <div className="w-full max-w-3xl flex flex-col gap-2 mt-32 mb-8 overflow-y-auto flex-1 min-h-0 custom-scrollbar-hide" style={{ maxHeight: 'calc(100vh - 260px)', paddingBottom: '80px' }}>
            {showWelcome && (
              <div className="mb-10 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[#00F0FF] via-[#FF00EA] to-[#00FF94] bg-clip-text text-transparent mb-4 drop-shadow-lg">
                  I am Luno, your Personal AI Assistant
                </h1>
                <p className="text-lg md:text-2xl text-[#b0b0b0] font-medium mb-2">
                  How can I help you today?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`w-full flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-xl px-4 py-2 mb-2 max-w-[80%] shadow-lg transition-all duration-300 ease-in-out ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white self-end rounded-br-none"
                      : msg.id === -1
                        ? "bg-slate-700 text-slate-300 animate-pulse self-start rounded-bl-none"
                        : "bg-slate-800 text-slate-200 self-start rounded-bl-none"
                  }`}
                >
                  {msg.id === -1 ? (
                    <>
                      {msg.content || msg.text}
                      <span className="ml-2 inline-block align-middle animate-bounce">...</span>
                    </>
                  ) : (
                    <div className="prose prose-invert max-w-full prose-headings:break-words prose-headings:mb-2 prose-p:mb-2 prose-p:break-words">
                      <ReactMarkdown>{msg.content || msg.text || ""}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Floating input at the bottom */}
          <form
            onSubmit={handleSend}
            className="fixed bottom-0 left-0 w-full flex justify-center z-10 px-2 py-4"
            style={{ pointerEvents: "auto", background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)' }}
          >
            <div className="w-full max-w-xl flex items-center rounded-2xl border border-slate-700 bg-slate-800/80 backdrop-blur-md px-4 py-2 shadow-2xl">
              <input
                type="text"
                className="flex-1 bg-transparent outline-none text-base text-slate-200 placeholder-slate-500 py-3"
                placeholder="Ask Luno"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="ml-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 font-semibold text-base transition shadow-md hover:shadow-lg"
              >
                Send
              </button>
            </div>
          </form>

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Hide scrollbar for Chrome, Safari and Opera */}
      <style jsx global>{`
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}
