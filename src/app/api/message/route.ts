import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse, withoutSources } from '@/lib/ai/reply';
import { attachmentNote } from '@/lib/ai/prompt';
import { attachmentMeta, parseAttachments } from '@/lib/attachments';
import { ndjsonResponse } from '@/lib/http/ndjson';
import { readPreferences } from '@/lib/preferences';

// Replies that run a web search take several sequential model calls.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chatId = searchParams.get('chatId');
  const { userId } = getAuth(req);
  if (!userId || !chatId) return NextResponse.json([], { status: 401 });
  const chat = await prisma.chat.findUnique({ where: { id: Number(chatId) } });
  if (!chat || chat.userId !== userId) return NextResponse.json([], { status: 404 });
  const messages = await prisma.message.findMany({
    where: { chatId: Number(chatId) },
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { chatId, content, model, attachments: rawAttachments } = await req.json();
  const parsed = parseAttachments(rawAttachments);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { attachments } = parsed;
  const text: string = typeof content === 'string' ? content : '';
  if (!chatId || (!text.trim() && attachments.length === 0)) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const [chat, user] = await Promise.all([
    prisma.chat.findUnique({ where: { id: Number(chatId) } }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);
  if (!chat || chat.userId !== userId) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

  return ndjsonResponse(async (send) => {
    if (attachments.length) send({ type: 'status', text: 'Reading your files…' });
    // Saving runs alongside the reply: the model does not need the database, so none of it adds waiting.
    const saveUserMessage = Promise.all([
      prisma.message.create({
        data: {
          chatId: chat.id,
          userId,
          content: text,
          role: 'user',
          ...(attachments.length ? { attachments: attachments.map(attachmentMeta) } : {})
        }
      }),
      prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } }),
      prisma.user.upsert({
        where: { id: 'luno-ai' },
        update: {},
        create: { id: 'luno-ai', email: 'luno-ai@local', username: 'Luno' }
      })
    ]);
    saveUserMessage.catch(() => {}); // awaited below, where a failure ends the stream with an error
    const aiContent = await generateGeminiResponse(text, chat.context, send, {
      model,
      attachments,
      preferences: readPreferences(user?.preferences)
    });
    const [message] = await saveUserMessage;

    let aiMessage = null;
    if (aiContent) {
      const newContext = `${chat.context || ''}\nUser: ${text}${attachmentNote(attachments)}\nAI: ${withoutSources(aiContent)}`;
      // Together: the database is a network round trip away, so two saves in a row would cost two waits.
      [aiMessage] = await Promise.all([
        prisma.message.create({ data: { chatId: chat.id, userId: 'luno-ai', content: aiContent, role: 'assistant' } }),
        prisma.chat.update({ where: { id: chat.id }, data: { context: newContext } })
      ]);
    }

    send({ type: 'done', data: { user: message, assistant: aiMessage } });
  });
}
