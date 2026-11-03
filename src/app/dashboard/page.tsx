import type { Metadata } from "next";
import Chat from "@/components/chat/Chat";
import { availableModels } from "@/lib/ai/models";

// The model list depends on runtime env (GROQ_API_KEY), so the page must not be frozen at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Chat" };

export default function Dashboard() {
  return <Chat models={availableModels()} />;
}
