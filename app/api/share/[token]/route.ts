export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE shareToken = ? AND isPublic = 1', args: [token] })
  if (!r.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const req = r.rows[0]
  let headers: Record<string, string> = {}
  try { headers = JSON.parse(req.headers as string) } catch {}
  return NextResponse.json({ name: req.name, method: req.method, url: req.url, headers, body: req.body })
}
