import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/utils/prisma'
import { Webhook } from 'svix'

export async function POST(req: NextRequest) {
  const svix_id = req.headers.get('svix-id')
  const svix_timestamp = req.headers.get('svix-timestamp')
  const svix_signature = req.headers.get('svix-signature')
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }
  const payload = await req.text()
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
  const wh = new Webhook(secret)
  let evt: any
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  if (evt.type !== 'user.created') return NextResponse.json({ status: 'ignored' })
  const user = evt.data
  const id = user.id
  const email = user.email_addresses?.[0]?.email_address || null
  const username = user.username || null
  if (!id || !email) return NextResponse.json({ error: 'Missing user id or email' }, { status: 400 })
  const existing = await prisma.user.findUnique({ where: { id } })
  if (existing) return NextResponse.json(existing)
  const dbUser = await prisma.user.create({
    data: { id, username, email },
  })
  return NextResponse.json(dbUser)
}
