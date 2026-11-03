import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse, withoutSources } from '@/lib/ai/reply';
import { ndjsonResponse } from '@/lib/http/ndjson';
import { fallbackTitle, generateChatTitle } from '@/lib/ai/title';
import { attachmentNote } from '@/lib/ai/prompt';
import { attachmentMeta, parseAttachments } from '@/lib/attachments';
import { readPreferences } from '@/lib/preferences';

// Replies that run a web search take several sequential model calls.
export const maxDuration = 60;

const ensureAiUser = () =>
  prisma.user.upsert({
    where: { id: 'luno-ai' },
    update: {},
    create: { id: 'luno-ai', email: 'luno-ai@local', username: 'Luno' },
  });

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json([], { status: 401 });
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true }
  });
  return NextResponse.json(chats);
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { title, firstMessage, model, attachments: rawAttachments } = await req.json();
  const parsed = parseAttachments(rawAttachments);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { attachments } = parsed;

  let dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { id: userId, email: `${userId}@noemail.local` },
    });
  }

  if (!firstMessage && attachments.length === 0) {
    const chat = await prisma.chat.create({
      data: { userId, title },
      include: { messages: true }
    });
    return NextResponse.json(chat);
  }

  const text: string = typeof firstMessage === 'string' ? firstMessage : '';
  const topic = text.trim() || attachments.map((a) => a.name).join(', ');
  const chat = await prisma.chat.create({
    data: {
      userId,
      // Replaced by a generated title once the reply is done; this is what shows if that fails.
      title: fallbackTitle(topic),
      messages: {
        create: [{ content: text, userId, role: 'user', ...(attachments.length ? { attachments: attachments.map(attachmentMeta) } : {}) }]
      }
    },
    include: { messages: true }
  });

  return ndjsonResponse(async (send) => {
    // Both run alongside the reply, so they add no waiting.
    const titlePromise = generateChatTitle(topic);
    const aiUser = ensureAiUser();
    aiUser.catch(() => {}); // awaited below only when there is a reply to save
    if (attachments.length) send({ type: 'status', text: 'Reading your files…' });
    const aiContent = await generateGeminiResponse(text, null, send, {
      model,
      attachments,
      preferences: readPreferences(dbUser.preferences)
    });
    // The database is a network round trip away, so the saves run together and the chat is assembled from what they
    // return instead of being read back: one wait instead of four.
    const title = await titlePromise;
    let assistantMessage = null;
    let saved;
    if (aiContent) {
      await aiUser;
      const newContext = `User: ${text}${attachmentNote(attachments)}\nAI: ${withoutSources(aiContent)}`;
      [assistantMessage, saved] = await Promise.all([
        prisma.message.create({ data: { chatId: chat.id, userId: 'luno-ai', content: aiContent, role: 'assistant' } }),
        prisma.chat.update({ where: { id: chat.id }, data: { title, context: newContext } })
      ]);
    } else {
      saved = await prisma.chat.update({ where: { id: chat.id }, data: { title } });
    }
    send({ type: 'done', data: { ...saved, messages: [...chat.messages, ...(assistantMessage ? [assistantMessage] : [])] } });
  });
}

export async function DELETE(req: NextRequest) {
  const { userId } = getAuth(req);
  const chatId = req.nextUrl.searchParams.get('chatId');
  if (!userId || !chatId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const chat = await prisma.chat.findUnique({ where: { id: Number(chatId) } });
  if (!chat || chat.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.message.deleteMany({ where: { chatId: Number(chatId) } });
  await prisma.chat.delete({ where: { id: Number(chatId) } });
  return NextResponse.json({ success: true });
}
