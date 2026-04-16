export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { ensureTables } from '@/lib/migrate'

// POST /api/share-links — create a share link for a folder or collection
export async function POST(req: NextRequest) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, targetId, visibility = 'public' } = await req.json()
  if (!['folder', 'collection'].includes(type) || !targetId)
    return NextResponse.json({ error: 'type (folder|collection) and targetId required' }, { status: 400 })
  if (!['public', 'request_required'].includes(visibility))
    return NextResponse.json({ error: 'visibility must be public or request_required' }, { status: 400 })

  // Verify ownership
  if (type === 'collection') {
    const r = await db.execute({ sql: 'SELECT id FROM Collection WHERE id = ? AND userId = ?', args: [targetId, session.user.id] })
    if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    const r = await db.execute({ sql: 'SELECT id FROM Folder WHERE id = ? AND userId = ?', args: [targetId, session.user.id] })
    if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Upsert: one link per (type, targetId, owner)
  const existing = await db.execute({ sql: 'SELECT id, token FROM ShareLink WHERE ownerId = ? AND type = ? AND targetId = ?', args: [session.user.id, type, targetId] })
  if (existing.rows.length) {
    await db.execute({ sql: 'UPDATE ShareLink SET visibility = ? WHERE id = ?', args: [visibility, existing.rows[0].id as string] })
    return NextResponse.json({ token: existing.rows[0].token, visibility })
  }

  const token = randomBytes(20).toString('hex')
  const id = cuid()
  await db.execute({ sql: 'INSERT INTO ShareLink (id, ownerId, type, targetId, token, visibility, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', args: [id, session.user.id, type, targetId, token, visibility, new Date().toISOString()] })
  return NextResponse.json({ token, visibility })
}

// GET /api/share-links — list owner's share links
export async function GET() {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await db.execute({ sql: 'SELECT * FROM ShareLink WHERE ownerId = ? ORDER BY createdAt DESC', args: [session.user.id] })
  return NextResponse.json(r.rows)
}
