export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// GET — list all approved grants for the owner's shared items
export async function GET() {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Deduplicate: one row per (requester, type, targetId) — pick the most recent approved grant
  const r = await db.execute({
    sql: `SELECT sar.id, sar.requesterId, sar.requesterName, sar.requesterEmail,
                 sl.type, sl.targetId,
                 COALESCE(
                   CASE WHEN sl.type = 'collection' THEN (SELECT name FROM Collection WHERE id = sl.targetId)
                        ELSE (SELECT name FROM Folder WHERE id = sl.targetId) END,
                   'Deleted'
                 ) AS targetName
          FROM ShareAccessRequest sar
          JOIN ShareLink sl ON sl.id = sar.linkId
          WHERE sl.ownerId = ? AND sar.status = 'approved'
          GROUP BY sar.requesterId, sl.type, sl.targetId
          ORDER BY sar.createdAt DESC`,
    args: [session.user.id]
  })
  return NextResponse.json(r.rows)
}

// DELETE — revoke all approved grants for a (requester, type, targetId) combo
export async function DELETE(req: NextRequest) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requesterId, type, targetId } = await req.json()
  if (!requesterId || !type || !targetId) return NextResponse.json({ error: 'requesterId, type, targetId required' }, { status: 400 })

  await db.execute({
    sql: `UPDATE ShareAccessRequest SET status = 'denied'
          WHERE requesterId = ? AND status = 'approved'
            AND linkId IN (SELECT id FROM ShareLink WHERE ownerId = ? AND type = ? AND targetId = ?)`,
    args: [requesterId, session.user.id, type, targetId]
  })
  return NextResponse.json({ ok: true })
}
