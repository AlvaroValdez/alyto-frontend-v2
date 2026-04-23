import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function normalizeError(err) {
  const msg = err?.message ?? ''
  if (msg.toLowerCase().includes('demasiados') || err?.status === 429) {
    return 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.'
  }
  return 'Email o contraseña incorrectos.'
}

const INPUT_STYLE = {
  width:        '100%',
  borderRadius: 'var(--radius-md)',
  padding:      '14px 16px',
  fontSize:     'var(--font-md)',
  color:        'var(--color-text-primary)',
  background:   '#FFFFFF',
  border:       '1px solid var(--color-border)',
  outline:      'none',
  fontFamily:   "'Manrope', sans-serif",
  fontWeight:   500,
  transition:   'var(--transition-fast)',
}

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const expired      = new URLSearchParams(location.search).get('expired') === '1'
  const loggedOut    = new URLSearchParams(location.search).get('logout') === '1'
  const stateMessage = location.state?.message ?? null

  const [form, setForm]     = useState({ email: '', password: '', rememberMe: true })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function handleChange(e) {
    setError('')
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('Completa todos los campos.'); return }
    setLoading(true)
    try {
      const { user } = await login({ email: form.email.trim(), password: form.password, rememberMe: form.rememberMe })
      if (user.kycStatus !== 'approved') { navigate('/kyc', { replace: true }); return }
      const from = location.state?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }

  const bannerBase = { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 'var(--radius-xl)', padding: '12px 16px', marginBottom: 20 }

  return (
    <div
      style={{
        width:        '100%', maxWidth: 420,
        background:   'var(--color-bg-secondary)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2xl)',
        padding:      28,
        boxShadow:    'var(--shadow-modal)',
      }}
    >
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
        Bienvenido de nuevo
      </h1>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Accede a tu cuenta Alyto
      </p>

      {/* Banners */}
      {loggedOut && !error && (
        <div style={{ ...bannerBase, background: 'var(--color-accent-teal-dim)', border: '1px solid var(--color-accent-teal-border)' }}>
          <CheckCircle size={15} style={{ color: 'var(--color-accent-teal)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-accent-teal)' }}>Sesión cerrada correctamente.</p>
        </div>
      )}
      {stateMessage && !expired && !error && (
        <div style={{ ...bannerBase, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <Clock size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>{stateMessage}</p>
        </div>
      )}
      {expired && !error && (
        <div style={{ ...bannerBase, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <Clock size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Tu sesión expiró. Vuelve a iniciar sesión.</p>
        </div>
      )}
      {error && (
        <div style={{ ...bannerBase, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={15} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)' }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="label-uppercase">Email</label>
          <input
            type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="tu@email.com" autoComplete="email"
            style={INPUT_STYLE}
            onFocus={e => { e.target.style.borderColor = 'var(--color-accent-teal)'; e.target.style.boxShadow = '0 0 0 2px var(--color-accent-teal-dim)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="label-uppercase">Contraseña</label>
            <Link
              to="/forgot-password"
              className="no-underline"
              style={{ fontSize: 'var(--font-sm)', color: 'var(--color-accent-teal)', fontWeight: 500 }}
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'} name="password"
              value={form.password} onChange={handleChange}
              placeholder="••••••••" autoComplete="current-password"
              style={{ ...INPUT_STYLE, paddingRight: 44 }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-accent-teal)'; e.target.style.boxShadow = '0 0 0 2px var(--color-accent-teal-dim)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
            />
            <button
              type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {/* Recordarme */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div
            style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background:  form.rememberMe ? 'var(--color-accent-teal)' : 'transparent',
              border:      `2px solid ${form.rememberMe ? 'var(--color-accent-teal)' : 'var(--color-border)'}`,
              transition:  'var(--transition-fast)',
            }}
            onClick={() => setForm(prev => ({ ...prev, rememberMe: !prev.rememberMe }))}
          >
            {form.rememberMe && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <input type="checkbox" name="rememberMe" className="hidden" checked={form.rememberMe} onChange={handleChange} />
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Recordarme</span>
        </label>

        {/* CTA */}
        <button
          type="submit" disabled={loading}
          style={{
            width:        '100%',
            marginTop:    4,
            borderRadius: 'var(--radius-xl)',
            padding:      '14px 0',
            fontSize:     'var(--font-md)',
            fontWeight:   700,
            color:        loading ? 'var(--color-text-muted)' : '#FFFFFF',
            background:   loading ? 'var(--color-bg-elevated)' : 'var(--color-accent-teal)',
            border:       'none',
            cursor:       loading ? 'not-allowed' : 'pointer',
            boxShadow:    loading ? 'none' : 'var(--shadow-teal)',
            transition:   'var(--transition-fast)',
            fontFamily:   "'Manrope', sans-serif",
          }}
        >
          {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)', marginTop: 24 }}>
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="no-underline" style={{ color: 'var(--color-accent-teal)', fontWeight: 600 }}>
          Regístrate
        </Link>
      </p>
    </div>
  )
}
