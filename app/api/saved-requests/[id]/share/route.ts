export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { randomBytes } from 'crypto'

// GET: fetch share token (generate if missing)
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let req = await prisma.savedRequest.findFirst({ where: { id, userId: session.user.id } })
  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!req.shareToken) {
    req = await prisma.savedRequest.update({
      where: { id },
      data: { shareToken: randomBytes(16).toString('hex'), isPublic: true },
    })
  }

  return NextResponse.json({ token: req.shareToken })
}

// DELETE: revoke share
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.savedRequest.updateMany({
    where: { id, userId: session.user.id },
    data: { shareToken: null, isPublic: false },
  })
  return NextResponse.json({ ok: true })
}
