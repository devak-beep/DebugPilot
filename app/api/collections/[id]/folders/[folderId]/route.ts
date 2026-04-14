export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { folderId } = await params
  await db.execute({ sql: 'DELETE FROM Folder WHERE id = ? AND userId = ?', args: [folderId, session.user.id] })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { folderId } = await params
  const { name } = await req.json()
  await db.execute({ sql: 'UPDATE Folder SET name = ? WHERE id = ? AND userId = ?', args: [name, folderId, session.user.id] })
  return NextResponse.json({ ok: true })
}
