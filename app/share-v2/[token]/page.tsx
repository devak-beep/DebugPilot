'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Status = 'loading' | 'login_required' | 'access_required' | 'pending' | 'ready' | 'error'

interface ShareData {
  type: 'folder' | 'collection'
  visibility: string
  collection?: { name: string }
  folder?: { name: string }
  folders?: { id: string; name: string }[]
  requests?: { id: string; name: string; method: string; url: string }[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e', POST: '#3b82f6', PUT: '#eab308',
  PATCH: '#a855f7', DELETE: '#ef4444', HEAD: '#6b7280', OPTIONS: '#6b7280',
}

export default function ShareV2Page() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<ShareData | null>(null)
  const [linkId, setLinkId] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])
  const [selectedColId, setSelectedColId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/share-links/${token}`)
      .then(async (res) => {
        const json = await res.json()
        if (res.ok) { setData(json); setStatus('ready') }
        else if (json.error === 'login_required') setStatus('login_required')
        else if (json.error === 'access_required') {
          setLinkId(json.linkId)
          setStatus(json.hasPendingRequest ? 'pending' : 'access_required')
        }
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  const requestAccess = async () => {
    setRequesting(true)
    await fetch('/api/share-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkId }) })
    setRequesting(false)
    setStatus('pending')
  }

  const startImport = async () => {
    if (data?.type === 'collection') {
      doImport(null)
    } else {
      // Fetch user's collections to pick from
      const res = await fetch('/api/collections')
      const cols = await res.json()
      setCollections(Array.isArray(cols) ? cols.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : [])
      setSelectedColId(cols[0]?.id ?? '')
      setShowCollectionPicker(true)
    }
  }

  const doImport = async (collectionId: string | null) => {
    setImporting(true)
    setShowCollectionPicker(false)
    const body = collectionId ? { collectionId } : {}
    const res = await fetch(`/api/share-links/${token}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setImporting(false)
    if (res.ok) setImportDone(true)
    else { const j = await res.json(); setError(j.error ?? 'Import failed') }
  }

  const s = { minHeight: '100vh', background: '#0f1f14', color: '#dcfce7', fontFamily: 'monospace', padding: '2rem' }
  const card = { maxWidth: '700px', margin: '0 auto' }
  const badge = (color: string) => ({ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.7rem', fontWeight: 'bold', background: `${color}22`, color, border: `1px solid ${color}44` })
  const btn = (bg: string, color = '#fff') => ({ padding: '0.5rem 1.4rem', background: bg, color, borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' })

  if (status === 'loading') return <div style={s}><div style={card}><p style={{ color: '#4ade80' }}>Loading…</p></div></div>

  if (status === 'login_required') return (
    <div style={s}><div style={card}>
      <p style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.75rem' }}>DebugPilot · Shared Link</p>
      <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🔒 Login Required</h1>
      <p style={{ color: '#86efac', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This link requires you to be logged in to request access.</p>
      <button style={btn('#16a34a')} onClick={() => router.push(`/login?next=/share-v2/${token}`)}>Sign In</button>
    </div></div>
  )

  if (status === 'access_required') return (
    <div style={s}><div style={card}>
      <p style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.75rem' }}>DebugPilot · Shared Link</p>
      <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🔒 Access Required</h1>
      <p style={{ color: '#86efac', marginBottom: '1.5rem', fontSize: '0.9rem' }}>You need the owner's approval to view this content.</p>
      <button style={btn('#16a34a')} onClick={requestAccess} disabled={requesting}>
        {requesting ? 'Sending…' : '📨 Request Access'}
      </button>
    </div></div>
  )

  if (status === 'pending') return (
    <div style={s}><div style={card}>
      <p style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.75rem' }}>DebugPilot · Shared Link</p>
      <h1 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>⏳ Request Pending</h1>
      <p style={{ color: '#86efac', fontSize: '0.9rem' }}>Your access request has been sent. You'll be able to view this once the owner approves it.</p>
    </div></div>
  )

  if (status === 'error') return (
    <div style={s}><div style={card}>
      <h1 style={{ fontSize: '1.2rem' }}>❌ Link not found or expired.</h1>
    </div></div>
  )

  if (!data) return null

  const title = data.type === 'collection' ? data.collection?.name : data.folder?.name
  const requestCount = data.requests?.length ?? 0
  const folderCount = data.folders?.length ?? 0

  return (
    <div style={s}>
      <div style={card}>
        <p style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '0.75rem' }}>DebugPilot · Shared {data.type === 'collection' ? 'Collection' : 'Folder'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{data.type === 'collection' ? '📁' : '🗂'} {title}</h1>
          <span style={badge('#4ade80')}>{data.type}</span>
          {data.visibility === 'request_required' && <span style={badge('#f59e0b')}>🔒 restricted</span>}
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#4ade80' }}>{requestCount} request{requestCount !== 1 ? 's' : ''}{data.type === 'collection' ? `, ${folderCount} folder${folderCount !== 1 ? 's' : ''}` : ''}</span>
        </div>

        {importDone ? (
          <div style={{ padding: '0.75rem 1rem', background: '#14532d', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#86efac', fontSize: '0.85rem' }}>
            ✅ Imported successfully! <button style={{ ...btn('transparent', '#4ade80'), padding: '0 0.5rem', textDecoration: 'underline' }} onClick={() => router.push('/')}>Open DebugPilot →</button>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            {error && <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</p>}
            <button style={btn('#16a34a')} onClick={startImport} disabled={importing}>
              {importing ? 'Importing…' : `⬇ Import ${data.type === 'collection' ? 'Collection' : 'Folder'} to DebugPilot`}
            </button>
          </div>
        )}

        {/* Collection picker modal for folder import */}
        {showCollectionPicker && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: '#0f1f14', border: '1px solid #166534', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '360px' }}>
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📁 Choose a Collection</h2>
              <p style={{ fontSize: '0.8rem', color: '#86efac', marginBottom: '1rem' }}>Where should this folder be imported?</p>
              {collections.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#f87171' }}>You have no collections. Create one in DebugPilot first.</p>
              ) : (
                <select value={selectedColId} onChange={e => setSelectedColId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', background: '#0a1a0e', border: '1px solid #166534', color: '#dcfce7', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button style={{ ...btn('#1f2937', '#9ca3af'), flex: 1 }} onClick={() => setShowCollectionPicker(false)}>Cancel</button>
                <button style={{ ...btn('#16a34a'), flex: 1 }} disabled={!selectedColId} onClick={() => doImport(selectedColId)}>Import Here</button>
              </div>
            </div>
          </div>
        )}

        {/* Requests list */}
        {data.type === 'collection' && data.folders && data.folders.length > 0 && (
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.5rem' }}>Folders</h2>
            {data.folders.map(f => (
              <div key={f.id} style={{ padding: '0.4rem 0.75rem', background: '#0a1a0e', border: '1px solid #166534', borderRadius: '0.4rem', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#86efac' }}>
                🗂 {f.name}
              </div>
            ))}
          </section>
        )}

        {data.requests && data.requests.length > 0 && (
          <section>
            <h2 style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: '0.5rem' }}>Requests</h2>
            {data.requests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: '#0a1a0e', border: '1px solid #166534', borderRadius: '0.4rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem', minWidth: '52px', color: METHOD_COLORS[r.method] ?? '#9ca3af' }}>{r.method}</span>
                <span style={{ fontSize: '0.8rem', color: '#86efac', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontSize: '0.7rem', color: '#4ade80', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{r.url}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
