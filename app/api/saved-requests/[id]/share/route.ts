export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const r = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE id = ? AND userId = ?', args: [id, session.user.id] })
  if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let row = r.rows[0]
  if (!row.shareToken) {
    const token = randomBytes(16).toString('hex')
    await db.execute({ sql: 'UPDATE SavedRequest SET shareToken = ?, isPublic = 1 WHERE id = ?', args: [token, id] })
    row = { ...row, shareToken: token }
  }
  return NextResponse.json({ token: row.shareToken })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.execute({ sql: 'UPDATE SavedRequest SET shareToken = NULL, isPublic = 0 WHERE id = ? AND userId = ?', args: [id, session.user.id] })
  return NextResponse.json({ ok: true })
}
