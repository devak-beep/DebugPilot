export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { validatePassword } from '@/lib/password'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const uid = session.user.id

  const body = await req.json()
  const { action } = body

  if (action === 'name') {
    const { name } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    await db.execute({ sql: 'UPDATE User SET name = ? WHERE id = ?', args: [name.trim(), uid] })
    return NextResponse.json({ ok: true })
  }

  if (action === 'email') {
    const { newEmail: rawNew, otp } = body
    const newEmail = rawNew?.trim().toLowerCase()
    if (!newEmail || !otp) return NextResponse.json({ error: 'newEmail and otp required' }, { status: 400 })
    // Verify OTP sent to new email
    const now = new Date().toISOString()
    const r = await db.execute({ sql: 'SELECT id FROM OtpToken WHERE email = ? AND otp = ? AND purpose = ? AND expiresAt > ?', args: [newEmail.trim(), otp, 'email_change', now] })
    if (!r.rows.length) return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    await db.execute({ sql: 'DELETE FROM OtpToken WHERE id = ?', args: [r.rows[0].id as string] })
    // Check not taken
    const taken = await db.execute({ sql: 'SELECT id FROM User WHERE email = ? AND id != ?', args: [newEmail.trim(), uid] })
    if (taken.rows.length) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    await db.execute({ sql: 'UPDATE User SET email = ? WHERE id = ?', args: [newEmail.trim(), uid] })
    return NextResponse.json({ ok: true })
  }

  if (action === 'password') {
    const { oldPassword, newPassword } = body
    if (!oldPassword || !newPassword) return NextResponse.json({ error: 'oldPassword and newPassword required' }, { status: 400 })
    const err = validatePassword(newPassword)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    const r = await db.execute({ sql: 'SELECT password FROM User WHERE id = ?', args: [uid] })
    if (!r.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const valid = await bcrypt.compare(oldPassword, r.rows[0].password as string)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    const hashed = await bcrypt.hash(newPassword, 10)
    await db.execute({ sql: 'UPDATE User SET password = ? WHERE id = ?', args: [hashed, uid] })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
