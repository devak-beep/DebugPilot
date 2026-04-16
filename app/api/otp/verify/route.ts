export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db, { cuid } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { email, otp, purpose } = await req.json()
  if (!email || !otp || !purpose)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  const now = new Date().toISOString()
  const r = await db.execute({ sql: 'SELECT id FROM OtpToken WHERE email = ? AND otp = ? AND purpose = ? AND expiresAt > ?', args: [email, otp, purpose, now] })
  if (!r.rows.length) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
  await db.execute({ sql: 'DELETE FROM OtpToken WHERE id = ?', args: [r.rows[0].id as string] })

  if (purpose === "reset") {
    // Issue a one-time reset token (5 min TTL) so reset-password can't be replayed
    const resetToken = cuid() + cuid()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    await db.execute({ sql: 'DELETE FROM OtpToken WHERE email = ? AND purpose = ?', args: [email, "reset_verified"] })
    await db.execute({ sql: 'INSERT INTO OtpToken (id, email, otp, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: [cuid(), email, resetToken, "reset_verified", expiresAt, now] })
    return NextResponse.json({ verified: true, resetToken })
  }

  return NextResponse.json({ verified: true })
}
