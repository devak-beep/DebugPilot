export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ exampleId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { exampleId } = await params
  await db.execute({ sql: 'DELETE FROM SavedExample WHERE id = ?', args: [exampleId] })
  return NextResponse.json({ ok: true })
}
