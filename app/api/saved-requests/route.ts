export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, method, url, headers, body, collectionId, folderId } = await req.json()
  if (!name?.trim() || !collectionId) return NextResponse.json({ error: 'name and collectionId required' }, { status: 400 })
  const id = cuid()
  await db.execute({
    sql: 'INSERT INTO SavedRequest (id, userId, name, method, url, headers, body, isPublic, collectionId, folderId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)',
    args: [id, session.user.id, name.trim(), method, url, JSON.stringify(headers ?? {}), body ?? null, collectionId, folderId ?? null, new Date().toISOString()]
  })
  return NextResponse.json({ id, userId: session.user.id, name: name.trim(), method, url, headers: JSON.stringify(headers ?? {}), body: body ?? null, collectionId, folderId: folderId ?? null })
}
