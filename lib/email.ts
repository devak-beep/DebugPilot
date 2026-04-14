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
<body style="margin:0;padding:0;background:#052e16;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#052e16;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0f1f14;border-radius:16px;border:1px solid #166534;overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#14532d,#166534);padding:32px;text-align:center">
            <!-- Inline SVG logo mark -->
            <div style="margin-bottom:12px">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="10" fill="#22c55e"/>
                <path d="M10 20 L16 14 L16 26 Z" fill="#052e16"/>
                <path d="M20 13 L20 27" stroke="#052e16" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M25 16 L30 20 L25 24" stroke="#052e16" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h1 style="margin:0;color:#dcfce7;font-size:22px;font-weight:700;letter-spacing:-0.5px">DebugPilot</h1>
            <p style="margin:6px 0 0;color:#86efac;font-size:12px;letter-spacing:0.5px">API Debugger</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 8px;color:#dcfce7;font-size:20px;font-weight:600">${heading}</h2>
            <p style="margin:0 0 28px;color:#86efac;font-size:14px;line-height:1.6">${subtext}</p>

            <!-- OTP Box -->
            <div style="background:#052e16;border:1px solid #166534;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
              <p style="margin:0 0 8px;color:#4ade80;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Your OTP</p>
              <p style="margin:0;color:#22c55e;font-size:40px;font-weight:700;letter-spacing:12px">${otp}</p>
            </div>

            <p style="margin:0;color:#4ade80;font-size:12px;line-height:1.6">
              This code expires in <strong style="color:#86efac">10 minutes</strong>. If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #166534;text-align:center">
            <p style="margin:0;color:#4ade80;font-size:11px">© 2026 DebugPilot · All rights reserved</p>
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
