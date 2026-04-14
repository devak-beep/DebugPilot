import db from '@/lib/db'
import { notFound } from 'next/navigation'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await db.execute({ sql: 'SELECT * FROM SavedRequest WHERE shareToken = ? AND isPublic = 1', args: [token] })
  if (!r.rows.length) notFound()
  const req = r.rows[0]

  const exR = await db.execute({ sql: 'SELECT * FROM SavedExample WHERE savedRequestId = ? ORDER BY createdAt ASC', args: [req.id as string] })
  const examples = exR.rows

  let headers: Record<string, string> = {}
  try { headers = JSON.parse(req.headers as string) } catch {}

  const methodColors: Record<string, string> = {
    GET: '#22c55e', POST: '#3b82f6', PUT: '#eab308',
    PATCH: '#a855f7', DELETE: '#ef4444', HEAD: '#6b7280', OPTIONS: '#6b7280',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1f14', color: '#dcfce7', fontFamily: 'monospace', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#4ade80', marginBottom: '0.5rem' }}>DebugPilot · Shared Request</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dcfce7', marginBottom: '0.5rem' }}>{req.name as string}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 'bold', color: methodColors[req.method as string] ?? '#9ca3af' }}>{req.method as string}</span>
            <span style={{ color: '#86efac', wordBreak: 'break-all' }}>{req.url as string}</span>
          </div>
        </div>

        {Object.keys(headers).length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.75rem' }}>Headers</h2>
            <div style={{ background: '#0a1a0e', border: '1px solid #166534', borderRadius: '0.5rem', overflow: 'hidden' }}>
              {Object.entries(headers).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem', borderBottom: '1px solid #166534' }}>
                  <span style={{ color: '#22c55e', minWidth: '200px' }}>{k}</span>
                  <span style={{ color: '#86efac', wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {req.body && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.75rem' }}>Body</h2>
            <pre style={{ background: '#0a0a0a', border: '1px solid #166534', borderRadius: '0.5rem', padding: '1rem', overflow: 'auto', color: '#d1d5db', fontSize: '0.875rem' }}>
              {(() => { try { return JSON.stringify(JSON.parse(req.body as string), null, 2) } catch { return req.body as string } })()}
            </pre>
          </section>
        )}

        {examples.length > 0 && (
          <section>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.75rem' }}>Saved Responses</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {examples.map(ex => (
                <div key={ex.id as string} style={{ background: '#0a1a0e', border: '1px solid #166534', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid #166534' }}>
                    <span style={{ fontWeight: 'bold', color: (ex.status as number) < 300 ? '#22c55e' : (ex.status as number) < 500 ? '#ea580c' : '#ef4444' }}>{ex.status as number} {ex.statusText as string}</span>
                    <span style={{ color: '#86efac' }}>{ex.name as string}</span>
                    <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: '0.75rem' }}>{ex.timeTaken as number}ms</span>
                  </div>
                  <pre style={{ padding: '1rem', overflow: 'auto', color: '#d1d5db', fontSize: '0.875rem', margin: 0 }}>
                    {(() => { try { return JSON.stringify(JSON.parse(ex.response as string), null, 2) } catch { return ex.response as string } })()}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
