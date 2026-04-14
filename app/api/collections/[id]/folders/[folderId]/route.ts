export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { folderId } = await params
  await prisma.folder.deleteMany({ where: { id: folderId, userId: session.user.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { folderId } = await params
  const { name } = await req.json()
  await prisma.folder.updateMany({ where: { id: folderId, userId: session.user.id }, data: { name } })
  return NextResponse.json({ ok: true })
}
