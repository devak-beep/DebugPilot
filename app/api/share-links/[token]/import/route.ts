export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// POST /api/share-links/[token]/import
// body for folder: { collectionId: string }
// body for collection: {} (creates a new collection)
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params
  const body = await req.json().catch(() => ({}))

  const linkR = await db.execute({ sql: 'SELECT * FROM ShareLink WHERE token = ?', args: [token] })
  if (!linkR.rows.length) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  const link = linkR.rows[0]

  // Access check
  if (link.visibility === 'request_required' && link.ownerId !== session.user.id) {
    const access = await db.execute({
      sql: `SELECT sar.id FROM ShareAccessRequest sar
            JOIN ShareLink sl ON sl.id = sar.linkId
            WHERE sl.ownerId = ? AND sl.type = ? AND sl.targetId = ?
              AND sar.requesterId = ? AND sar.status = 'approved'
            LIMIT 1`,
      args: [link.ownerId, link.type, link.targetId, session.user.id]
    })
    if (!access.rows.length) return NextResponse.json({ error: 'Access not granted' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const uid = session.user.id

  if (link.type === 'collection') {
    const srcCol = await db.execute({ sql: 'SELECT * FROM Collection WHERE id = ?', args: [link.targetId as string] })
    if (!srcCol.rows.length) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

    const newColId = cuid()
    const colName = `${srcCol.rows[0].name as string} (imported)`
    await db.execute({ sql: 'INSERT INTO Collection (id, userId, name, isPublic, createdAt) VALUES (?, ?, ?, 0, ?)', args: [newColId, uid, colName, now] })

    // Copy folders
    const folders = await db.execute({ sql: 'SELECT * FROM Folder WHERE collectionId = ?', args: [link.targetId as string] })
    const folderIdMap: Record<string, string> = {}
    for (const f of folders.rows) {
      const newFId = cuid()
      folderIdMap[f.id as string] = newFId
      await db.execute({ sql: 'INSERT INTO Folder (id, userId, collectionId, name, isPublic, createdAt) VALUES (?, ?, ?, ?, 0, ?)', args: [newFId, uid, newColId, f.name, now] })
    }

    // Copy requests
    const requests = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE collectionId = ?', args: [link.targetId as string] })
    for (const r of requests.rows) {
      const newRId = cuid()
      const newFolderId = r.folderId ? (folderIdMap[r.folderId as string] ?? null) : null
      await db.execute({ sql: 'INSERT INTO SavedRequest (id, userId, name, method, url, headers, body, isPublic, collectionId, folderId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)', args: [newRId, uid, r.name, r.method, r.url, r.headers, r.body, newColId, newFolderId, now] })
    }

    return NextResponse.json({ ok: true, collectionId: newColId, name: colName })
  } else {
    // Folder import — needs a target collectionId
    const { collectionId } = body
    if (!collectionId) return NextResponse.json({ error: 'collectionId required for folder import' }, { status: 400 })
    const colCheck = await db.execute({ sql: 'SELECT id FROM Collection WHERE id = ? AND userId = ?', args: [collectionId, uid] })
    if (!colCheck.rows.length) return NextResponse.json({ error: 'Target collection not found' }, { status: 404 })

    const srcFolder = await db.execute({ sql: 'SELECT * FROM Folder WHERE id = ?', args: [link.targetId as string] })
    if (!srcFolder.rows.length) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

    const newFolderId = cuid()
    const folderName = `${srcFolder.rows[0].name as string} (imported)`
    await db.execute({ sql: 'INSERT INTO Folder (id, userId, collectionId, name, isPublic, createdAt) VALUES (?, ?, ?, ?, 0, ?)', args: [newFolderId, uid, collectionId, folderName, now] })

    const requests = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE folderId = ?', args: [link.targetId as string] })
    for (const r of requests.rows) {
      const newRId = cuid()
      await db.execute({ sql: 'INSERT INTO SavedRequest (id, userId, name, method, url, headers, body, isPublic, collectionId, folderId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)', args: [newRId, uid, r.name, r.method, r.url, r.headers, r.body, collectionId, newFolderId, now] })
    }

    return NextResponse.json({ ok: true, folderId: newFolderId, name: folderName })
  }
}
