export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const r = await db.execute({ sql: 'SELECT * FROM RequestHistory WHERE id = ? AND userId = ?', args: [id, session.user.id] })
  if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(r.rows[0])
}
