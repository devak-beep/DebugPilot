'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import ConfirmModal from './ConfirmModal'

interface Grant { id: string; requesterId: string; requesterName: string; requesterEmail: string; type: string; targetId: string; targetName: string }
interface Member { id: string; memberEmail: string; role: string; status: string; collectionId: string; collectionName: string }
interface AccessRequest { id: string; requesterName: string; requesterEmail: string; type: string }

export default function SettingsDropdown({ collections, onSignOut }: { collections: { id: string; name: string }[]; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<'requests' | 'members' | 'access' | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{ label: string; onConfirm: () => Promise<void> } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSection(null) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [g, r] = await Promise.all([fetch('/api/share-grants').then(r => r.json()), fetch('/api/share-requests').then(r => r.json())])
    setGrants(Array.isArray(g) ? g : [])
    setAccessRequests(Array.isArray(r) ? r : [])
    const all: Member[] = []
    await Promise.all(collections.map(async col => {
      const d = await fetch(`/api/collections/${col.id}/invite`).then(r => r.json())
      if (Array.isArray(d)) d.forEach((m: Omit<Member, 'collectionId' | 'collectionName'>) => all.push({ ...m, collectionId: col.id, collectionName: col.name }))
    }))
    setMembers(all)
    setLoading(false)
  }, [collections])

  const handleOpen = () => { setOpen(o => !o); setSection(null); if (!open) loadAll() }

  const actOnRequest = async (id: string, status: 'approved' | 'denied') => {
    setActing(true)
    await fetch(`/api/share-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setActing(false)
    setAccessRequests(prev => prev.filter(r => r.id !== id))
    if (status === 'approved') { const g = await fetch('/api/share-grants').then(r => r.json()); setGrants(Array.isArray(g) ? g : []) }
  }

  const revokeGrant = async (g: Grant) => {
    setActing(true)
    await fetch('/api/share-grants', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: g.requesterId, type: g.type, targetId: g.targetId }) })
    setActing(false); setRevokeTarget(null)
    setGrants(prev => prev.filter(x => !(x.requesterId === g.requesterId && x.type === g.type && x.targetId === g.targetId)))
  }

  const removeMember = async (m: Member) => {
    setActing(true)
    await fetch(`/api/collections/${m.collectionId}/invite`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) })
    setActing(false); setRevokeTarget(null)
    setMembers(prev => prev.filter(x => x.id !== m.id))
  }

  const grouped = grants.reduce<Record<string, Grant[]>>((acc, g) => { const k = `${g.type}::${g.targetId}`; if (!acc[k]) acc[k] = []; acc[k].push(g); return acc }, {})
  const membersByCol = members.reduce<Record<string, Member[]>>((acc, m) => { if (!acc[m.collectionId]) acc[m.collectionId] = []; acc[m.collectionId].push(m); return acc }, {})

  const roleBadge = (role: string) => ({ display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', fontSize: '0.6rem', fontWeight: 700, background: role === 'editor' ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)', color: role === 'editor' ? '#60a5fa' : '#4ade80', border: `1px solid ${role === 'editor' ? 'rgba(59,130,246,0.25)' : 'rgba(34,197,94,0.25)'}` })
  const statusBadge = (s: string) => ({ display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', fontSize: '0.6rem', background: s === 'accepted' ? 'rgba(34,197,94,0.08)' : 'rgba(234,179,8,0.08)', color: s === 'accepted' ? '#4ade80' : '#fbbf24' })

  const menuItem = (key: 'requests' | 'members' | 'access', label: string, count?: number) => (
    <button key={key} onClick={() => setSection(section === key ? null : key)}
      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
      style={{ color: section === key ? 'var(--accent)' : 'var(--text-primary)', background: section === key ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        {count !== undefined && count > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-text)', fontSize: '0.6rem' }}>{count}</span>}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{section === key ? '▲' : '▼'}</span>
      </div>
    </button>
  )

  return (
    <>
      <div ref={ref} className="relative">
        <button onClick={handleOpen} title="Settings"
          className="text-sm px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: open ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-input))' : 'var(--bg-input)', color: open ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}` }}>
          ⚙️
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-2xl overflow-hidden"
            style={{ width: '320px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>⚙️ Settings</span>
              {loading && <span className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading…</span>}
            </div>

            {/* Menu items + inline panels */}
            {menuItem('requests', '🔔 Access Requests', accessRequests.length)}
            {section === 'requests' && (
              <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 2%, var(--bg-card))' }}>
                {accessRequests.length === 0 && <p className="text-xs italic text-center py-2" style={{ color: 'var(--text-muted)' }}>No pending requests.</p>}
                {accessRequests.map(r => (
                  <div key={r.id} className="rounded-lg p-2.5 space-y-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.requesterName || r.requesterEmail}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.requesterEmail} · {r.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => actOnRequest(r.id, 'approved')} disabled={acting} className="flex-1 py-1 rounded text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: acting ? 0.6 : 1 }}>✓ Approve</button>
                      <button onClick={() => actOnRequest(r.id, 'denied')} disabled={acting} className="flex-1 py-1 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', opacity: acting ? 0.6 : 1 }}>✕ Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {menuItem('members', '👥 Invited Members')}
            {section === 'members' && (
              <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 2%, var(--bg-card))' }}>
                {members.length === 0 && <p className="text-xs italic text-center py-2" style={{ color: 'var(--text-muted)' }}>No invites sent yet.</p>}
                {Object.entries(membersByCol).map(([colId, items]) => (
                  <div key={colId} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="px-3 py-1.5 text-xs font-bold truncate" style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>📁 {items[0].collectionName}</div>
                    {items.map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{m.memberEmail}</p>
                          <div className="flex gap-1 mt-0.5"><span style={roleBadge(m.role)}>{m.role}</span><span style={statusBadge(m.status)}>{m.status}</span></div>
                        </div>
                        <button onClick={() => setRevokeTarget({ label: `Remove ${m.memberEmail} from "${m.collectionName}"?`, onConfirm: () => removeMember(m) })} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {menuItem('access', '🔑 Approved Access')}
            {section === 'access' && (
              <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 2%, var(--bg-card))' }}>
                {grants.length === 0 && <p className="text-xs italic text-center py-2" style={{ color: 'var(--text-muted)' }}>No approved access yet.</p>}
                {Object.entries(grouped).map(([key, items]) => (
                  <div key={key} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="px-3 py-1.5 text-xs font-bold truncate" style={{ background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-card))', color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>{items[0].type === 'collection' ? '📁' : '🗂'} {items[0].targetName}</div>
                    {items.map(g => (
                      <div key={g.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{g.requesterName || g.requesterEmail}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.requesterEmail}</p>
                        </div>
                        <button onClick={() => setRevokeTarget({ label: `Revoke access for ${g.requesterEmail} from "${g.targetName}"?`, onConfirm: () => revokeGrant(g) })} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Revoke</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Sign Out */}
            <button
              onClick={() => { setOpen(false); setSection(null); onSignOut() }}
              className="w-full px-4 py-2.5 text-xs font-semibold text-left transition-all"
              style={{ color: '#f87171', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}>
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>

      {revokeTarget && (
        <ConfirmModal title="Confirm" message={revokeTarget.label} confirmLabel="Yes, Remove" cancelLabel="Cancel" danger
          onConfirm={async () => { await revokeTarget.onConfirm() }}
          onCancel={() => setRevokeTarget(null)} />
      )}
    </>
  )
}
