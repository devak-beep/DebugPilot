export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { ensureTables } from '@/lib/migrate'

// GET /api/invite/[token] — accept an invite (called when user clicks email link)
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await ensureTables()
  const { token } = await params
  const session = await auth()

  const r = await db.execute({ sql: 'SELECT * FROM CollectionMember WHERE inviteToken = ?', args: [token] })
  if (!r.rows.length) return NextResponse.redirect(new URL('/?invite=invalid', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'))

  const member = r.rows[0]
  if (member.status === 'accepted') return NextResponse.redirect(new URL('/?invite=already_accepted', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'))

  // If logged in, bind the userId; otherwise redirect to login/register first
  if (!session?.user?.id) {
    // Check if the invited email has an account
    const userCheck = await db.execute({ sql: 'SELECT id FROM User WHERE email = ?', args: [(member.memberEmail as string).toLowerCase()] })
    const dest = userCheck.rows.length
      ? `/login?next=/api/invite/${token}`
      : `/register?next=/api/invite/${token}`
    return NextResponse.redirect(new URL(dest, process.env.NEXTAUTH_URL ?? 'http://localhost:3000'))
  }

  await db.execute({ sql: 'UPDATE CollectionMember SET status = ?, memberId = ?, inviteToken = NULL WHERE inviteToken = ?', args: ['accepted', session.user.id, token] })
  return NextResponse.redirect(new URL('/?invite=accepted', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'))
}
