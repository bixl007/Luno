"use client";

import { ChevronRight, PanelLeftClose, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Chat } from "./types";

type SidebarProps = {
  chats: Chat[];
  loading: boolean;
  selectedId: number | null;
  /** Mobile drawer. */
  open: boolean;
  /** Desktop: hides the column. */
  collapsed: boolean;
  onNewChat: () => void;
  onSelect: (chat: Chat) => void;
  onDelete: (chat: Chat) => void;
  onClose: () => void;
  onCollapse: () => void;
  onOpenSettings: () => void;
};

export function Sidebar({ chats, loading, selectedId, open, collapsed, onNewChat, onSelect, onDelete, onClose, onCollapse, onOpenSettings }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[2px] animate-fade-in md:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Conversations"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out-soft md:static md:translate-x-0 md:transition-[margin]",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:-ml-72",
        )}
        inert={collapsed ? true : undefined}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onCollapse}
              className="hidden size-8 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:grid"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" aria-hidden />
            </button>
          </div>

          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-9 w-full items-center gap-2 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent"
            >
              <Plus className="size-4" aria-hidden />
              New chat
            </button>
          </div>

          <div className="px-4 pt-4 pb-1.5 text-xs font-medium text-subtle-foreground">Recent</div>
          <nav className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-3" aria-label="Recent chats">
            {loading ? (
              <ul className="space-y-1 px-1" aria-hidden>
                {[68, 84, 52, 76, 60].map((w, i) => (
                  <li key={i} className="flex h-9 items-center px-2">
                    <span className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
                  </li>
                ))}
              </ul>
            ) : chats.length === 0 ? (
              <p className="px-3 py-2 text-sm leading-relaxed text-subtle-foreground">No conversations yet. Start one and it will show up here.</p>
            ) : (
              <ul className="space-y-0.5">
                {chats.map((chat) => {
                  const active = selectedId === chat.id;
                  return (
                    <li key={chat.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(chat)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-9 w-full items-center rounded-lg px-3 pr-9 text-left text-sm transition-colors",
                          active ? "bg-sidebar-accent font-medium text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                        )}
                      >
                        <span className="truncate">{chat.title || "Untitled chat"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(chat)}
                        aria-label={`Delete ${chat.title || "untitled chat"}`}
                        className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-subtle-foreground opacity-0 transition hover:bg-destructive-soft hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border p-3">
            <button
              type="button"
              onClick={onOpenSettings}
              className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand transition-transform group-hover:scale-105">
                <SlidersHorizontal className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">Personalise</span>
                <span className="block truncate text-xs text-subtle-foreground">Style, voice and Chopper</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
            <div className="flex items-center justify-between px-2 sm:hidden">
              <span className="text-xs text-subtle-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
