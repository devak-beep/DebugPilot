export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'
import { sendInviteEmail } from '@/lib/invite-email'
import { randomBytes } from 'crypto'

// POST /api/collections/[id]/invite
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: collectionId } = await params
  const { email, role = 'viewer' } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 })
  if (!['viewer', 'editor'].includes(role)) return NextResponse.json({ error: 'role must be viewer or editor' }, { status: 400 })

  const col = await db.execute({ sql: 'SELECT name FROM Collection WHERE id = ? AND userId = ?', args: [collectionId, session.user.id] })
  if (!col.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Idempotent: update role if already invited
  const existing = await db.execute({ sql: 'SELECT id, status FROM CollectionMember WHERE collectionId = ? AND memberEmail = ? AND ownerId = ?', args: [collectionId, email.trim(), session.user.id] })
  if (existing.rows.length) {
    await db.execute({ sql: 'UPDATE CollectionMember SET role = ? WHERE id = ?', args: [role, existing.rows[0].id] })
    return NextResponse.json({ ok: true, updated: true })
  }

  const inviteToken = randomBytes(24).toString('hex')
  const id = cuid()
  await db.execute({
    sql: 'INSERT INTO CollectionMember (id, collectionId, ownerId, memberId, memberEmail, role, status, inviteToken, createdAt) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)',
    args: [id, collectionId, session.user.id, email.trim(), role, 'pending', inviteToken, new Date().toISOString()]
  })

  const acceptUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/invite/${inviteToken}`
  await sendInviteEmail(email.trim(), session.user.name ?? session.user.email ?? 'Someone', col.rows[0].name as string, role, acceptUrl)

  return NextResponse.json({ ok: true })
}

// GET /api/collections/[id]/invite — list members
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: collectionId } = await params
  const r = await db.execute({ sql: 'SELECT id, memberEmail, role, status, createdAt FROM CollectionMember WHERE collectionId = ? AND ownerId = ? ORDER BY createdAt DESC', args: [collectionId, session.user.id] })
  return NextResponse.json(r.rows)
}

// DELETE /api/collections/[id]/invite — remove a member
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureTables()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: collectionId } = await params
  const { memberId } = await req.json()
  await db.execute({ sql: 'DELETE FROM CollectionMember WHERE id = ? AND collectionId = ? AND ownerId = ?', args: [memberId, collectionId, session.user.id] })
  return NextResponse.json({ ok: true })
}
