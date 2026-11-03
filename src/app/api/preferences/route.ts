import { getAuth } from '@clerk/nextjs/server';
import prisma from '@/lib/db/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { parsePreferences, readPreferences } from '@/lib/preferences';

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return NextResponse.json(readPreferences(user?.preferences));
}

export async function PUT(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const preferences = parsePreferences(await req.json().catch(() => null));
  if (!preferences) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
  await prisma.user.upsert({
    where: { id: userId },
    update: { preferences },
    create: { id: userId, email: `${userId}@noemail.local`, preferences }
  });
  return NextResponse.json(preferences);
}
