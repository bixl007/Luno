import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse, withoutSources } from '@/lib/ai/reply';
import { ndjsonResponse } from '@/lib/http/ndjson';
import { fallbackTitle, generateChatTitle } from '@/lib/ai/title';

// Replies that run a web search take several sequential model calls.
export const maxDuration = 60;

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
  const { title, firstMessage } = await req.json();

  let dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: { id: userId, email: `${userId}@noemail.local` },
    });
  }

  if (!firstMessage) {
    const chat = await prisma.chat.create({
      data: { userId, title },
      include: { messages: true }
    });
    return NextResponse.json(chat);
  }

  const chat = await prisma.chat.create({
    data: {
      userId,
      // Replaced by a generated title once the reply is done; this is what shows if that fails.
      title: fallbackTitle(firstMessage),
      messages: { create: [{ content: firstMessage, userId, role: 'user' }] }
    },
    include: { messages: true }
  });

  return ndjsonResponse(async (send) => {
    // Runs alongside the reply, so it adds no waiting.
    const titlePromise = generateChatTitle(firstMessage);
    const aiContent = await generateGeminiResponse(firstMessage, null, send);
    if (aiContent) {
      await prisma.user.upsert({
        where: { id: 'luno-ai' },
        update: {},
        create: {
          id: 'luno-ai',
          email: 'luno-ai@local',
          username: 'Luno',
        },
      });
      await prisma.message.create({
        data: { chatId: chat.id, userId: 'luno-ai', content: aiContent, role: 'assistant' }
      });
      const newContext = `User: ${firstMessage}\nAI: ${withoutSources(aiContent)}`;
      await prisma.chat.update({
        where: { id: chat.id },
        data: { context: newContext }
      });
    }
    await prisma.chat.update({ where: { id: chat.id }, data: { title: await titlePromise } });
    const fullChat = await prisma.chat.findUnique({
      where: { id: chat.id },
      include: { messages: true }
    });
    send({ type: 'done', data: fullChat });
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
