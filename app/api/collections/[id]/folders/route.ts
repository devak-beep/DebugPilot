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
  await db.execute({ sql: 'INSERT INTO Folder (id, userId, collectionId, name, isPublic, createdAt) VALUES (?, ?, ?, ?, 0, ?)', args: [id, session.user.id, collectionId, name.trim(), new Date().toISOString()] })
  return NextResponse.json({ id, userId: session.user.id, collectionId, name: name.trim(), requests: [] })
}
