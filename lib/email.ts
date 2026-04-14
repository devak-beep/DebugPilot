import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

export async function sendOtpEmail(to: string, otp: string, purpose: "register" | "reset") {
  const isRegister = purpose === "register"
  const subject = isRegister ? "Verify your DebugPilot account" : "Reset your DebugPilot password"
  const heading = isRegister ? "Confirm your email" : "Reset your password"
  const subtext = isRegister
    ? "Use the OTP below to complete your registration."
    : "Use the OTP below to reset your password."

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1d27;border-radius:16px;border:1px solid #2a2d3e;overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">⚡ DebugPilot</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Professional API Testing Tool</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 8px;color:#e2e8f0;font-size:20px;font-weight:600">${heading}</h2>
            <p style="margin:0 0 28px;color:#94a3b8;font-size:14px;line-height:1.6">${subtext}</p>

            <!-- OTP Box -->
            <div style="background:#0f1117;border:1px solid #2a2d3e;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
              <p style="margin:0 0 8px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Your OTP</p>
              <p style="margin:0;color:#818cf8;font-size:40px;font-weight:700;letter-spacing:12px">${otp}</p>
            </div>

            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">
              This code expires in <strong style="color:#94a3b8">10 minutes</strong>. If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2d3e;text-align:center">
            <p style="margin:0;color:#475569;font-size:11px">© 2026 DebugPilot · All rights reserved</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  await transporter.sendMail({
    from: `"DebugPilot" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
}
