export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/db"

export async function POST(req: NextRequest) {
  const { email, otp, purpose } = await req.json()
  if (!email || !otp || !purpose)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  const now = new Date().toISOString()
  const r = await db.execute({ sql: 'SELECT id FROM OtpToken WHERE email = ? AND otp = ? AND purpose = ? AND expiresAt > ?', args: [email, otp, purpose, now] })
  if (!r.rows.length) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
  await db.execute({ sql: 'DELETE FROM OtpToken WHERE id = ?', args: [r.rows[0].id as string] })
  return NextResponse.json({ verified: true })
}
