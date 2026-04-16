export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// PATCH /api/share-requests/[id] — owner approves or denies
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()
  if (!['approved', 'denied'].includes(status)) return NextResponse.json({ error: 'status must be approved or denied' }, { status: 400 })

  // Verify the request belongs to a link owned by this user
  const r = await db.execute({
    sql: 'SELECT sar.id FROM ShareAccessRequest sar JOIN ShareLink sl ON sl.id = sar.linkId WHERE sar.id = ? AND sl.ownerId = ?',
    args: [id, session.user.id]
  })
  if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.execute({ sql: 'UPDATE ShareAccessRequest SET status = ? WHERE id = ?', args: [status, id] })
  return NextResponse.json({ ok: true, status })
}
