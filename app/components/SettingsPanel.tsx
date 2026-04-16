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

interface Member {
  id: string
  memberEmail: string
  role: string
  status: string
  collectionId: string
  collectionName: string
}

type SettingsTab = 'access' | 'members'

export default function SettingsPanel({ onClose, collections }: { onClose: () => void; collections: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<SettingsTab>('members')
  const [grants, setGrants] = useState<Grant[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<{ label: string; onConfirm: () => Promise<void> } | null>(null)
  const [acting, setActing] = useState(false)

  const loadGrants = useCallback(async () => {
    const res = await fetch('/api/share-grants')
    const data = await res.json()
    setGrants(Array.isArray(data) ? data : [])
  }, [])

  const loadMembers = useCallback(async () => {
    const all: Member[] = []
    await Promise.all(collections.map(async col => {
      const res = await fetch(`/api/collections/${col.id}/invite`)
      const data = await res.json()
      if (Array.isArray(data)) data.forEach((m: Omit<Member, 'collectionId' | 'collectionName'>) => all.push({ ...m, collectionId: col.id, collectionName: col.name }))
    }))
    setMembers(all)
  }, [collections])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadGrants(), loadMembers()]).finally(() => setLoading(false))
  }, [loadGrants, loadMembers])

  const revokeGrant = async (g: Grant) => {
    setActing(true)
    await fetch('/api/share-grants', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: g.requesterId, type: g.type, targetId: g.targetId }) })
    setActing(false)
    setRevokeTarget(null)
    setGrants(prev => prev.filter(x => !(x.requesterId === g.requesterId && x.type === g.type && x.targetId === g.targetId)))
  }

  const removeMember = async (m: Member) => {
    setActing(true)
    await fetch(`/api/collections/${m.collectionId}/invite`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) })
    setActing(false)
    setRevokeTarget(null)
    setMembers(prev => prev.filter(x => x.id !== m.id))
  }

  const grouped = grants.reduce<Record<string, Grant[]>>((acc, g) => {
    const key = `${g.type}::${g.targetId}`; if (!acc[key]) acc[key] = []; acc[key].push(g); return acc
  }, {})

  const membersByCol = members.reduce<Record<string, Member[]>>((acc, m) => {
    if (!acc[m.collectionId]) acc[m.collectionId] = []; acc[m.collectionId].push(m); return acc
  }, {})

  const roleBadge = (role: string) => ({
    display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.65rem', fontWeight: 700,
    background: role === 'editor' ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
    color: role === 'editor' ? '#60a5fa' : '#4ade80',
    border: `1px solid ${role === 'editor' ? 'rgba(59,130,246,0.25)' : 'rgba(34,197,94,0.25)'}`,
  })

  const statusBadge = (status: string) => ({
    display: 'inline-block', padding: '0.1rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.65rem',
    background: status === 'accepted' ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)',
    color: status === 'accepted' ? '#4ade80' : '#fbbf24',
  })

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
        <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>⚙️ Settings</h2>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>

          {/* Sub-tabs */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            {(['members', 'access'] as SettingsTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                style={{ borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--accent)' : 'var(--text-muted)', background: 'transparent' }}>
                {t === 'members' ? '👥 Invited Members' : '🔑 Approved Access'}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
            {loading && <p className="text-xs text-center py-6 animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</p>}

            {/* Invited Members tab */}
            {!loading && tab === 'members' && (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>People you've invited via email. Pending = invite not yet accepted.</p>
                {members.length === 0 && <p className="text-xs text-center py-4 italic" style={{ color: 'var(--text-muted)' }}>No invites sent yet.</p>}
                {Object.entries(membersByCol).map(([colId, items]) => (
                  <div key={colId} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', borderBottom: '1px solid var(--border)' }}>
                      <span className="text-xs">📁</span>
                      <span className="text-xs font-bold flex-1 truncate" style={{ color: 'var(--accent)' }}>{items[0].collectionName}</span>
                    </div>
                    {items.map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.memberEmail}</p>
                          <div className="flex gap-1.5">
                            <span style={roleBadge(m.role)}>{m.role}</span>
                            <span style={statusBadge(m.status)}>{m.status}</span>
                          </div>
                        </div>
                        <button onClick={() => setRevokeTarget({ label: `Remove ${m.memberEmail} from "${m.collectionName}"?`, onConfirm: () => removeMember(m) })}
                          className="shrink-0 text-xs px-2.5 py-1 rounded font-medium"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Approved Access tab */}
            {!loading && tab === 'access' && (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>People who requested and were approved via share links.</p>
                {grants.length === 0 && <p className="text-xs text-center py-4 italic" style={{ color: 'var(--text-muted)' }}>No approved requests yet.</p>}
                {Object.entries(grouped).map(([key, items]) => {
                  const first = items[0]
                  return (
                    <div key={key} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', borderBottom: '1px solid var(--border)' }}>
                        <span className="text-xs">{first.type === 'collection' ? '📁' : '🗂'}</span>
                        <span className="text-xs font-bold flex-1 truncate" style={{ color: 'var(--accent)' }}>{first.targetName}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{first.type}</span>
                      </div>
                      {items.map(g => (
                        <div key={g.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{g.requesterName || g.requesterEmail}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.requesterEmail}</p>
                          </div>
                          <button onClick={() => setRevokeTarget({ label: `Revoke access for ${g.requesterEmail} from "${g.targetName}"?`, onConfirm: () => revokeGrant(g) })}
                            className="shrink-0 text-xs px-2.5 py-1 rounded font-medium"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {revokeTarget && (
        <ConfirmModal
          title="Confirm Removal"
          message={revokeTarget.label}
          confirmLabel="Yes, Remove"
          cancelLabel="Cancel"
          danger
          onConfirm={async () => { await revokeTarget.onConfirm() }}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </>
  )
}
