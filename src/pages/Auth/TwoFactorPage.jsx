/**
 * TwoFactorPage.jsx — Segundo factor de autenticación para accesos con privilegios.
 *
 * Se llega aquí desde el acceso, cuando la contraseña fue correcta pero la sesión
 * todavía no se emitió. Cubre las tres pantallas del control:
 *
 *   verificar   — código de seis dígitos, o código de recuperación
 *   alta        — QR + cadena manual, y confirmación con un código válido
 *   respaldo    — los códigos de recuperación, una única vez
 *
 * El alta es forzada, no opcional: si el mecanismo está activo y la cuenta no
 * tiene factor configurado, el acceso conduce aquí en lugar de denegarse. Un
 * administrador que quedara fuera de su propio panel no tendría forma de entrar
 * a configurarlo.
 *
 * La credencial intermedia vive en memoria en AuthContext. Al recargar se pierde
 * y esta pantalla devuelve al acceso — es correcto: vale cinco minutos.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ShieldCheck, Copy, Check, KeyRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { enrollTwoFactor, confirmTwoFactor, verifyTwoFactor } from '../../services/api'

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

const CODE_INPUT_STYLE = {
  ...INPUT_STYLE,
  textAlign:     'center',
  fontSize:      '1.75rem',
  fontWeight:    700,
  letterSpacing: '0.35em',
  padding:       '16px',
}

const CARD_STYLE = {
  width:        '100%', maxWidth: 420,
  background:   'var(--color-bg-secondary)',
  border:       '1px solid var(--color-border)',
  borderRadius: 'var(--radius-2xl)',
  padding:      28,
  boxShadow:    'var(--shadow-modal)',
}

const bannerBase = {
  display: 'flex', alignItems: 'center', gap: 10,
  borderRadius: 'var(--radius-xl)', padding: '12px 16px', marginBottom: 20,
}

/**
 * Un solo mensaje para todo fallo de verificación.
 *
 * El servidor ya responde de forma genérica ante código inválido, código ya
 * consumido y factor no configurado. La interfaz no debe reintroducir la
 * distinción que el servidor se cuidó de no hacer: decir «ese código ya se usó»
 * le confirmaría a quien está probando que acertó el código y llegó tarde.
 */
const GENERIC_ERROR = 'Código inválido o vencido. Revisa tu aplicación de autenticación e intenta de nuevo.'

function mensajeDeError(err) {
  if (err?.status === 429) return 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'
  if (err?.data?.code === 'CHALLENGE_REQUIRED' || err?.data?.code === 'CHALLENGE_STALE'
      || err?.data?.code === 'CHALLENGE_INVALID') {
    return 'La verificación expiró. Vuelve a iniciar sesión.'
  }
  if (err?.data?.code === 'LOCKED_OUT') {
    // Mismo texto que el resto: revelar el bloqueo le diría a quien prueba
    // códigos que agotó los intentos y conviene esperar.
    return GENERIC_ERROR
  }
  return GENERIC_ERROR
}

/** ¿El error obliga a volver al acceso? */
function exigeReingreso(err) {
  return ['CHALLENGE_REQUIRED', 'CHALLENGE_STALE', 'CHALLENGE_INVALID'].includes(err?.data?.code)
}

export default function TwoFactorPage() {
  const navigate = useNavigate()
  const { challenge, completeTwoFactor, clearChallenge } = useAuth()

  // 'verify' | 'enroll' | 'recovery'
  const [step,    setStep]    = useState(challenge?.enrollmentRequired ? 'enroll' : 'verify')
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [usarRecuperacion, setUsarRecuperacion] = useState(false)
  const [enrollData,   setEnrollData]   = useState(null)   // { qrDataUrl, manualEntry }
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [sesionPendiente, setSesionPendiente] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const enrollPedidoRef = useRef(false)

  const volverAlAcceso = useCallback((mensaje) => {
    clearChallenge()
    navigate('/login', { replace: true, state: { message: mensaje } })
  }, [clearChallenge, navigate])

  // Sin credencial intermedia no hay nada que verificar: puede ser una recarga
  // (vive en memoria) o una llegada directa por URL.
  useEffect(() => {
    if (!challenge && step !== 'recovery') {
      navigate('/login', { replace: true })
    }
  }, [challenge, step, navigate])

  // Alta forzada: se pide el secreto al entrar. El guard evita que el modo
  // estricto de React lo pida dos veces — cada llamada genera un secreto nuevo y
  // reemplaza el anterior, así que un doble montaje dejaría al operador con un QR
  // escaneado que ya no sirve.
  useEffect(() => {
    if (step !== 'enroll' || !challenge?.token || enrollPedidoRef.current) return
    enrollPedidoRef.current = true
    setEnrollLoading(true)
    enrollTwoFactor(challenge.token)
      .then(setEnrollData)
      .catch(err => {
        if (exigeReingreso(err)) { volverAlAcceso('La verificación expiró. Vuelve a iniciar sesión.'); return }
        setError('No se pudo iniciar la configuración. Vuelve a iniciar sesión e intenta de nuevo.')
      })
      .finally(() => setEnrollLoading(false))
  }, [step, challenge, volverAlAcceso])

  function alEscribirCodigo(e) {
    setError('')
    const bruto = e.target.value
    if (usarRecuperacion) {
      setCode(bruto.toUpperCase().slice(0, 11))
    } else {
      setCode(bruto.replace(/\D/g, '').slice(0, 6))
    }
  }

  const codigoCompleto = usarRecuperacion
    ? code.replace(/[\s-]/g, '').length === 10
    : code.length === 6

  async function alEnviar(e) {
    e.preventDefault()
    if (!codigoCompleto || loading || !challenge?.token) return
    setLoading(true)
    setError('')

    try {
      if (step === 'enroll') {
        const data = await confirmTwoFactor(challenge.token, code)
        // Los códigos de recuperación se muestran una sola vez. La sesión queda
        // en espera hasta que el operador confirme que los guardó: navegar de
        // inmediato los perdería sin remedio.
        setRecoveryCodes(data.recoveryCodes ?? [])
        setSesionPendiente(data)
        setStep('recovery')
        return
      }

      const payload = usarRecuperacion ? { recoveryCode: code } : { code }
      const data = await verifyTwoFactor(challenge.token, { ...payload, rememberMe: challenge.rememberMe })
      entrar(data)

    } catch (err) {
      if (exigeReingreso(err)) { volverAlAcceso(mensajeDeError(err)); return }
      setError(mensajeDeError(err))
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  function entrar(data) {
    completeTwoFactor(data)
    const destino = data.user?.kycStatus !== 'approved' ? '/kyc' : '/dashboard'
    navigate(destino, { replace: true })
  }

  function copiarCodigos() {
    navigator.clipboard?.writeText(recoveryCodes.join('\n'))
      .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
      .catch(() => {})
  }

  // ── Códigos de recuperación (una única vez) ───────────────────────────────
  if (step === 'recovery') {
    return (
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <ShieldCheck size={22} style={{ color: 'var(--color-accent-teal)' }} />
          <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Segundo factor activado
          </h1>
        </div>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Guarda estos códigos de recuperación en un lugar seguro y fuera de tu teléfono.
          Cada uno sirve una sola vez y <strong>no volverán a mostrarse</strong>.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: 16, marginBottom: 16,
        }}>
          {recoveryCodes.map(c => (
            <code key={c} style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 'var(--font-sm)', fontWeight: 600,
              color: 'var(--color-text-primary)', letterSpacing: '0.04em',
            }}>{c}</code>
          ))}
        </div>

        <button
          type="button" onClick={copiarCodigos}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 'var(--radius-xl)', padding: '12px 0', marginBottom: 12,
            background: 'transparent', border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', cursor: 'pointer',
            fontSize: 'var(--font-sm)', fontWeight: 600, fontFamily: "'Manrope', sans-serif",
          }}
        >
          {copiado ? <Check size={15} /> : <Copy size={15} />}
          {copiado ? 'Copiados' : 'Copiar códigos'}
        </button>

        <button
          type="button" onClick={() => entrar(sesionPendiente)}
          style={{
            width: '100%', borderRadius: 'var(--radius-xl)', padding: '14px 0',
            fontSize: 'var(--font-md)', fontWeight: 700, color: '#FFFFFF',
            background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
            boxShadow: 'var(--shadow-primary)', fontFamily: "'Manrope', sans-serif",
          }}
        >
          Ya los guardé, continuar
        </button>
      </div>
    )
  }

  // ── Verificación y alta ───────────────────────────────────────────────────
  const esAlta = step === 'enroll'

  return (
    <div style={CARD_STYLE}>
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
        {esAlta ? 'Configura tu segundo factor' : 'Verificación en dos pasos'}
      </h1>
      <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        {esAlta
          ? 'Tu cuenta tiene privilegios de administración. Escanea el código con tu aplicación de autenticación y confirma para activarlo.'
          : usarRecuperacion
            ? 'Ingresa uno de tus códigos de recuperación de un solo uso.'
            : 'Ingresa el código de seis dígitos de tu aplicación de autenticación.'}
      </p>

      {error && (
        <div style={{ ...bannerBase, background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle size={15} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)' }}>{error}</p>
        </div>
      )}

      {esAlta && (
        <div style={{ marginBottom: 20 }}>
          {enrollLoading && (
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>
              Generando tu código…
            </p>
          )}
          {enrollData && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <img
                  src={enrollData.qrDataUrl} alt="Código QR para la aplicación de autenticación"
                  width={200} height={200}
                  style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: '#FFFFFF', padding: 8 }}
                />
              </div>
              <div style={{
                background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px',
              }}>
                <p className="label-uppercase" style={{ marginBottom: 6 }}>O ingrésalo a mano</p>
                <code style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 'var(--font-sm)', fontWeight: 600, wordBreak: 'break-all',
                  color: 'var(--color-text-primary)', letterSpacing: '0.06em',
                }}>{enrollData.manualEntry}</code>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={alEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="label-uppercase">
            {usarRecuperacion ? 'Código de recuperación' : 'Código de verificación'}
          </label>
          <input
            // `inputMode numeric` abre el teclado numérico en móvil; `one-time-code`
            // permite que iOS y Android ofrezcan el código sin teclearlo.
            type="text"
            inputMode={usarRecuperacion ? 'text' : 'numeric'}
            autoComplete={usarRecuperacion ? 'off' : 'one-time-code'}
            name="code" value={code} onChange={alEscribirCodigo}
            placeholder={usarRecuperacion ? 'XXXXX-XXXXX' : '000000'}
            autoFocus
            disabled={esAlta && !enrollData}
            style={usarRecuperacion ? { ...INPUT_STYLE, textAlign: 'center', letterSpacing: '0.12em', fontWeight: 600 } : CODE_INPUT_STYLE}
            onFocus={e => { e.target.style.borderColor = 'var(--color-border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,31,60,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <button
          type="submit" disabled={loading || !codigoCompleto}
          style={{
            width: '100%', marginTop: 4, borderRadius: 'var(--radius-xl)', padding: '14px 0',
            fontSize: 'var(--font-md)', fontWeight: 700,
            color:      (loading || !codigoCompleto) ? 'var(--color-text-muted)' : '#FFFFFF',
            background: (loading || !codigoCompleto) ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
            border: 'none',
            cursor:     (loading || !codigoCompleto) ? 'not-allowed' : 'pointer',
            boxShadow:  (loading || !codigoCompleto) ? 'none' : 'var(--shadow-primary)',
            transition: 'var(--transition-fast)', fontFamily: "'Manrope', sans-serif",
          }}
        >
          {loading ? 'Verificando…' : esAlta ? 'Activar segundo factor' : 'Verificar'}
        </button>
      </form>

      {!esAlta && (
        <button
          type="button"
          onClick={() => { setUsarRecuperacion(v => !v); setCode(''); setError('') }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', marginTop: 16,
            fontSize: 'var(--font-sm)', color: 'var(--color-primary)', fontWeight: 500,
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <KeyRound size={14} />
          {usarRecuperacion ? 'Usar el código de la aplicación' : 'Usar un código de recuperación'}
        </button>
      )}

      <button
        type="button" onClick={() => volverAlAcceso(null)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12,
          fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)', fontFamily: "'Manrope', sans-serif",
        }}
      >
        Cancelar y volver al inicio de sesión
      </button>
    </div>
  )
}
