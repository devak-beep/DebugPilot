'use client'
import { useState } from 'react'

interface Props {
  type: 'folder' | 'collection'
  targetId: string
  targetName: string
  onClose: () => void
}

type Tab = 'link' | 'invite'
type Visibility = 'public' | 'request_required'
type Role = 'viewer' | 'editor'

export default function ShareFolderCollectionModal({ type, targetId, targetName, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('link')

  // Link tab state
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [token, setToken] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteDone, setInviteDone] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const generate = async () => {
    setGenerating(true)
    const res = await fetch('/api/share-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, targetId, visibility }) })
    const data = await res.json()
    setGenerating(false)
    if (data.token) setToken(data.token)
  }

  const revoke = async () => {
    if (!token) return
    setRevoking(true)
    await fetch(`/api/share-links/${token}`, { method: 'DELETE' })
    setRevoking(false)
    setToken(null)
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteError(''); setInviteDone(false)
    const res = await fetch(`/api/collections/${targetId}/invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    setInviting(false)
    if (res.ok) { setInviteDone(true); setInviteEmail('') }
    else { const d = await res.json(); setInviteError(d.error ?? 'Failed to send invite') }
  }

  const shareUrl = token ? `${window.location.origin}/share-v2/${token}` : ''
  const copy = async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none'
  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const btnBase = 'flex-1 py-2 text-xs font-semibold transition-colors'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>🔗 Share {type === 'collection' ? 'Collection' : 'Folder'}</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{type === 'collection' ? '📁' : '🗂'} {targetName}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['link', 'invite'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={btnBase}
              style={{ borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--accent)' : 'var(--text-muted)', background: 'transparent', padding: '0.6rem' }}>
              {t === 'link' ? '🔗 Share Link' : '📩 Invite by Email'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'link' && (
            <>
              {/* Visibility */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Access Mode</p>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {(['public', 'request_required'] as Visibility[]).map(v => (
                    <button key={v} onClick={() => { setVisibility(v); setToken(null) }} className={btnBase}
                      style={{ background: visibility === v ? 'var(--accent)' : 'var(--bg-input)', color: visibility === v ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                      {v === 'public' ? '🌐 Public' : '🔒 Private'}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  {visibility === 'public' ? 'Anyone with the link can view and import — no login needed.' : 'Only people you approve or invite can access this.'}
                </p>
              </div>

              {!token ? (
                <button onClick={generate} disabled={generating} className="w-full py-2.5 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: generating ? 0.7 : 1 }}>
                  {generating ? 'Generating…' : 'Generate Share Link'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input readOnly value={shareUrl} className={inputCls} style={inputStyle} onClick={e => (e.target as HTMLInputElement).select()} />
                    <button onClick={copy} className="px-3 py-2 rounded-lg text-xs font-bold shrink-0"
                      style={{ background: copied ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--accent)', color: copied ? 'var(--accent)' : 'var(--accent-text)', border: copied ? '1px solid var(--accent)' : 'none' }}>
                      {copied ? '✓' : 'Copy'}
                    </button>
                  </div>
                  <button onClick={revoke} disabled={revoking} className="w-full py-2 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', opacity: revoking ? 0.6 : 1 }}>
                    {revoking ? 'Revoking…' : '🗑 Revoke Link'}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'invite' && (
            <>
              {type !== 'collection' && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(234,179,8,0.08)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
                  ⚠️ Email invites are only available for collections. Share a link for folders.
                </p>
              )}
              {type === 'collection' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Email address</label>
                      <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteDone(false); setInviteError('') }}
                        onKeyDown={e => e.key === 'Enter' && sendInvite()}
                        placeholder="colleague@example.com"
                        className={inputCls} style={{ ...inputStyle, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
                      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        {(['viewer', 'editor'] as Role[]).map(r => (
                          <button key={r} onClick={() => setInviteRole(r)} className={btnBase}
                            style={{ background: inviteRole === r ? 'var(--accent)' : 'var(--bg-input)', color: inviteRole === r ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                            {r === 'viewer' ? '👁 Viewer' : '✏️ Editor'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        {inviteRole === 'viewer' ? 'Can view and import requests. Cannot modify.' : 'Can view, import, and modify requests in this collection.'}
                      </p>
                    </div>
                  </div>

                  {inviteError && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>{inviteError}</p>}
                  {inviteDone && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>✅ Invite sent to {inviteEmail || 'them'}!</p>}

                  <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} className="w-full py-2.5 rounded-lg text-sm font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: inviting || !inviteEmail.trim() ? 0.6 : 1 }}>
                    {inviting ? 'Sending…' : '📩 Send Invite'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
