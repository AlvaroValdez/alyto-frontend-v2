// src/components/support/SupportChatWidget.jsx
//
// Widget flotante del asistente IA de soporte "Aly" (AWS-4 Bedrock).
// Burbuja inferior-derecha + panel de chat. Se monta en AppLayout, por lo que
// solo aparece en la app de usuario autenticada (admin usa AdminLayout aparte).
//
// Tema CLARO (tokens.css): navy #0D1F3C primary, cards blancos, Manrope.
// El historial vive solo en el cliente; el backend degrada a soporte humano
// si la IA está apagada o falla (source: 'fallback').

import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { sendSupportMessage } from '../../services/supportService'

const FONT = "'Manrope', sans-serif"
const MAX_HISTORY = 10 // turnos que se reenvían al backend (también lo capa el server)

function welcomeFor(user) {
  const name = user?.firstName ? `, ${user.firstName}` : ''
  return `¡Hola${name}! Soy Aly, tu asistente de Alyto. Puedo ayudarte con dudas sobre cómo cargar saldo, enviar dinero, verificación de identidad y más. ¿En qué te ayudo?`
}

export default function SupportChatWidget() {
  const { user, isAuth } = useAuth()
  const location = useLocation()

  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([]) // { role, text, intro?, fallback? }
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)

  const scrollRef = useRef(null)
  const inputRef  = useRef(null)

  // Permite abrir el chat desde otras partes (ej. un link "Contactar soporte").
  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('alyto:open-support', openHandler)
    return () => window.removeEventListener('alyto:open-support', openHandler)
  }, [])

  // Semilla de bienvenida la primera vez que se abre.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', text: welcomeFor(user), intro: true }])
    }
  }, [open, messages.length, user])

  // Auto-scroll al fondo cuando llegan mensajes o aparece el "escribiendo…".
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  // Foco en el input al abrir.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    // Historial para el backend: turnos reales (sin la bienvenida canned).
    const history = next
      .filter((m) => !m.intro)
      .slice(-MAX_HISTORY - 1, -1) // todo menos el mensaje actual
      .map((m) => ({ role: m.role, text: m.text }))

    try {
      const { reply, source } = await sendSupportMessage({ message: text, history })
      setMessages((prev) => [...prev, { role: 'assistant', text: reply, fallback: source === 'fallback' }])
    } catch (err) {
      // Red caída / 401: el 401 ya dispara el evento global de sesión expirada.
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          fallback: true,
          text: 'No pude conectarme en este momento. Intenta de nuevo o escríbenos a soporte@alyto.app.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Guards: solo usuarios autenticados y fuera del panel admin.
  if (!isAuth || !user) return null
  if (location.pathname.startsWith('/admin')) return null

  return (
    <div
      className="fixed right-4 bottom-20 lg:bottom-6 z-[60]"
      style={{ fontFamily: FONT }}
    >
      {/* ── Panel de chat ─────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Asistente de soporte Alyto"
          className="flex flex-col w-[calc(100vw-2rem)] max-w-[380px] h-[560px] max-h-[calc(100vh-9rem)] mb-3"
          style={{
            background:   'var(--color-bg-secondary)',
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            boxShadow:    'var(--shadow-modal)',
            overflow:     'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            <div
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.14)' }}
            >
              <MessageCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.1 }}>Asistente Alyto</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: 1.3 }}>
                <span
                  style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--color-accent, #1D9E75)', marginRight: 6,
                  }}
                />
                En línea
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="flex items-center justify-center rounded-lg"
              style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', cursor: 'pointer', border: 'none' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensajes */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2"
            style={{ background: 'var(--color-bg-app)' }}
          >
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} fallback={m.fallback} />
            ))}
            {loading && <TypingBubble />}
          </div>

          {/* Input */}
          <div
            className="flex items-end gap-2 px-3 py-3"
            style={{ background: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu mensaje…"
              maxLength={2000}
              className="flex-1 resize-none outline-none"
              style={{
                background:   'var(--color-bg-app)',
                border:       '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color:        'var(--color-text-primary)',
                fontFamily:   FONT,
                fontSize:     '0.9375rem',
                padding:      '10px 12px',
                maxHeight:    96,
                lineHeight:   1.35,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensaje"
              className="flex items-center justify-center shrink-0"
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)', border: 'none',
                background: !input.trim() || loading ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
                color:      !input.trim() || loading ? 'var(--color-text-muted)' : '#FFFFFF',
                cursor:     !input.trim() || loading ? 'default' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Burbuja flotante (FAB) ────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de soporte'}
        className="flex items-center justify-center ml-auto"
        style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--color-primary)', color: '#FFFFFF',
          boxShadow: 'var(--shadow-primary, 0 4px 20px rgba(13,31,60,0.25))',
          transition: 'transform 0.15s',
        }}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Bubble({ role, text, fallback }) {
  const isUser = role === 'user'
  return (
    <div className="flex" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '82%',
          padding: '9px 13px',
          borderRadius: 16,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius:  isUser ? 16 : 4,
          background: isUser ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
          color:      isUser ? '#FFFFFF' : 'var(--color-text-primary)',
          border:     isUser ? 'none' : '1px solid var(--color-border)',
          fontSize:   '0.9375rem',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
          boxShadow:  isUser ? 'none' : 'var(--shadow-card, 0 2px 12px rgba(13,31,60,0.08))',
        }}
      >
        {text}
        {fallback && (
          <span style={{ display: 'block', marginTop: 4, fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            Soporte
          </span>
        )}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex" style={{ justifyContent: 'flex-start' }}>
      <div
        className="flex items-center gap-1"
        style={{
          padding: '11px 14px', borderRadius: 16, borderBottomLeftRadius: 4,
          background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-muted)',
              animation: `alytoTyping 1s ${i * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
        <style>{`@keyframes alytoTyping { 0%,60%,100% { opacity:0.3; transform:translateY(0) } 30% { opacity:1; transform:translateY(-3px) } }`}</style>
      </div>
    </div>
  )
}
