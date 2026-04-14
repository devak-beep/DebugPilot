export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      folders: { orderBy: { createdAt: 'asc' }, include: { requests: { orderBy: { createdAt: 'asc' }, include: { examples: { orderBy: { createdAt: 'asc' } } } } } },
      requests: { where: { folderId: null }, orderBy: { createdAt: 'asc' }, include: { examples: { orderBy: { createdAt: 'asc' } } } },
    },
  })
  return NextResponse.json(collections)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const collection = await prisma.collection.create({ data: { name: name.trim(), userId: session.user.id } })
    return NextResponse.json({ ...collection, folders: [], requests: [] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
