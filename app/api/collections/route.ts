export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = session.user.id

  const cols = await db.execute({ sql: 'SELECT * FROM Collection WHERE userId = ? ORDER BY sortOrder ASC, createdAt ASC', args: [uid] })
  const folders = await db.execute({ sql: 'SELECT * FROM Folder WHERE userId = ? ORDER BY sortOrder ASC, createdAt ASC', args: [uid] })
  const requests = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE userId = ? ORDER BY sortOrder ASC, createdAt ASC', args: [uid] })
  const examples = await db.execute({ sql: 'SELECT * FROM SavedExample ORDER BY createdAt ASC', args: [] })

  const exByReq: Record<string, any[]> = {}
  for (const ex of examples.rows) {
    const rid = ex.savedRequestId as string
    if (!exByReq[rid]) exByReq[rid] = []
    exByReq[rid].push(ex)
  }

  const reqByFolder: Record<string, any[]> = {}
  const reqByCol: Record<string, any[]> = {}
  for (const r of requests.rows) {
    const req = { ...r, examples: exByReq[r.id as string] ?? [] }
    if (r.folderId) {
      if (!reqByFolder[r.folderId as string]) reqByFolder[r.folderId as string] = []
      reqByFolder[r.folderId as string].push(req)
    } else {
      if (!reqByCol[r.collectionId as string]) reqByCol[r.collectionId as string] = []
      reqByCol[r.collectionId as string].push(req)
    }
  }

  const foldersByCol: Record<string, any[]> = {}
  for (const f of folders.rows) {
    const folder = { ...f, requests: reqByFolder[f.id as string] ?? [] }
    if (!foldersByCol[f.collectionId as string]) foldersByCol[f.collectionId as string] = []
    foldersByCol[f.collectionId as string].push(folder)
  }

  const result = cols.rows.map(c => ({
    ...c,
    folders: foldersByCol[c.id as string] ?? [],
    requests: reqByCol[c.id as string] ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const id = cuid()
  const maxRes = await db.execute({ sql: 'SELECT MAX(sortOrder) as m FROM Collection WHERE userId = ?', args: [session.user.id] })
  const sortOrder = ((maxRes.rows[0]?.m as number | null) ?? -1) + 1
  await db.execute({ sql: 'INSERT INTO Collection (id, userId, name, isPublic, sortOrder, createdAt) VALUES (?, ?, ?, 0, ?, ?)', args: [id, session.user.id, name.trim(), sortOrder, new Date().toISOString()] })
  return NextResponse.json({ id, userId: session.user.id, name: name.trim(), folders: [], requests: [] })
}
