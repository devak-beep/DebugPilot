import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const history = await prisma.requestHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, method: true, url: true, status: true, statusText: true, timeTaken: true, createdAt: true, headers: true, body: true },
  })
  return NextResponse.json(history)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.requestHistory.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
