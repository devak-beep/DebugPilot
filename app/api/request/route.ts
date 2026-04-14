export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { method: string; url: string; headers?: Record<string, string>; body?: string | null; formData?: { key: string; value: string }[] }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 }) }

  const { method, url, headers = {}, body: requestBody, formData } = body

  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  try { new URL(url) } catch { return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 }) }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const start = Date.now()

  try {
    let fetchBody: BodyInit | undefined = undefined
    let fetchHeaders = { ...headers }

    if (formData && formData.length > 0 && method !== 'GET' && method !== 'HEAD') {
      const fd = new FormData()
      formData.filter(r => r.key.trim()).forEach(({ key, value }) => fd.append(key, value))
      fetchBody = fd
      // Let fetch set Content-Type with boundary automatically
      delete fetchHeaders['Content-Type']
      delete fetchHeaders['content-type']
    } else if (method !== 'GET' && method !== 'HEAD' && requestBody) {
      fetchBody = requestBody
      // Use caller-supplied Content-Type if present, otherwise default to application/json
      if (!fetchHeaders['Content-Type'] && !fetchHeaders['content-type']) {
        fetchHeaders = { 'Content-Type': 'application/json', ...fetchHeaders }
      }
    }

    const externalRes = await fetch(url, {
      method, headers: fetchHeaders, body: fetchBody, signal: controller.signal,
    })
    clearTimeout(timeout)
    const timeTaken = Date.now() - start
    const rawText = await externalRes.text()
    let parsedResponse: unknown = rawText
    try { parsedResponse = JSON.parse(rawText) } catch {}

    const responseToStore = typeof parsedResponse === 'string' ? parsedResponse : JSON.stringify(parsedResponse)

    const entry = await prisma.requestHistory.create({
      data: { userId, method, url, headers: JSON.stringify(headers), body: requestBody ?? null,
        status: externalRes.status, statusText: externalRes.statusText || 'OK', response: responseToStore, timeTaken },
    })

    // Keep only latest 20 per user
    const oldest = await prisma.requestHistory.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, skip: 20, select: { id: true },
    })
    if (oldest.length > 0) await prisma.requestHistory.deleteMany({ where: { id: { in: oldest.map((r) => r.id) } } })

    return NextResponse.json({ id: entry.id, status: externalRes.status, statusText: externalRes.statusText || 'OK', body: parsedResponse, timeTaken })
  } catch (err: unknown) {
    clearTimeout(timeout)
    const timeTaken = Date.now() - start
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    const errorMessage = isTimeout ? 'Request timed out after 10 seconds' : err instanceof Error ? err.message : 'Unknown error occurred'

    await prisma.requestHistory.create({
      data: { userId, method, url, headers: JSON.stringify(headers), body: requestBody ?? null,
        status: isTimeout ? 408 : 0, statusText: isTimeout ? 'Timeout' : 'Network Error',
        response: JSON.stringify({ error: errorMessage }), timeTaken },
    })

    const oldest = await prisma.requestHistory.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, skip: 20, select: { id: true },
    })
    if (oldest.length > 0) await prisma.requestHistory.deleteMany({ where: { id: { in: oldest.map((r) => r.id) } } })

    return NextResponse.json({ error: errorMessage, status: isTimeout ? 408 : 0, statusText: isTimeout ? 'Timeout' : 'Network Error', timeTaken })
  }
}
