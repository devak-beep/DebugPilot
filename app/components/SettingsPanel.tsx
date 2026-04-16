'use client'
import { useEffect, useState, useCallback } from 'react'
import ConfirmModal from './ConfirmModal'

interface Grant {
  id: string
  requesterId: string
  requesterName: string
  requesterEmail: string
  type: string
  targetId: string
  targetName: string
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<Grant | null>(null)
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/share-grants')
    const data = await res.json()
    setGrants(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const revoke = async (g: Grant) => {
    setRevoking(true)
    await fetch('/api/share-grants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: g.requesterId, type: g.type, targetId: g.targetId }),
    })
    setRevoking(false)
    setRevokeTarget(null)
    setGrants(prev => prev.filter(x => !(x.requesterId === g.requesterId && x.type === g.type && x.targetId === g.targetId)))
  }

  // Group grants by targetName for readability
  const grouped = grants.reduce<Record<string, Grant[]>>((acc, g) => {
    const key = `${g.type}::${g.targetId}`
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {})

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
        <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>⚙️ Settings · Shared Access</h2>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              People you've approved access to. You can revoke access at any time.
            </p>

            {loading && <p className="text-xs text-center py-6 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</p>}
            {!loading && grants.length === 0 && (
              <p className="text-xs text-center py-6 italic" style={{ color: 'var(--text-muted)' }}>No access grants yet.</p>
            )}

            {Object.entries(grouped).map(([key, items]) => {
              const first = items[0]
              return (
                <div key={key} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {/* Target header */}
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', borderBottom: '1px solid var(--border)' }}>
                    <span className="text-xs">{first.type === 'collection' ? '📁' : '🗂'}</span>
                    <span className="text-xs font-bold flex-1 truncate" style={{ color: 'var(--accent)' }}>{first.targetName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', fontSize: '0.65rem' }}>{first.type}</span>
                  </div>

                  {/* People with access */}
                  {items.map(g => (
                    <div key={g.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{g.requesterName || g.requesterEmail}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.requesterEmail}</p>
                      </div>
                      <button
                        onClick={() => setRevokeTarget(g)}
                        className="shrink-0 text-xs px-2.5 py-1 rounded font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {revokeTarget && (
        <ConfirmModal
          title="Revoke Access"
          message={`Remove access for ${revokeTarget.requesterName || revokeTarget.requesterEmail} from "${revokeTarget.targetName}"? They will need to request access again.`}
          confirmLabel="Yes, Revoke"
          cancelLabel="Cancel"
          danger
          onConfirm={() => revoke(revokeTarget)}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </>
  )
}
