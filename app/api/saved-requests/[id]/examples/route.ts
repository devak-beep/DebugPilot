export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const examples = await prisma.savedExample.findMany({
    where: { savedRequestId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(examples)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const { name, status, statusText, response, timeTaken } = await req.json()
    const example = await prisma.savedExample.create({
      data: { savedRequestId: id, name, status: Number(status), statusText, response: String(response), timeTaken: Number(timeTaken) },
    })
    return NextResponse.json(example)
  } catch (err) {
    console.error('saveExample error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
