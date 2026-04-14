export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import db from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email?.trim() || !password?.trim())
    return NextResponse.json({ error: "All fields required" }, { status: 400 })
  const r = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [email] })
  if (!r.rows.length) return NextResponse.json({ error: "No account with that email" }, { status: 404 })
  const hashed = await bcrypt.hash(password, 10)
  await db.execute({ sql: 'UPDATE User SET password = ? WHERE email = ?', args: [hashed, email] })
  return NextResponse.json({ message: "Password updated" })
}
