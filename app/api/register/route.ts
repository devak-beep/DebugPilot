export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json()
  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, password: hashed } })
  return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}
