import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/utils/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse } from '@/utils/gemini';

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

  // Ensure user exists in DB (fixes P2003 error)
  let dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    // Fallback: create user with minimal info if missing
    dbUser = await prisma.user.create({
      data: { id: userId, email: `${userId}@noemail.local` },
    });
  }

  let chat;
  if (firstMessage) {
    // Create chat and first user message
    chat = await prisma.chat.create({
      data: {
        userId,
        title,
        messages: { create: [{ content: firstMessage, userId, role: 'user' }] }
      },
      include: { messages: true }
    });
    // Generate Gemini response
    const aiContent = await generateGeminiResponse(firstMessage);
    if (aiContent) {
      // Ensure the assistant user exists before creating the assistant message
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
    }
  } else {
    chat = await prisma.chat.create({
      data: { userId, title },
      include: { messages: true }
    });
  }
  return NextResponse.json(chat);
}

export async function DELETE(req: NextRequest) {
  const { userId } = getAuth(req);
  const chatId = req.nextUrl.searchParams.get('chatId');
  if (!userId || !chatId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Only allow deleting user's own chats
  const chat = await prisma.chat.findUnique({ where: { id: Number(chatId) } });
  if (!chat || chat.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.message.deleteMany({ where: { chatId: Number(chatId) } });
  await prisma.chat.delete({ where: { id: Number(chatId) } });
  return NextResponse.json({ success: true });
}
