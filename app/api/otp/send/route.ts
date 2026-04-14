import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const { email, purpose } = await req.json()
  if (!email || !["register", "reset"].includes(purpose))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  if (purpose === "register") {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  } else {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: "No account with that email" }, { status: 404 })
  }

  // Delete old OTPs for this email+purpose
  await prisma.otpToken.deleteMany({ where: { email, purpose } })

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.otpToken.create({ data: { email, otp, purpose, expiresAt } })
  await sendOtpEmail(email, otp, purpose)

  return NextResponse.json({ message: "OTP sent" })
}
