export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// GET /api/share-links/[token] — resolve a share link (check access, return data)
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await ensureTables()
  const { token } = await params
  const session = await auth()

  const linkR = await db.execute({ sql: 'SELECT * FROM ShareLink WHERE token = ?', args: [token] })
  if (!linkR.rows.length) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  const link = linkR.rows[0]

  // Access check for request_required links
  if (link.visibility === 'request_required') {
    if (!session?.user?.id) return NextResponse.json({ error: 'login_required' }, { status: 401 })
    if (session.user.id !== link.ownerId) {
      // 1. Check CollectionMember (email-invite path)
      const memberAccess = await db.execute({
        sql: `SELECT role FROM CollectionMember
              WHERE collectionId = ? AND memberId = ? AND status = 'accepted'
              LIMIT 1`,
        args: [link.targetId as string, session.user.id]
      })
      // 2. Fallback: approved ShareAccessRequest for this (owner, type, target)
      const requestAccess = memberAccess.rows.length ? null : await db.execute({
        sql: `SELECT sar.id FROM ShareAccessRequest sar
              JOIN ShareLink sl ON sl.id = sar.linkId
              WHERE sl.ownerId = ? AND sl.type = ? AND sl.targetId = ?
                AND sar.requesterId = ? AND sar.status = 'approved'
              LIMIT 1`,
        args: [link.ownerId, link.type, link.targetId, session.user.id]
      })

      if (!memberAccess.rows.length && !requestAccess?.rows.length) {
        const pending = await db.execute({
          sql: `SELECT sar.id FROM ShareAccessRequest sar
                JOIN ShareLink sl ON sl.id = sar.linkId
                WHERE sl.ownerId = ? AND sl.type = ? AND sl.targetId = ?
                  AND sar.requesterId = ? AND sar.status = 'pending'
                LIMIT 1`,
          args: [link.ownerId, link.type, link.targetId, session.user.id]
        })
        return NextResponse.json({ error: 'access_required', hasPendingRequest: pending.rows.length > 0, linkId: link.id }, { status: 403 })
      }
    }
  }

  const role = session?.user?.id === link.ownerId ? 'owner'
    : (await db.execute({ sql: `SELECT role FROM CollectionMember WHERE collectionId = ? AND memberId = ? AND status = 'accepted' LIMIT 1`, args: [link.targetId as string, session?.user?.id ?? ''] })).rows[0]?.role ?? 'viewer'

  return NextResponse.json({ ...(await resolveLink(link)), role })
}

// DELETE /api/share-links/[token] — revoke a share link
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await ensureTables()
  const { token } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.execute({ sql: 'DELETE FROM ShareLink WHERE token = ? AND ownerId = ?', args: [token, session.user.id] })
  return NextResponse.json({ ok: true })
}

async function resolveLink(link: Record<string, unknown>) {
  if (link.type === 'collection') {
    const col = await db.execute({ sql: 'SELECT * FROM Collection WHERE id = ?', args: [link.targetId as string] })
    if (!col.rows.length) return { error: 'Collection not found' }
    const folders = await db.execute({ sql: 'SELECT * FROM Folder WHERE collectionId = ? ORDER BY createdAt ASC', args: [link.targetId as string] })
    const requests = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE collectionId = ? ORDER BY createdAt ASC', args: [link.targetId as string] })
    const examples = await db.execute({ sql: 'SELECT * FROM SavedExample WHERE savedRequestId IN (SELECT id FROM SavedRequest WHERE collectionId = ?) ORDER BY createdAt ASC', args: [link.targetId as string] })
    return { type: 'collection', visibility: link.visibility, collection: col.rows[0], folders: folders.rows, requests: requests.rows, examples: examples.rows }
  } else {
    const folder = await db.execute({ sql: 'SELECT * FROM Folder WHERE id = ?', args: [link.targetId as string] })
    if (!folder.rows.length) return { error: 'Folder not found' }
    const requests = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE folderId = ? ORDER BY createdAt ASC', args: [link.targetId as string] })
    const examples = await db.execute({ sql: 'SELECT * FROM SavedExample WHERE savedRequestId IN (SELECT id FROM SavedRequest WHERE folderId = ?) ORDER BY createdAt ASC', args: [link.targetId as string] })
    return { type: 'folder', visibility: link.visibility, folder: folder.rows[0], requests: requests.rows, examples: examples.rows }
  }
}
