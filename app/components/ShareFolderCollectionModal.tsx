'use client'
import { useState } from 'react'

interface Props {
  type: 'folder' | 'collection'
  targetId: string
  targetName: string
  onClose: () => void
}

export default function ShareFolderCollectionModal({ type, targetId, targetName, onClose }: Props) {
  const [visibility, setVisibility] = useState<'public' | 'request_required'>('public')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const generate = async () => {
    setLoading(true)
    const res = await fetch('/api/share-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, targetId, visibility }) })
    const data = await res.json()
    setLoading(false)
    if (data.token) setToken(data.token)
  }

  const revoke = async () => {
    if (!token) return
    setRevoking(true)
    await fetch(`/api/share-links/${token}`, { method: 'DELETE' })
    setRevoking(false)
    setToken(null)
  }

  const shareUrl = token ? `${window.location.origin}/share-v2/${token}` : ''

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none'
  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>🔗 Share {type === 'collection' ? 'Collection' : 'Folder'}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{type === 'collection' ? '📁' : '🗂'} {targetName}</span>
          </p>

          {/* Visibility toggle */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Access Mode</p>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['public', 'request_required'] as const).map(v => (
                <button key={v} onClick={() => { setVisibility(v); setToken(null) }}
                  className="flex-1 py-2 text-xs font-semibold transition-colors"
                  style={{ background: visibility === v ? 'var(--accent)' : 'var(--bg-input)', color: visibility === v ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                  {v === 'public' ? '🌐 Public' : '🔒 Approval Required'}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {visibility === 'public' ? 'Anyone with the link can view and import.' : 'Viewers must request access. You approve or deny each request.'}
            </p>
          </div>

          {!token ? (
            <button onClick={generate} disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating…' : 'Generate Share Link'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className={inputCls} style={inputStyle} onClick={e => (e.target as HTMLInputElement).select()} />
                <button onClick={copy}
                  className="px-3 py-2 rounded-lg text-xs font-bold shrink-0"
                  style={{ background: copied ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--accent)', color: copied ? 'var(--accent)' : 'var(--accent-text)', border: copied ? '1px solid var(--accent)' : 'none' }}>
                  {copied ? '✓' : 'Copy'}
                </button>
              </div>
              <button onClick={revoke} disabled={revoking}
                className="w-full py-2 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', opacity: revoking ? 0.6 : 1 }}>
                {revoking ? 'Revoking…' : '🗑 Revoke Link'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
