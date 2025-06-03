// src/app/api/chats/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const data = await req.json();
  // Your logic here...

  return NextResponse.json({ message: 'Chat received', data });
}
