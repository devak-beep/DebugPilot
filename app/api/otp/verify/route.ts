export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { email, otp, purpose } = await req.json()
  if (!email || !otp || !purpose)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const token = await prisma.otpToken.findFirst({
    where: { email, otp, purpose, expiresAt: { gt: new Date() } },
  })
  if (!token) return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })

  await prisma.otpToken.delete({ where: { id: token.id } })
  return NextResponse.json({ verified: true })
}
