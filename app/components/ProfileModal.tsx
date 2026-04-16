'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import PasswordInput from './PasswordInput'
import { validatePassword } from '@/lib/password'

type Section = 'name' | 'email' | 'password'

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { data: session, update } = useSession()
  const [section, setSection] = useState<Section | null>(null)

  // Name
  const [name, setName] = useState(session?.user?.name ?? '')
  // Email
  const [newEmail, setNewEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input')
  const [emailTimer, setEmailTimer] = useState(0)
  // Password
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
    setSuccess('Name updated!'); setSection(null)
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
    setSuccess('Email updated!'); setSection(null); setEmailStep('input'); setNewEmail(''); setEmailOtp('')
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
    setSuccess('Password updated!'); setSection(null); setOldPw(''); setNewPw(''); setConfirmPw('')
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors'
  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
  const sectionBtn = (s: Section, label: string) => (
    <button onClick={() => { setSection(section === s ? null : s); reset() }}
      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
      style={{ borderBottom: '1px solid var(--border)', color: section === s ? 'var(--accent)' : 'var(--text-primary)', background: section === s ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent' }}
      onMouseEnter={e => { if (section !== s) (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 4%, transparent)') }}
      onMouseLeave={e => { if (section !== s) (e.currentTarget.style.background = 'transparent') }}>
      <span>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{section === s ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--accent)' }}>👤 Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {success && <div className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>✅ {success}</div>}

        {/* Name */}
        {sectionBtn('name', '✏️ Change Name')}
        {section === 'name' && (
          <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} style={inputStyle} />
            {error && section === 'name' && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
            <button onClick={saveName} disabled={loading || !name.trim()} className="w-full py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !name.trim() ? 0.6 : 1 }}>
              {loading ? 'Saving…' : 'Save Name'}
            </button>
          </div>
        )}

        {/* Email */}
        {sectionBtn('email', '📧 Change Email')}
        {section === 'email' && (
          <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
            {emailStep === 'input' ? (
              <>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" className={inputCls} style={inputStyle} />
                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
                <button onClick={sendEmailOtp} disabled={loading || !newEmail.trim()} className="w-full py-2 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !newEmail.trim() ? 0.6 : 1 }}>
                  {loading ? 'Sending OTP…' : 'Send OTP to New Email'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{newEmail}</strong></p>
                <input value={emailOtp} onChange={e => setEmailOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} className={inputCls} style={inputStyle} />
                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setEmailStep('input'); reset() }} className="flex-1 py-2 rounded-lg text-xs"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>← Back</button>
                  <button onClick={sendEmailOtp} disabled={emailTimer > 0 || loading} className="flex-1 py-2 rounded-lg text-xs"
                    style={{ background: 'var(--bg-input)', color: emailTimer > 0 ? 'var(--text-muted)' : 'var(--accent)', border: '1px solid var(--border)', opacity: emailTimer > 0 ? 0.6 : 1 }}>
                    {emailTimer > 0 ? `Resend (${emailTimer}s)` : 'Resend'}
                  </button>
                  <button onClick={saveEmail} disabled={loading || emailOtp.length < 6} className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || emailOtp.length < 6 ? 0.6 : 1 }}>
                    {loading ? '…' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Password */}
        {sectionBtn('password', '🔒 Change Password')}
        {section === 'password' && (
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
              <PasswordInput value={oldPw} onChange={setOldPw} placeholder="Current password" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>New Password</label>
              <PasswordInput value={newPw} onChange={setNewPw} placeholder="New password" showStrength className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" className={inputCls} style={inputStyle} />
              {confirmPw && newPw !== confirmPw && <p className="text-xs mt-1" style={{ color: '#f87171' }}>Passwords do not match</p>}
            </div>
            {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
            <button onClick={savePassword} disabled={loading || !oldPw || !newPw || newPw !== confirmPw} className="w-full py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', opacity: loading || !oldPw || !newPw || newPw !== confirmPw ? 0.6 : 1 }}>
              {loading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
