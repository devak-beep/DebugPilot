export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

// body: { type: 'collection'|'folder'|'request', ids: string[] }
// ids is the new ordered array of IDs — we assign sortOrder = index
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, ids } = await req.json()
  if (!type || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const uid = session.user!.id as string
  const table = type === 'collection' ? 'Collection' : type === 'folder' ? 'Folder' : 'SavedRequest'
  await Promise.all(ids.map((id: string, i: number) =>
    db.execute({ sql: `UPDATE ${table} SET sortOrder = ? WHERE id = ? AND userId = ?`, args: [i, id, uid] })
  ))
  return NextResponse.json({ ok: true })
}
