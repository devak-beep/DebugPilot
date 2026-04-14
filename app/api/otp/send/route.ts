export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db, { cuid } from "@/lib/db"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const { email, purpose } = await req.json()
  if (!email || !["register", "reset"].includes(purpose))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  if (purpose === "register") {
    const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
    if (r.rows.length) return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  } else {
    const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
    if (!r.rows.length) return NextResponse.json({ error: "No account with that email" }, { status: 404 })
  }

  await db.execute({ sql: 'DELETE FROM OtpToken WHERE email = ? AND purpose = ?', args: [email, purpose] })
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await db.execute({ sql: 'INSERT INTO OtpToken (id, email, otp, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: [cuid(), email, otp, purpose, expiresAt, new Date().toISOString()] })
  await sendOtpEmail(email, otp, purpose)
  return NextResponse.json({ message: "OTP sent" })
}
