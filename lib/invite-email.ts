import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

export async function sendInviteEmail(to: string, inviterName: string, targetName: string, role: string, acceptUrl: string) {
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background:#f0fdf4;font-family:\'Segoe UI\',Arial,sans-serif">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 16px">',
    '<tr><td align="center">',
    '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #bbf7d0">',

    // Header
    '<tr><td style="background:linear-gradient(135deg,#14532d 0%,#16a34a 100%);padding:32px 40px">',
    '<table cellpadding="0" cellspacing="0"><tr>',
    '<td style="vertical-align:middle;padding-right:14px">',
    '<img src="https://debug-pilot.vercel.app/logo-icon.png" width="52" height="52" alt="" style="display:block;border-radius:14px;border:2px solid rgba(255,255,255,0.2)" />',
    '</td>',
    '<td style="vertical-align:middle">',
    '<div style="font-size:28px;font-weight:900;letter-spacing:-0.5px;line-height:1"><span style="color:#ffffff">Debug</span><span style="color:#86efac">Pilot</span></div>',
    '<div style="font-size:10px;font-weight:600;color:#bbf7d0;letter-spacing:3px;text-transform:uppercase;margin-top:4px">API Debugger</div>',
    '</td></tr></table>',
    '</td></tr>',

    // Body
    '<tr><td style="padding:40px 40px 32px">',
    '<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:1px">Invitation</p>',
    '<h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#14532d;line-height:1.3">You\'ve been invited to collaborate</h1>',
    '<p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7">',
    '<strong style="color:#111827">' + inviterName + '</strong> has invited you to access ',
    '<strong style="color:#111827">' + targetName + '</strong> on DebugPilot as a ',
    '<span style="display:inline-block;padding:2px 10px;background:#dcfce7;color:#15803d;border-radius:20px;font-size:13px;font-weight:700">' + role + '</span>.',
    '</p>',

    // CTA button
    '<table cellpadding="0" cellspacing="0"><tr><td>',
    '<a href="' + acceptUrl + '" style="display:inline-block;padding:14px 32px;background:#16a34a;color:#ffffff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.2px">',
    'Accept Invitation &rarr;',
    '</a>',
    '</td></tr></table>',

    '<p style="margin:20px 0 0;font-size:12px;color:#9ca3af">This invitation expires in 7 days. If you weren\'t expecting this, you can safely ignore it.</p>',
    '</td></tr>',

    // Footer
    '<tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">',
    '<p style="margin:0;font-size:12px;color:#9ca3af">&copy; 2026 DebugPilot &middot; All rights reserved</p>',
    '</td></tr>',

    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('')

  await transporter.sendMail({
    from: '"DebugPilot" <' + process.env.EMAIL_USER + '>',
    to,
    subject: inviterName + ' invited you to "' + targetName + '" on DebugPilot',
    html,
  })
}
