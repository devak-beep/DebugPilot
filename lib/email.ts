import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

export async function sendOtpEmail(to: string, otp: string, purpose: "register" | "reset" | "email_change") {
  const isRegister = purpose === "register"
  const subject = isRegister ? "Verify your DebugPilot account" : purpose === "email_change" ? "Confirm your new email" : "Reset your DebugPilot password"
  const heading = isRegister ? "Confirm your email" : purpose === "email_change" ? "Confirm email change" : "Reset your password"
  const subtext = isRegister
    ? "Use the OTP below to complete your registration."
    : purpose === "email_change"
    ? "Use the OTP below to confirm your new email address."
    : "Use the OTP below to reset your password."

  const parts: string[] = []
  parts.push('<!DOCTYPE html><html><head><meta charset="UTF-8"></head>')
  parts.push('<body style="margin:0;padding:0;background:#052e16;font-family:\'Segoe UI\',Arial,sans-serif">')
  parts.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#052e16;padding:40px 0">')
  parts.push('<tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#0f1f14;border-radius:16px;border:1px solid #166534;overflow:hidden">')
  parts.push('<tr><td style="background:linear-gradient(135deg,#14532d,#166534);padding:28px 40px;text-align:center">')
  parts.push('<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>')
  parts.push('<td style="vertical-align:middle;padding-right:12px"><img src="https://debug-pilot.vercel.app/logo-icon.png" width="48" height="48" alt="DebugPilot" style="display:block;border-radius:12px" /></td>')
  parts.push('<td style="vertical-align:middle;text-align:left">')
  parts.push('<div style="font-size:26px;font-weight:900;line-height:1.1"><span style="color:#dcfce7">Debug</span><span style="color:#22c55e">Pilot</span></div>')
  parts.push('<div style="font-size:10px;font-weight:600;color:#86efac;letter-spacing:2px;text-transform:uppercase;margin-top:3px">API Debugger</div>')
  parts.push('</td></tr></table>')
  parts.push('</td></tr>')
  parts.push('<tr><td style="padding:36px 40px">')
  parts.push('<h2 style="margin:0 0 8px;color:#dcfce7;font-size:20px;font-weight:600">' + heading + '</h2>')
  parts.push('<p style="margin:0 0 28px;color:#86efac;font-size:14px;line-height:1.6">' + subtext + '</p>')
  parts.push('<div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">')
  parts.push('<p style="margin:0 0 8px;color:#4ade80;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Your OTP</p>')
  parts.push('<p style="margin:0;color:#22c55e;font-size:40px;font-weight:700;letter-spacing:12px">' + otp + '</p>')
  parts.push('</div>')
  parts.push('<p style="margin:0;color:#4ade80;font-size:12px;line-height:1.6">This code expires in <strong style="color:#86efac">10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>')
  parts.push('</td></tr>')
  parts.push('<tr><td style="padding:20px 40px;border-top:1px solid #166534;text-align:center">')
  parts.push('<p style="margin:0;color:#4ade80;font-size:11px">2026 DebugPilot. All rights reserved.</p>')
  parts.push('</td></tr></table></td></tr></table></body></html>')

  await transporter.sendMail({
    from: '"DebugPilot" <' + process.env.EMAIL_USER + '>',
    to,
    subject,
    html: parts.join(''),
  })
}
