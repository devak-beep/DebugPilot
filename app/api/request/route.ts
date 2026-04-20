export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import db, { cuid } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createHash } from 'crypto'

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

  let body: { method: string; url: string; headers?: Record<string, string>; body?: string | null; formData?: { key: string; value: string }[]; digest?: { username: string; password: string } | null }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 }) }

  const { method, url, headers = {}, body: requestBody, formData, digest } = body
  try { new URL(url) } catch { return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 }) }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const start = Date.now()

  try {
    let fetchBody: BodyInit | undefined
    let fetchHeaders: Record<string, string> = { ...headers }

    if (formData && formData.length > 0 && method !== 'GET' && method !== 'HEAD') {
      const fd = new FormData()
      for (const { key, value } of formData.filter(r => r.key.trim())) {
        fd.append(key, value)
      }
      fetchBody = fd
      for (const k of Object.keys(fetchHeaders)) {
        if (k.toLowerCase() === 'content-type' || k.toLowerCase() === 'content-length') {
          delete fetchHeaders[k]
        }
      }
    } else if (method !== 'GET' && method !== 'HEAD' && requestBody) {
      fetchBody = requestBody
      if (!fetchHeaders['Content-Type'] && !fetchHeaders['content-type'])
        fetchHeaders = { 'Content-Type': 'application/json', ...fetchHeaders }
    }

    let externalRes: Response

    if (digest?.username) {
      // Step 1: send without auth to get the 401 + WWW-Authenticate challenge
      const challengeRes = await fetch(url, { method, headers: fetchHeaders, body: fetchBody, signal: controller.signal })
      if (challengeRes.status === 401) {
        const wwwAuth = challengeRes.headers.get('WWW-Authenticate') ?? ''
        const realm = wwwAuth.match(/realm="([^"]+)"/)?.[1] ?? ''
        const nonce = wwwAuth.match(/nonce="([^"]+)"/)?.[1] ?? ''
        const qop   = wwwAuth.match(/qop="?([^",]+)"?/)?.[1] ?? ''
        const opaque = wwwAuth.match(/opaque="([^"]+)"/)?.[1]
        const md5 = (s: string) => createHash('md5').update(s).digest('hex')
        const parsedUrl = new URL(url)
        const uri = parsedUrl.pathname + parsedUrl.search
        const ha1 = md5(`${digest.username}:${realm}:${digest.password}`)
        const ha2 = md5(`${method}:${uri}`)
        let response: string
        let authHeader: string
        if (qop === 'auth') {
          const nc = '00000001'
          const cnonce = Math.random().toString(36).slice(2, 10)
          response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`)
          authHeader = `Digest username="${digest.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", response="${response}"${opaque ? `, opaque="${opaque}"` : ''}`
        } else {
          response = md5(`${ha1}:${nonce}:${ha2}`)
          authHeader = `Digest username="${digest.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"${opaque ? `, opaque="${opaque}"` : ''}`
        }
        externalRes = await fetch(url, { method, headers: { ...fetchHeaders, Authorization: authHeader }, body: fetchBody, signal: controller.signal })
      } else {
        externalRes = challengeRes
      }
    } else {
      externalRes = await fetch(url, { method, headers: fetchHeaders, body: fetchBody, signal: controller.signal })
    }
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
