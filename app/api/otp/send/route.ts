export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db, { cuid } from "@/lib/db"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const { email: rawEmail, purpose } = await req.json()
  const email = rawEmail?.trim().toLowerCase()
  if (!email || !["register", "reset", "email_change"].includes(purpose))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  if (purpose === "register") {
    const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
    if (r.rows.length) return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  } else if (purpose === "reset") {
    const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
    if (!r.rows.length) return NextResponse.json({ error: "No account with that email" }, { status: 404 })
  }
  // email_change: check new email isn't already taken
  if (purpose === "email_change") {
    const taken = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
    if (taken.rows.length) return NextResponse.json({ error: "This email is already registered to another account" }, { status: 409 })
  }

  // Rate-limit: block resend if an OTP was issued within the last 60 seconds
  const recent = await db.execute({ sql: 'SELECT createdAt FROM OtpToken WHERE email = ? AND purpose = ? ORDER BY createdAt DESC LIMIT 1', args: [email, purpose] })
  if (recent.rows.length) {
    const age = Date.now() - new Date(recent.rows[0].createdAt as string).getTime()
    if (age < 60_000) return NextResponse.json({ error: "Please wait before requesting another OTP" }, { status: 429 })
  }

  await db.execute({ sql: 'DELETE FROM OtpToken WHERE email = ? AND purpose = ?', args: [email, purpose] })
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await db.execute({ sql: 'INSERT INTO OtpToken (id, email, otp, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)', args: [cuid(), email, otp, purpose, expiresAt, new Date().toISOString()] })
  await sendOtpEmail(email, otp, purpose)
  return NextResponse.json({ message: "OTP sent" })
}
