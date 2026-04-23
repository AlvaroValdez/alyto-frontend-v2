import { useState, useEffect, useRef } from 'react'
import { Clock, Loader2 } from 'lucide-react'

function formatCountdown(secs) {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function QuoteCard({
  destinationAmount,
  destinationCurrency,
  effectiveRate,
  totalDeducted,
  originCurrency,
  deliveryTime,
  expiresIn,
  loading = false,
}) {
  const [timeLeft, setTimeLeft] = useState(expiresIn ?? null)
  const [flashing, setFlashing] = useState(false)
  const prevDestRef = useRef(destinationAmount)

  useEffect(() => {
    setTimeLeft(expiresIn ?? null)
  }, [expiresIn])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  useEffect(() => {
    if (destinationAmount !== prevDestRef.current && destinationAmount) {
      prevDestRef.current = destinationAmount
      setFlashing(true)
      const id = setTimeout(() => setFlashing(false), 800)
      return () => clearTimeout(id)
    }
  }, [destinationAmount])

  const urgent  = timeLeft !== null && timeLeft < 10
  const warning = timeLeft !== null && timeLeft < 30 && !urgent

  const timerColor = urgent ? 'var(--color-error)' : warning ? 'var(--color-warning)' : 'var(--color-text-muted)'

  return (
    <div
      className={flashing ? 'flash-teal' : ''}
      style={{
        background:   'var(--color-bg-secondary)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding:      'var(--space-lg)',
        transition:   'var(--transition-fast)',
      }}
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent-teal)' }} />
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Calculando…</span>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="flex justify-between">
              <div className="skeleton-line" style={{ width: 100, height: 12 }} />
              <div className="skeleton-line" style={{ width: 72, height: 12 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          {/* Destination amount */}
          <div className="flex justify-between items-center">
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Recibe</span>
            <span style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--color-success)' }}>
              {destinationAmount
                ? `${Number(destinationAmount).toLocaleString('es-CL')} ${destinationCurrency}`
                : '—'
              }
            </span>
          </div>

          {/* Rate */}
          {effectiveRate && (
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Tasa efectiva</span>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-accent-teal)' }}>
                1 {originCurrency} = {Number(effectiveRate).toFixed(4)} {destinationCurrency}
              </span>
            </div>
          )}

          {/* Total deducted */}
          {totalDeducted !== undefined && totalDeducted !== null && (
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Total deducido</span>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {Number(totalDeducted).toLocaleString('es-CL')} {originCurrency}
              </span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

          {/* Footer: delivery + countdown */}
          <div className="flex justify-between items-center">
            {deliveryTime && (
              <div className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                <Clock size={13} />
                <span style={{ fontSize: 'var(--font-sm)' }}>{deliveryTime}</span>
              </div>
            )}

            {timeLeft !== null && (
              <span
                style={{
                  fontSize:   'var(--font-sm)',
                  fontWeight: 600,
                  color:      timerColor,
                  fontVariantNumeric: 'tabular-nums',
                  animation:  urgent ? 'pulseRed 0.8s ease infinite' : 'none',
                }}
              >
                {formatCountdown(timeLeft)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
