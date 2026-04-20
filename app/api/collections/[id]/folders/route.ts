export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: collectionId } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const id = cuid()
  const maxRes = await db.execute({ sql: 'SELECT MAX(sortOrder) as m FROM Folder WHERE collectionId = ?', args: [collectionId] })
  const sortOrder = ((maxRes.rows[0]?.m as number | null) ?? -1) + 1
  await db.execute({ sql: 'INSERT INTO Folder (id, userId, collectionId, name, isPublic, sortOrder, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)', args: [id, session.user.id, collectionId, name.trim(), sortOrder, new Date().toISOString()] })
  return NextResponse.json({ id, userId: session.user.id, collectionId, name: name.trim(), requests: [] })
}
