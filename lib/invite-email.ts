import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

export async function sendInviteEmail(to: string, inviterName: string, targetName: string, role: string, acceptUrl: string) {
  const parts: string[] = []
  parts.push('<!DOCTYPE html><html><body style="margin:0;padding:0;background:#052e16;font-family:Arial,sans-serif">')
  parts.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#052e16;padding:40px 0">')
  parts.push('<tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#0f1f14;border-radius:16px;border:1px solid #166534;overflow:hidden">')
  parts.push('<tr><td style="background:linear-gradient(135deg,#14532d,#166534);padding:28px;text-align:center">')
  parts.push('<div style="font-size:26px;font-weight:900;color:#dcfce7">DebugPilot</div></td></tr>')
  parts.push('<tr><td style="padding:32px 40px">')
  parts.push('<h2 style="margin:0 0 12px;color:#dcfce7;font-size:18px">You\'ve been invited!</h2>')
  parts.push('<p style="margin:0 0 20px;color:#86efac;font-size:14px;line-height:1.6"><strong style="color:#dcfce7">' + inviterName + '</strong> invited you to <strong style="color:#dcfce7">' + targetName + '</strong> as a <strong style="color:#22c55e">' + role + '</strong>.</p>')
  parts.push('<a href="' + acceptUrl + '" style="display:inline-block;padding:12px 28px;background:#16a34a;color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Accept Invitation</a>')
  parts.push('<p style="margin:20px 0 0;color:#4ade80;font-size:11px">Valid for 7 days.</p>')
  parts.push('</td></tr><tr><td style="padding:16px 40px;border-top:1px solid #166534;text-align:center">')
  parts.push('<p style="margin:0;color:#4ade80;font-size:11px">2026 DebugPilot</p></td></tr>')
  parts.push('</table></td></tr></table></body></html>')

  await transporter.sendMail({
    from: '"DebugPilot" <' + process.env.EMAIL_USER + '>',
    to,
    subject: inviterName + ' invited you to ' + targetName + ' on DebugPilot',
    html: parts.join(''),
  })
}
