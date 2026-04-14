import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, method, url, headers, body, collectionId, folderId } = await req.json()
  if (!name?.trim() || !collectionId) return NextResponse.json({ error: 'name and collectionId required' }, { status: 400 })
  const saved = await prisma.savedRequest.create({
    data: { userId: session.user.id, name: name.trim(), method, url, headers: JSON.stringify(headers ?? {}), body: body ?? null, collectionId, folderId: folderId ?? null },
  })
  return NextResponse.json(saved)
}
