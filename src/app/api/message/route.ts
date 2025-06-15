import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/utils/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { generateGeminiResponse } from '@/utils/gemini';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chatId = searchParams.get('chatId');
  const { userId } = getAuth(req);
  if (!userId || !chatId) return NextResponse.json([], { status: 401 });
  // Fetch all messages for the chat, not just the current user's
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
  const message = await prisma.message.create({
    data: { chatId: Number(chatId), userId, content, role: 'user' }
  });
  await prisma.chat.update({ where: { id: Number(chatId) }, data: { updatedAt: new Date() } });

  // Generate Gemini response and save as assistant message
  const aiContent = await generateGeminiResponse(content);
  let aiMessage = null;
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
    aiMessage = await prisma.message.create({
      data: { chatId: Number(chatId), userId: 'luno-ai', content: aiContent, role: 'assistant' }
    });
  }

  return NextResponse.json({ user: message, assistant: aiMessage });
}
