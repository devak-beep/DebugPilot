export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'

async function saveHistory(userId: string, method: string, url: string, headers: Record<string, string>, body: string | null, status: number, statusText: string, response: string, timeTaken: number) {
  const id = cuid()
  await db.execute({ sql: 'INSERT INTO RequestHistory (id, userId, method, url, headers, body, status, statusText, response, timeTaken, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: [id, userId, method, url, JSON.stringify(headers), body ?? null, status, statusText, response, timeTaken, new Date().toISOString()] })
  // Keep only latest 20
  const all = await db.execute({ sql: 'SELECT id FROM RequestHistory WHERE userId = ? ORDER BY createdAt DESC', args: [userId] })
  if (all.rows.length > 20) {
    const toDelete = all.rows.slice(20).map(r => r.id as string)
    for (const did of toDelete) await db.execute({ sql: 'DELETE FROM RequestHistory WHERE id = ?', args: [did] })
  }
  return id
}

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
    let fetchBody: BodyInit | undefined
    let fetchHeaders = { ...headers }

    if (formData && formData.length > 0 && method !== 'GET' && method !== 'HEAD') {
      const fd = new FormData()
      formData.filter(r => r.key.trim()).forEach(({ key, value }) => fd.append(key, value))
      fetchBody = fd
      delete fetchHeaders['Content-Type']; delete fetchHeaders['content-type']
    } else if (method !== 'GET' && method !== 'HEAD' && requestBody) {
      fetchBody = requestBody
      if (!fetchHeaders['Content-Type'] && !fetchHeaders['content-type'])
        fetchHeaders = { 'Content-Type': 'application/json', ...fetchHeaders }
    }

    const externalRes = await fetch(url, { method, headers: fetchHeaders, body: fetchBody, signal: controller.signal })
    clearTimeout(timeout)
    const timeTaken = Date.now() - start
    const rawText = await externalRes.text()
    let parsedResponse: unknown = rawText
    try { parsedResponse = JSON.parse(rawText) } catch {}
    const responseToStore = typeof parsedResponse === 'string' ? parsedResponse : JSON.stringify(parsedResponse)
    const id = await saveHistory(userId, method, url, headers, requestBody ?? null, externalRes.status, externalRes.statusText || 'OK', responseToStore, timeTaken)
    return NextResponse.json({ id, status: externalRes.status, statusText: externalRes.statusText || 'OK', body: parsedResponse, timeTaken })
  } catch (err: unknown) {
    clearTimeout(timeout)
    const timeTaken = Date.now() - start
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    const errorMessage = isTimeout ? 'Request timed out after 10 seconds' : err instanceof Error ? err.message : 'Unknown error'
    await saveHistory(userId, method, url, headers, requestBody ?? null, isTimeout ? 408 : 0, isTimeout ? 'Timeout' : 'Network Error', JSON.stringify({ error: errorMessage }), timeTaken)
    return NextResponse.json({ error: errorMessage, status: isTimeout ? 408 : 0, statusText: isTimeout ? 'Timeout' : 'Network Error', timeTaken })
  }
}
