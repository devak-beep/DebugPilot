'use client'
import { useEffect, useState, useCallback } from 'react'

interface AccessRequest {
  id: string
  requesterName: string
  requesterEmail: string
  type: string
  targetId: string
  token: string
  createdAt: string
}

export default function AccessRequestsPanel({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/share-requests')
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, status: 'approved' | 'denied') => {
    setActing(id)
    await fetch(`/api/share-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setActing(null)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>🔔 Access Requests</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {loading && <p className="text-xs text-center py-4 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
          {!loading && requests.length === 0 && <p className="text-xs text-center py-4 italic" style={{ color: 'var(--text-muted)' }}>No pending requests.</p>}
          {requests.map(r => (
            <div key={r.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.requesterName || r.requesterEmail}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.requesterEmail}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Wants access to your shared <strong>{r.type}</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(r.id, 'approved')} disabled={acting === r.id}
                  className="flex-1 py-1.5 rounded text-xs font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: acting === r.id ? 0.6 : 1 }}>
                  ✓ Approve
                </button>
                <button onClick={() => act(r.id, 'denied')} disabled={acting === r.id}
                  className="flex-1 py-1.5 rounded text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', opacity: acting === r.id ? 0.6 : 1 }}>
                  ✕ Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
