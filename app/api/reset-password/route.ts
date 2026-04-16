export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/db"
import bcrypt from "bcryptjs"
import { validatePassword } from '@/lib/password'

export async function POST(req: NextRequest) {
  const { email: rawEmail, password, resetToken } = await req.json()
  const email = rawEmail?.trim().toLowerCase()
  if (!email || !password?.trim() || !resetToken)
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  const pwErr = validatePassword(password)
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 })

  // Consume the one-time reset token issued after OTP verification
  const now = new Date().toISOString()
  const t = await db.execute({ sql: 'SELECT id FROM OtpToken WHERE email = ? AND otp = ? AND purpose = ? AND expiresAt > ?', args: [email, resetToken, "reset_verified", now] })
  if (!t.rows.length) return NextResponse.json({ error: "Invalid or expired reset session" }, { status: 400 })
  await db.execute({ sql: 'DELETE FROM OtpToken WHERE id = ?', args: [t.rows[0].id as string] })

  const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
  if (!r.rows.length) return NextResponse.json({ error: "No account with that email" }, { status: 404 })
  const hashed = await bcrypt.hash(password, 10)
  await db.execute({ sql: 'UPDATE User SET password = ? WHERE email = ?', args: [hashed, email] })
  return NextResponse.json({ message: "Password updated" })
}
