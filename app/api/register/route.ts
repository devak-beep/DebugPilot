export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db, { cuid } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { name, email: rawEmail, password } = await req.json()
  const email = rawEmail?.trim().toLowerCase()
  if (!name?.trim() || !email || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  const existing = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
  if (existing.rows.length) return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  const hashed = await bcrypt.hash(password, 10)
  const id = cuid()
  await db.execute({ sql: 'INSERT INTO User (id, name, email, password, createdAt) VALUES (?, ?, ?, ?, ?)', args: [id, name, email, hashed, new Date().toISOString()] })
  return NextResponse.json({ id, name, email })
}
