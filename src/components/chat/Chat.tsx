"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { PanelLeft, PanelRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MAX_ATTACHMENTS, MAX_TOTAL_BYTES, attachmentMeta, type Attachment } from "@/lib/attachments";
import type { ModelOption } from "@/lib/ai/models";
import { readNdjson } from "@/lib/http/ndjson";
import { DEFAULT_PREFERENCES, hueOf, type Preferences } from "@/lib/preferences";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toaster, notify } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";
import { Composer, type ComposerExtras } from "./Composer";
import { ContextPanel } from "./ContextPanel";
import { EmptyState } from "./EmptyState";
import { MessageBubble } from "./MessageBubble";
import { SettingsDialog } from "./SettingsDialog";
import { Sidebar } from "./Sidebar";
import type { Chat as ChatType, Message } from "./types";
import { prepareFile, sizeOf } from "./files";
import { useMessageActions } from "./useMessageActions";

const MODEL_KEY = "luno.model";

const iconButton =
  "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export default function Chat({ models }: { models: ModelOption[] }) {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const filesRef = useRef<Attachment[]>([]);
  const [model, setModel] = useState(models[0]?.id ?? "auto");
  const displayName = preferences.nickname || user?.firstName || user?.username;
  const [chats, setChats] = useState<ChatType[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const router = useRouter();
  const { isListening, speak, copyToClipboard, copyCodeToClipboard, exportAsPDF } = useMessageActions();

  useEffect(() => {
    if (user) {
      fetchChats();
      fetch("/api/preferences")
        .then((res) => (res.ok ? res.json() : null))
        .then((saved) => saved && setPreferences(saved))
        .catch(() => {}); // defaults are fine if this fails
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-hue", String(hueOf(preferences.accent)));
  }, [preferences.accent]);

  // Restored after mount (not in the initial state) so the server and browser render the same first frame.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      if (saved && models.some((m) => m.id === saved)) setModel(saved);
    } catch {
      // Storage can be blocked; Auto is fine.
    }
  }, [models]);

  useEffect(() => {
    if (selectedChat) fetchMessages(selectedChat.id);
    else setMessages([]);
  }, [selectedChat]);

  // Show the welcome screen if no chat is selected and no messages
  const showWelcome = !selectedChat && messages.length === 0;

  // Follow the reply only while the reader is at the bottom, and without animation while it streams: a new smooth
  // scroll on every update never finishes, which looks like flicker.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: isThinking ? "auto" : "smooth" });
  }, [messages, isThinking]);

  async function fetchChats() {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) setChats(await res.json());
      else notify.error("Couldn't load your chats");
    } catch {
      notify.error("Couldn't load your chats");
    }
    setChatsLoading(false);
  }

  async function fetchMessages(chatId: number) {
    stickToBottom.current = true;
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/message?chatId=${chatId}`);
      if (res.ok) setMessages(await res.json());
      else notify.error("Couldn't load this conversation");
    } catch {
      notify.error("Couldn't load this conversation");
    }
    setMessagesLoading(false);
  }

  // Reads a streamed reply, showing the text in the last (assistant) message as it arrives. Returns the final payload.
  async function readReply(res: Response) {
    let text = "";
    let data: any = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Words can arrive hundreds of times a second; re-rendering the markdown for each one makes the screen flicker, so
    // the text is shown at most every 80 ms.
    const show = () => {
      timer = undefined;
      const snapshot = text;
      // Dropping the placeholder id switches the message from the loading dots to the streamed text.
      setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: snapshot }]);
    };
    try {
      await readNdjson(res, (event) => {
        if (event.type === "status") {
          setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], status: event.text }]);
        } else if (event.type === "delta") {
          text += event.text;
          timer ??= setTimeout(show, 80);
        } else if (event.type === "error") {
          throw new Error(event.message);
        } else {
          data = event.data;
        }
      });
    } finally {
      clearTimeout(timer);
    }
    if (!data) throw new Error("The reply ended early");
    return data;
  }

  function showSendError(message = "Failed to send message. Please try again.") {
    notify.error(message, 3000);
  }

  // The API explains refused requests (a bad file, for instance); anything else is a generic failure.
  async function failureOf(res: Response): Promise<Error> {
    const body = res.status === 400 ? await res.json().catch(() => null) : null;
    return new Error(body?.error ?? "Request failed");
  }

  // The latest list is also kept in a ref: files are read one at a time, so a closure over state would be stale.
  function updateAttachments(next: Attachment[]) {
    filesRef.current = next;
    setAttachments(next);
  }

  async function addFiles(files: File[]) {
    for (const file of files) {
      try {
        const next = [...filesRef.current, await prepareFile(file)];
        if (next.length > MAX_ATTACHMENTS) {
          notify.error(`You can attach up to ${MAX_ATTACHMENTS} files.`, 3000);
          return;
        }
        if (next.reduce((sum, a) => sum + sizeOf(a), 0) > MAX_TOTAL_BYTES) {
          notify.error("Those files are too large together. Keep them under 3 MB.", 3000);
          continue;
        }
        updateAttachments(next);
      } catch (error: any) {
        notify.error(error.message || "Couldn't read that file.", 3000);
      }
    }
  }

  async function savePreferences(next: Preferences) {
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Request failed");
      setPreferences(await res.json());
      notify.success("Saved");
    } catch (error) {
      notify.error("Couldn't save your settings. Please try again.", 3000);
      throw error;
    }
  }

  function changeModel(id: string) {
    setModel(id);
    try {
      localStorage.setItem(MODEL_KEY, id);
    } catch {
      // Not remembered across visits, but this session still uses it.
    }
  }

  const composerExtras: ComposerExtras = {
    attachments,
    onAttach: addFiles,
    onRemoveAttachment: (index) => updateAttachments(filesRef.current.filter((_, i) => i !== index)),
    models,
    model,
    onModelChange: changeModel,
    companion: preferences.companion,
    busy: isThinking,
  };

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    const thinkingMessage = "Luno is thinking...";
    stickToBottom.current = true;
    const sentText = input;
    const sentFiles = attachments;
    const userMessage: Message = { content: sentText, role: "user", ...(sentFiles.length ? { attachments: sentFiles.map(attachmentMeta) } : {}) };
    updateAttachments([]);

    if (!selectedChat) {
      setIsThinking(true);
      // Add a temporary "thinking" message for the first prompt
      setMessages([userMessage, { content: thinkingMessage, role: "assistant", id: -1 }]);
      setInput("");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstMessage: sentText, model, attachments: sentFiles }),
        });
        if (!res.ok) throw await failureOf(res);
        const chat = await readReply(res);
        setChats([chat, ...chats]);
        setSelectedChat(chat);
        // Only set the messages returned from the backend (do not add the user message again)
        setMessages(chat.messages || []);
      } catch (error: any) {
        setMessages([]);
        setInput(sentText);
        updateAttachments(sentFiles);
        showSendError(error?.message === "Request failed" ? undefined : error?.message);
      }
      setIsThinking(false);
      return;
    }
    // Add a temporary "thinking" message
    setIsThinking(true);
    setMessages([...messages, userMessage, { content: thinkingMessage, role: "assistant", id: -1 }]);
    setInput("");
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: selectedChat.id, content: sentText, model, attachments: sentFiles }),
      });
      if (!res.ok) throw await failureOf(res);
      const { assistant } = await readReply(res);
      setMessages((prev) => [
        ...prev.slice(0, -1), // Removes the streamed/"thinking" message, leaves the optimistic user message
        // The 'user' message from the backend is not added here to prevent duplication
        ...(assistant ? [assistant] : []) // Swap in the saved assistant message
      ]);
      fetchChats();
    } catch (error: any) {
      // Remove the temp assistant message on error
      setMessages((prev) => prev.slice(0, -1));
      showSendError(error?.message === "Request failed" ? undefined : error?.message);
    }
    setIsThinking(false);
  }

  async function deleteChat(chatId: number) {
    try {
      const res = await fetch(`/api/chat?chatId=${chatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      notify.error("Couldn't delete that chat. Please try again.", 3000);
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
      setMessages([]);
    }
    notify.success("Chat deleted");
  }

  const closeDrawerOnMobile = () => {
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Toaster />

      <Sidebar
        chats={chats}
        loading={chatsLoading}
        selectedId={selectedChat?.id ?? null}
        open={isSidebarOpen}
        collapsed={isSidebarCollapsed}
        onNewChat={() => {
          setSelectedChat(null);
          setMessages([]);
          router.refresh();
          closeDrawerOnMobile();
        }}
        onSelect={(chat) => {
          setSelectedChat(chat);
          closeDrawerOnMobile();
        }}
        onDelete={setPendingDelete}
        onClose={() => setIsSidebarOpen(false)}
        onCollapse={() => setIsSidebarCollapsed(true)}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          closeDrawerOnMobile();
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(true);
              setIsSidebarCollapsed(false);
            }}
            className={cn(iconButton, !isSidebarCollapsed && "md:hidden")}
            aria-label="Open sidebar"
          >
            <PanelLeft className="size-4" aria-hidden />
          </button>
          {/* The welcome screen carries the page's h1, so the title is plain text there. */}
          <p role={showWelcome ? undefined : "heading"} aria-level={showWelcome ? undefined : 1} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {selectedChat ? selectedChat.title || "Untitled chat" : "New chat"}
          </p>
          <ThemeToggle className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => setIsContextPanelOpen((prev) => !prev)}
            className={cn(iconButton, isContextPanelOpen && "bg-accent text-foreground")}
            aria-label={isContextPanelOpen ? "Close context panel" : "Open context panel"}
            aria-expanded={isContextPanelOpen}
          >
            <PanelRight className="size-4" aria-hidden />
          </button>
          <UserButton afterSignOutUrl="/" />
        </header>

        <main className="relative min-h-0 flex-1">
          {showWelcome ? (
            <EmptyState name={displayName} input={input} onInputChange={setInput} onSubmit={handleSend} disabled={isThinking} extras={composerExtras} />
          ) : (
            <div className="flex h-full flex-col">
              <div
                ref={scrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
                }}
                className="scrollbar-quiet flex-1 overflow-y-auto"
              >
                <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pt-6 pb-8">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="space-y-8" aria-label="Loading conversation" role="status">
                      <div className="flex justify-end"><div className="h-10 w-2/5 animate-pulse rounded-2xl bg-muted" /></div>
                      <div className="space-y-2.5">
                        <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted" />
                        <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
                        <div className="h-3.5 w-3/5 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <MessageBubble
                        key={i}
                        message={msg}
                        index={i}
                        isListening={isListening === i}
                        onCopy={copyToClipboard}
                        onCopyCode={copyCodeToClipboard}
                        onSpeak={speak}
                        onExport={exportAsPDF}
                      />
                    ))
                  )}
                </div>
              </div>
              <div className="shrink-0 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-2 pb-4">
                <div className="mx-auto w-full max-w-3xl">
                  <Composer value={input} onChange={setInput} onSubmit={handleSend} disabled={isThinking} placeholder="Ask a follow-up…" extras={composerExtras} />
                  <p className="mt-2 text-center text-xs text-subtle-foreground">Luno can make mistakes. Check important information.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ContextPanel open={isContextPanelOpen} chat={selectedChat} messages={messages} onClose={() => setIsContextPanelOpen(false)} />

      <SettingsDialog open={isSettingsOpen} preferences={preferences} onClose={() => setIsSettingsOpen(false)} onSave={savePreferences} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this chat?"
        description={`“${pendingDelete?.title || "Untitled chat"}” and its messages will be permanently removed.`}
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteChat(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
