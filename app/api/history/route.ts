export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await db.execute({ sql: 'SELECT id, method, url, status, statusText, timeTaken, createdAt, headers, body FROM RequestHistory WHERE userId = ? ORDER BY createdAt DESC', args: [session.user.id] })
  return NextResponse.json(r.rows)
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.execute({ sql: 'DELETE FROM RequestHistory WHERE userId = ?', args: [session.user.id] })
  return NextResponse.json({ ok: true })
}
