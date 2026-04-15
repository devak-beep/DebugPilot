export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM SavedRequest WHERE id = ? AND userId = ?', args: [id, session.user.id] })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  if (body.name !== undefined) {
    await db.execute({ sql: 'UPDATE SavedRequest SET name = ? WHERE id = ? AND userId = ?', args: [body.name, id, session.user.id] })
  } else if (body.collectionId !== undefined) {
    await db.execute({ sql: 'UPDATE SavedRequest SET collectionId = ?, folderId = ? WHERE id = ? AND userId = ?', args: [body.collectionId, body.folderId ?? null, id, session.user.id] })
  }
  return NextResponse.json({ ok: true })
}
