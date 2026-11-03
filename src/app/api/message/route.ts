import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse, withoutSources } from '@/lib/ai/reply';
import { ndjsonResponse } from '@/lib/http/ndjson';

// Replies that run a web search take several sequential model calls.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chatId = searchParams.get('chatId');
  const { userId } = getAuth(req);
  if (!userId || !chatId) return NextResponse.json([], { status: 401 });
  const messages = await prisma.message.findMany({
    where: { chatId: Number(chatId) },
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { chatId, content } = await req.json();
  if (!chatId || !content) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  const chat = await prisma.chat.findUnique({ where: { id: Number(chatId) } });
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

  const message = await prisma.message.create({
    data: { chatId: Number(chatId), userId, content, role: 'user' }
  });
  await prisma.chat.update({ where: { id: Number(chatId) }, data: { updatedAt: new Date() } });

  return ndjsonResponse(async (send) => {
    const aiContent = await generateGeminiResponse(content, chat.context, send);
    let aiMessage = null;
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
      aiMessage = await prisma.message.create({
        data: { chatId: Number(chatId), userId: 'luno-ai', content: aiContent, role: 'assistant' }
      });

      const newContext = `${chat.context || ''}\nUser: ${content}\nAI: ${withoutSources(aiContent)}`;
      await prisma.chat.update({
        where: { id: Number(chatId) },
        data: { context: newContext }
      });
    }

    send({ type: 'done', data: { user: message, assistant: aiMessage } });
  });
}
