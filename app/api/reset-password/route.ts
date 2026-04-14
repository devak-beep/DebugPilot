export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email?.trim() || !password?.trim())
    return NextResponse.json({ error: "All fields required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "No account with that email" }, { status: 404 })

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { email }, data: { password: hashed } })
  return NextResponse.json({ message: "Password updated" })
}
