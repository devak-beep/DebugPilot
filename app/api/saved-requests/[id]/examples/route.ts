export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const r = await db.execute({ sql: 'SELECT * FROM SavedExample WHERE savedRequestId = ? ORDER BY createdAt ASC', args: [id] })
  return NextResponse.json(r.rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const { name, status, statusText, response, timeTaken } = await req.json()
    const exId = cuid()
    await db.execute({ sql: 'INSERT INTO SavedExample (id, savedRequestId, name, status, statusText, response, timeTaken, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [exId, id, name, Number(status), statusText, String(response), Number(timeTaken), new Date().toISOString()] })
    return NextResponse.json({ id: exId, savedRequestId: id, name, status, statusText, response, timeTaken })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
