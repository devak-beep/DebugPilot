'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import PasswordInput from './PasswordInput'
import { validatePassword } from '@/lib/password'

type Section = 'name' | 'email' | 'password'

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { data: session, update } = useSession()
  const [section, setSection] = useState<Section>('name')

  const [name, setName] = useState(session?.user?.name ?? '')
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input')
  const [emailTimer, setEmailTimer] = useState(0)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const startEmailTimer = () => {
    setEmailTimer(60)
    const iv = setInterval(() => setEmailTimer(t => { if (t <= 1) { clearInterval(iv); return 0 } return t - 1 }), 1000)
  }

  const saveName = async () => {
    reset(); setLoading(true)
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'name', name }) })
    const d = await res.json(); setLoading(false)
    if (!res.ok) { setError(d.error); return }
    await update({ name })
    setSuccess('Name updated successfully.')
  }

  const sendEmailOtp = async () => {
    reset(); setLoading(true)
    const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newEmail, purpose: 'email_change' }) })
    const d = await res.json(); setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setEmailStep('otp'); startEmailTimer()
  }

  const saveEmail = async () => {
    reset(); setLoading(true)
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'email', newEmail, otp: emailOtp }) })
    const d = await res.json(); setLoading(false)
    if (!res.ok) { setError(d.error); return }
    await update({ email: newEmail })
    setSuccess('Email updated successfully.'); setEmailStep('input'); setNewEmail(''); setEmailOtp('')
  }

  const savePassword = async () => {
    reset()
    const err = validatePassword(newPw)
    if (err) { setError(err); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    setLoading(true)
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'password', oldPassword: oldPw, newPassword: newPw }) })
    const d = await res.json(); setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setSuccess('Password updated successfully.'); setOldPw(''); setNewPw(''); setConfirmPw('')
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors'
  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const label = (text: string) => <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{text}</label>

  const tabs: { key: Section; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'password', label: 'Password' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Account Settings</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
            </div>
            <button onClick={onClose} className="text-lg leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { setSection(t.key); reset() }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: section === t.key ? 'var(--accent)' : 'var(--bg-input)',
                  color: section === t.key ? 'var(--accent-text)' : 'var(--text-muted)',
                  border: `1px solid ${section === t.key ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {success && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
              {success}
            </div>
          )}
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {section === 'name' && (
            <div className="space-y-4">
              <div>
                {label('Display Name')}
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} style={inputStyle} />
              </div>
              <button onClick={saveName} disabled={loading || !name.trim()} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !name.trim() ? 0.6 : 1 }}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {section === 'email' && (
            <div className="space-y-4">
              {emailStep === 'input' ? (
                <>
                  <div>
                    {label('New Email Address')}
                    <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); reset() }} placeholder="new@example.com" className={inputCls} style={inputStyle} />
                  </div>
                  <button onClick={sendEmailOtp} disabled={loading || !newEmail.trim()} className="w-full py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !newEmail.trim() ? 0.6 : 1 }}>
                    {loading ? 'Sending…' : 'Send Verification Code'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      A 6-digit code was sent to <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{newEmail}</span>
                    </p>
                    {label('Verification Code')}
                    <input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="••••••" maxLength={6}
                      className={inputCls} style={{ ...inputStyle, letterSpacing: '0.2em', fontWeight: 600 }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEmailStep('input'); reset() }} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Back
                    </button>
                    <button onClick={sendEmailOtp} disabled={emailTimer > 0 || loading} className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                      style={{ background: 'var(--bg-input)', color: emailTimer > 0 ? 'var(--text-muted)' : 'var(--accent)', border: '1px solid var(--border)', opacity: emailTimer > 0 ? 0.6 : 1 }}>
                      {emailTimer > 0 ? `Resend (${emailTimer}s)` : 'Resend Code'}
                    </button>
                    <button onClick={saveEmail} disabled={loading || emailOtp.length < 6} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                      style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || emailOtp.length < 6 ? 0.6 : 1 }}>
                      {loading ? '…' : 'Verify'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {section === 'password' && (
            <div className="space-y-4">
              <div>
                {label('Current Password')}
                <PasswordInput value={oldPw} onChange={setOldPw} placeholder="••••••••" className={inputCls} style={inputStyle} />
              </div>
              <div>
                {label('New Password')}
                <PasswordInput value={newPw} onChange={setNewPw} placeholder="••••••••" showStrength className={inputCls} style={inputStyle} />
              </div>
              <div>
                {label('Confirm New Password')}
                <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" className={inputCls} style={inputStyle} />
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>Passwords do not match</p>
                )}
              </div>
              <button onClick={savePassword} disabled={loading || !oldPw || !newPw || newPw !== confirmPw} className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !oldPw || !newPw || newPw !== confirmPw ? 0.6 : 1 }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
