"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatMessage from "./ChatMessage";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from 'jspdf';

type Chat = { id: number; title: string; messages?: Message[] };
type Message = { id?: number; content?: string; text?: string; role: string };

const PRETRAINED_PROMPTS = [
  "Get fresh perspective on tricky problems",
  "Brainstorm creative ideas",
  "Rewrite message for maximum impact",
  "Summarize key points",
];

export default function Chat() {
  const { user } = useUser();
  const username = user?.username;
  const userFirstName = user?.firstName;
  const userImageUrl = user?.imageUrl;
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState<number | null>(null);
  const [speechCancelled, setSpeechCancelled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Speech synthesis utility
  const speak = (text: string, messageIndex: number) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Speech synthesis not supported in this browser', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
      return;
    }

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking || isListening === messageIndex) {
      setSpeechCancelled(true);
      setIsListening(null);
      
      // Use a timeout to prevent race conditions
      setTimeout(() => {
        window.speechSynthesis.cancel();
        toast('🔇 Speech stopped', {
          duration: 1500,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        });
        // Reset flag after a short delay
        setTimeout(() => setSpeechCancelled(false), 500);
      }, 50);
      return;
    }

    // Clean text for speech (remove markdown formatting)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Code block. ') // Replace code blocks first
      .replace(/`([^`]+)`/g, '$1') // Remove inline code backticks
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/[*_~`#]/g, '') // Remove remaining markdown symbols
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    if (!cleanText || cleanText.length < 3) {
      toast.error('No readable text found', {
        duration: 1500,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
      return;
    }

    try {
      // Reset cancellation flag
      setSpeechCancelled(false);
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Set speech parameters
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Set up event handlers
      utterance.onstart = () => {
        if (!speechCancelled) {
          setIsListening(messageIndex);
          toast('🔊 Reading message...', {
            duration: 2000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155'
            }
          });
        }
      };
      
      utterance.onend = () => {
        if (!speechCancelled) {
          setIsListening(null);
          toast('✅ Finished reading', {
            duration: 1500,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155'
            }
          });
        }
        setSpeechCancelled(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsListening(null);
        // Only show error toast if it's not a cancellation
        if (!speechCancelled && event.error !== 'canceled' && event.error !== 'interrupted') {
          toast.error('❌ Speech failed. Try again.', {
            duration: 2000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155'
            }
          });
        }
        setSpeechCancelled(false);
      };

      // Speak with a small delay to ensure proper initialization
      setTimeout(() => {
        if (!speechCancelled) {
          try {
            window.speechSynthesis.speak(utterance);
          } catch (error) {
            console.error('Error speaking:', error);
            if (!speechCancelled) {
              setIsListening(null);
              toast.error('❌ Speech failed to start', {
                duration: 2000,
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid #334155'
                }
              });
            }
          }
        }
      }, 100);
      
    } catch (error) {
      console.error('Speech synthesis setup error:', error);
      if (!speechCancelled) {
        setIsListening(null);
        toast.error('❌ Speech synthesis failed', {
          duration: 2000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        });
      }
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copied to clipboard!', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Message copied to clipboard!', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    }
  };

  // Copy code to clipboard utility
  const copyCodeToClipboard = async (code: string, language?: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${language ? language.toUpperCase() + ' ' : ''}Code copied to clipboard!`, {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`${language ? language.toUpperCase() + ' ' : ''}Code copied to clipboard!`, {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    }
  };

  // Export as PDF utility
  const exportAsPDF = async (content: string, messageIndex: number) => {
    try {
      toast('📄 Generating PDF...', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });

      // Create PDF with jsPDF using text
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Luno Chat Export', margin, margin + 10);
      
      // Add date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, margin + 20);
      
      // Add separator line
      pdf.line(margin, margin + 25, pageWidth - margin, margin + 25);
      
      // Clean content for PDF
      const cleanContent = content
        .replace(/#{1,6}\s?/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/[#*`_~]/g, '') // Remove remaining markdown
        .trim();
      
      // Add content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      const lines = pdf.splitTextToSize(cleanContent, maxWidth);
      let yPosition = margin + 35;
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += 7;
      }
      
      // Save the PDF
      pdf.save(`luno-message-${messageIndex}-${Date.now()}.pdf`);
      
      toast.success('📁 PDF exported successfully!', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('❌ Failed to export PDF', {
        duration: 2000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
    }
  };

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

    const thinkingMessage = "Luno is thinking...";

    if (!selectedChat) {
      setIsThinking(true);
      // Add a temporary "thinking" message for the first prompt
      setMessages([
        { content: input, role: "user" },
        { content: thinkingMessage, role: "assistant", id: -1 }
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
        toast.error('Failed to send message. Please try again.', {
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        });
      }
      setIsThinking(false);
      return;
    }
    // Add a temporary "thinking" message
    setIsThinking(true);
    setMessages([...messages, { content: input, role: "user" }, { content: thinkingMessage, role: "assistant", id: -1 }]);
    setInput("");
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: selectedChat.id, content: input }),
    });
    if (res.ok) {
      const { user, assistant } = await res.json(); // 'user' is the user message from backend
      setMessages((prev) => [
        ...prev.slice(0, -1), // Removes the "thinking" message, leaves the optimistic user message
        // The 'user' message from the backend is no longer added here to prevent duplication
        ...(assistant ? [assistant] : []) // Only add the assistant's message
      ]);
      fetchChats();
    } else {
      // Remove the temp "thinking" message on error
      setMessages((prev) => prev.slice(0, -1));
      toast.error('Failed to send message. Please try again.', {
        duration: 3000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155'
        }
      });
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

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-screen w-full flex bg-[#0f141b] overflow-hidden min-h-0 text-slate-100">
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        }}
      />
      
      {/* User profile button (top right) */}
      <div className="fixed top-4 right-4 z-50">
        <UserButton 
          afterSignOutUrl="/" 
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
              userButtonPopoverCard: "bg-white border border-gray-200 shadow-lg",
              userButtonPopoverActions: "bg-white",
              userButtonPopoverActionButton: "text-gray-700 hover:bg-gray-100",
              userButtonPopoverFooter: "bg-white border-t border-gray-200"
            }
          }}
        />
      </div>

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 rounded-2xl bg-[#1a202b]/90 backdrop-blur-xl text-slate-300 hover:text-slate-100 hover:bg-[#222a36]/95 transition-all duration-200 border border-slate-700/40"
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-40 flex flex-col text-slate-300 transition-transform duration-300 ease-in-out border-r border-slate-800/80 bg-[#121821] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-grow min-h-0 p-6">
          <div className="flex items-center justify-between mb-8 mt-2">
            <span className="text-2xl font-semibold tracking-wide text-slate-200">
              Luno Chats
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl bg-slate-800/70 text-slate-300 hover:bg-slate-700/80 transition-all duration-200"
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1b2430] hover:bg-[#222d3a] mb-8 text-left transition-all duration-200 border border-slate-700/60"
            onClick={() => {
              setSelectedChat(null);
              setMessages([]);
              router.refresh();
              if (window.innerWidth < 768) setIsSidebarOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="font-semibold">New Chat</span>
          </button>

          <div className="text-xs text-slate-500 mb-4 uppercase tracking-[0.18em] font-medium">Recent Chats</div>
          <ul className="space-y-3 flex-grow overflow-y-auto custom-scrollbar-hide">
            {chats.map((chat, index) => (
              <li
                key={chat.id}
                className={`px-4 py-3.5 rounded-xl flex items-center justify-between hover:bg-slate-800/55 transition-all duration-200 cursor-pointer group border border-transparent ${
                  selectedChat?.id === chat.id 
                    ? "bg-slate-800/80 border-slate-700/80" 
                    : "hover:border-slate-800/90"
                }`}
              >
                <span
                  className="flex-1 truncate font-medium text-sm text-slate-300"
                  onClick={() => {
                    setSelectedChat(chat);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                >
                  {chat.title || "Untitled Chat"}
                </span>
                <button
                  className="ml-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10"
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

      {/* Main Area */}
      <main className={`flex-1 flex flex-col items-center justify-center relative min-h-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:pl-72' : 'pl-0'} ${isContextPanelOpen ? 'lg:pr-[22rem]' : 'pr-0'}`}>
        <button
          onClick={() => setIsContextPanelOpen((prev) => !prev)}
          className="fixed top-4 right-16 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1a212d]/90 border border-slate-700/70 text-slate-300 hover:text-slate-100 hover:bg-[#242d3a]/95 transition-all duration-200"
          aria-label={isContextPanelOpen ? "Close context panel" : "Open context panel"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-medium tracking-wide">Context</span>
        </button>
        {showWelcome ? (
          <div className="flex flex-col items-center justify-center h-full w-full text-center px-4">
            <div className="w-16 h-16 mb-8 rounded-full bg-gradient-to-br from-blue-500/70 to-slate-300/20 mx-auto"></div>
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-100 tracking-tight">Nice to see you, {username}</h1>
            <p className="text-lg md:text-xl text-slate-400 mt-4 leading-relaxed">Can I help you with anything?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-4xl w-full">
              {PRETRAINED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="bg-[#171d27]/70 backdrop-blur-sm p-6 rounded-2xl text-left hover:bg-[#1e2633]/80 transition-all duration-200 border border-slate-800/80"
                >
                  <p className="font-medium text-[15px] text-slate-300 leading-relaxed">{prompt}</p>
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="w-full max-w-4xl mt-12">
              <div className="relative flex items-center">
                <input
                  type="text"
                  className="w-full bg-[#161d27]/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-6 pr-16 outline-none text-lg text-slate-100 placeholder-slate-500 focus:border-blue-400/70 focus:shadow-[0_0_0_4px_rgba(96,165,250,0.12)] transition-all duration-200"
                  placeholder="How can Luno help you today?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 disabled:from-gray-600 disabled:to-gray-600 shadow-lg" 
                  disabled={!input.trim() || isThinking}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col max-w-5xl mx-auto px-4 pt-8">
            <div className="flex-1 overflow-y-auto custom-scrollbar-hide pb-32 w-full max-w-3xl mx-auto">
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const messageContent = msg.content || msg.text || "";
                return (
                  <div
                    key={i}
                    className={`w-full flex items-start gap-4 mb-10 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm shadow-lg">
                        L
                      </div>
                    )}
                    <div className="max-w-[85%]">
                      <div
                        className={`font-medium text-slate-400 mb-2 text-xs tracking-wide uppercase ${
                          isUser ? "text-right" : ""
                        }`}
                      >
                        {isUser ? username : "Luno"}
                      </div>
                      <div
                        className={`text-slate-300 rounded-2xl relative group ${
                          isUser 
                            ? "bg-[#232d3b]/55 border border-slate-700/50 p-4" 
                            : "bg-[#171e28]/60 border border-slate-800/70 p-5"
                        }`}
                      >
                        {msg.id === -1 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            <span className="ml-2 text-slate-300">Luno is thinking...</span>
                          </div>
                        ) : (
                          <>
                            <ChatMessage message={messageContent} onCopyCode={copyCodeToClipboard} />
                            {/* Action buttons - only show for assistant messages */}
                            {!isUser && messageContent && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {/* Copy button */}
                                <button
                                  onClick={() => copyToClipboard(messageContent)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all duration-200 text-xs"
                                  title="Copy message"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                  </svg>
                                  Copy
                                </button>

                                {/* Listen button */}
                                <button
                                  onClick={() => speak(messageContent, i)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 text-xs ${
                                    isListening === i 
                                      ? 'bg-blue-600/50 text-blue-200' 
                                      : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
                                  }`}
                                  title={isListening === i ? "Stop listening" : "Listen to message"}
                                >
                                  {isListening === i ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.59-.79-1.59-1.76V9.51c0-.97.71-1.76 1.59-1.76h2.24z" />
                                    </svg>
                                  )}
                                  {isListening === i ? 'Stop' : 'Listen'}
                                </button>

                                {/* Export button */}
                                <button
                                  onClick={() => exportAsPDF(messageContent, i)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all duration-200 text-xs"
                                  title="Export as PDF"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                                  Export
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isUser && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden shadow-lg">
                        {userImageUrl ? (
                          <img 
                            src={userImageUrl} 
                            alt={username || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold text-sm">
                            {userFirstName?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="w-full max-w-3xl mx-auto pb-6">
              <div className="relative flex items-center">
                <input
                  type="text"
                  className="w-full bg-[#161d27]/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 pr-16 outline-none text-lg text-slate-100 placeholder-slate-500 focus:border-blue-400/70 focus:shadow-[0_0_0_4px_rgba(96,165,250,0.12)] transition-all duration-200 shadow-[0_-6px_24px_rgba(0,0,0,0.16)]"
                  placeholder="Ask a follow-up..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:from-gray-600 disabled:to-gray-600 shadow-lg" 
                  disabled={!input.trim() || isThinking}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </div>
              
            </form>
          </div>
        )}

        <aside
          className={`fixed top-0 right-0 h-full w-[22rem] z-40 bg-[#161d28] border-l border-slate-800/90 shadow-2xl transition-transform duration-200 ease-in-out ${
            isContextPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-hidden={!isContextPanelOpen}
        >
          <div className="h-full flex flex-col pt-20 px-5 pb-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold tracking-[0.08em] uppercase text-slate-300">Context Panel</h2>
              <button
                onClick={() => setIsContextPanelOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 transition-colors"
                aria-label="Close context panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <section className="pb-5 border-b border-slate-800/80">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 mb-3">Memory</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Active thread context and user preferences will appear here to keep responses consistent and focused.
              </p>
            </section>

            <section className="py-5 border-b border-slate-800/80">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 mb-3">Sources</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                References and retrieved knowledge can be inspected here when source attribution is available.
              </p>
            </section>

            <section className="py-5">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 mb-3">Prompt Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Tone</label>
                  <select className="w-full rounded-xl bg-[#1c2430] border border-slate-700/80 px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-400/70 transition-colors">
                    <option>Balanced</option>
                    <option>Concise</option>
                    <option>Detailed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Model</label>
                  <div className="rounded-xl bg-[#1c2430] border border-slate-700/80 px-3 py-2 text-sm text-slate-300">
                    Gemini 2.5 Flash Lite
                  </div>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </main>

      {/* Hide scrollbar styling */}
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
