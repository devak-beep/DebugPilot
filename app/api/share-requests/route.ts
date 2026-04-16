export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// POST /api/share-requests — requester asks for access
export async function POST(req: NextRequest) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { linkId } = await req.json()
  if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })

  const link = await db.execute({ sql: 'SELECT id, ownerId FROM ShareLink WHERE id = ?', args: [linkId] })
  if (!link.rows.length) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  if (link.rows[0].ownerId === session.user.id) return NextResponse.json({ error: 'You own this' }, { status: 400 })

  // Idempotent — don't create duplicate pending requests
  const existing = await db.execute({ sql: 'SELECT id, status FROM ShareAccessRequest WHERE linkId = ? AND requesterId = ?', args: [linkId, session.user.id] })
  if (existing.rows.length) return NextResponse.json({ id: existing.rows[0].id, status: existing.rows[0].status })

  const id = cuid()
  await db.execute({
    sql: 'INSERT INTO ShareAccessRequest (id, linkId, requesterId, requesterName, requesterEmail, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, linkId, session.user.id, session.user.name ?? '', session.user.email ?? '', 'pending', new Date().toISOString()]
  })
  return NextResponse.json({ id, status: 'pending' })
}

// GET /api/share-requests — owner sees all pending requests for their links
export async function GET() {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const r = await db.execute({
    sql: `SELECT sar.*, sl.type, sl.targetId, sl.token
          FROM ShareAccessRequest sar
          JOIN ShareLink sl ON sl.id = sar.linkId
          WHERE sl.ownerId = ? AND sar.status = 'pending'
          ORDER BY sar.createdAt DESC`,
    args: [session.user.id]
  })
  return NextResponse.json(r.rows)
}
