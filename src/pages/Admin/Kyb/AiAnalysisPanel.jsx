/**
 * AiAnalysisPanel.jsx — Panel de sugerencia IA del expediente KYB (Admin).
 *
 * Renderiza BusinessProfile.aiAnalysis (AWS-4 Bedrock). Es una SUGERENCIA NO
 * vinculante: el revisor decide en el DecisionPanel. Tema admin oscuro.
 */

import {
  Sparkles, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  CheckCircle2, XCircle, FileQuestion,
} from 'lucide-react'

const ACTION_META = {
  approve:   { label: 'Sugiere aprobar',  color: '#22C55E', Icon: ShieldCheck },
  review:    { label: 'Revisar a fondo',  color: '#C4CBD8', Icon: ShieldAlert },
  more_info: { label: 'Pedir más info',   color: '#F59E0B', Icon: FileQuestion },
  reject:    { label: 'Sugiere rechazar', color: '#EF4444', Icon: ShieldX },
}

// Riesgo: 0 = bajo (verde) … 100 = alto (rojo).
function riskColor(score) {
  if (score == null) return '#4E5A7A'
  if (score <= 33) return '#22C55E'
  if (score <= 66) return '#F59E0B'
  return '#EF4444'
}

function fmtDate(d) {
  if (!d) return null
  try { return new Date(d).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return null }
}

const cardStyle = { background: '#1A2340', border: '1px solid #263050' }
const labelCls  = 'block text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1'

export default function AiAnalysisPanel({ analysis, status, highlight }) {
  // Estado vacío: aún no se generó el análisis.
  if (!analysis) {
    const pending = status === 'pending' || status === 'under_review' || status === 'more_info'
    return (
      <div className="rounded-2xl p-5" style={cardStyle}>
        <Header />
        <p className="text-[0.8125rem] text-[#4E5A7A] mt-3">
          {pending
            ? 'El análisis IA se generará automáticamente al recibir el expediente. Llegará aquí en tiempo real.'
            : 'Sin análisis IA para esta solicitud.'}
        </p>
      </div>
    )
  }

  const action = ACTION_META[analysis.recommendedAction] ?? null
  const rColor = riskColor(analysis.riskScore)
  const conf = typeof analysis.confidence === 'number' ? Math.round(analysis.confidence * 100) : null
  const when = fmtDate(analysis.analyzedAt)
  const flags = Array.isArray(analysis.flags) ? analysis.flags.filter(Boolean) : []
  const missing = Array.isArray(analysis.missingDocuments) ? analysis.missingDocuments.filter(Boolean) : []
  const checks = Array.isArray(analysis.documentChecks) ? analysis.documentChecks : []

  return (
    <div
      className="rounded-2xl p-5 space-y-4 transition-shadow"
      style={{
        ...cardStyle,
        boxShadow: highlight ? '0 0 0 2px #C4CBD855' : 'none',
      }}
    >
      <Header />

      {/* Acción recomendada */}
      {action && (
        <div
          className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
          style={{ background: `${action.color}14`, border: `1px solid ${action.color}33` }}
        >
          <action.Icon size={18} style={{ color: action.color }} />
          <span className="text-[0.875rem] font-bold" style={{ color: action.color }}>
            {action.label}
          </span>
        </div>
      )}

      {/* Score de riesgo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={labelCls} style={{ marginBottom: 0 }}>Riesgo estimado</span>
          <span className="text-[0.875rem] font-bold tabular-nums" style={{ color: rColor }}>
            {analysis.riskScore ?? '—'}<span className="text-[#4E5A7A] font-medium">/100</span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0F1628' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, analysis.riskScore ?? 0))}%`, background: rColor }}
          />
        </div>
        {conf != null && (
          <p className="text-[0.6875rem] text-[#4E5A7A] mt-1.5">
            Confianza del análisis: <span className="text-[#8A96B8] font-semibold tabular-nums">{conf}%</span>
          </p>
        )}
      </div>

      {/* Resumen */}
      {analysis.summary && (
        <div>
          <p className={labelCls}>Resumen</p>
          <p className="text-[0.8125rem] text-[#C9D2E3] leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Banderas */}
      {flags.length > 0 && (
        <div>
          <p className={labelCls}>Banderas</p>
          <ul className="space-y-1.5">
            {flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.8125rem] text-[#F0C674]">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documentos faltantes */}
      {missing.length > 0 && (
        <div>
          <p className={labelCls}>Documentos faltantes</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((m, i) => (
              <span
                key={i}
                className="text-[0.6875rem] font-semibold px-2 py-1 rounded-lg"
                style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33', color: '#F59E0B' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Checks por documento */}
      {checks.length > 0 && (
        <div>
          <p className={labelCls}>Verificación de documentos</p>
          <ul className="space-y-2">
            {checks.map((c, i) => {
              const ok = c.legible && c.matches
              const Icon = !c.legible ? XCircle : (c.matches ? CheckCircle2 : AlertTriangle)
              const color = !c.legible ? '#EF4444' : (c.matches ? '#22C55E' : '#F59E0B')
              return (
                <li key={i} className="flex items-start gap-2">
                  <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium text-white">{c.type || `Documento ${i + 1}`}</p>
                    {c.note && <p className="text-[0.75rem] text-[#8A96B8]">{c.note}</p>}
                    {!c.note && (
                      <p className="text-[0.75rem]" style={{ color }}>
                        {!c.legible ? 'No legible' : (c.matches ? 'Coincide con lo declarado' : 'No coincide con lo declarado')}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Footer / disclaimer */}
      <div className="pt-2 border-t border-[#263050]">
        <p className="text-[0.6875rem] text-[#4E5A7A] leading-snug">
          Sugerencia generada por IA{analysis.model ? ` · ${analysis.model}` : ''}{when ? ` · ${when}` : ''}.
          No es vinculante — la decisión es del revisor.
        </p>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles size={16} className="text-[#C4CBD8]" />
      <h2 className="text-[0.875rem] font-bold text-white">Análisis IA</h2>
      <span
        className="ml-auto text-[0.625rem] font-bold px-2 py-0.5 rounded-full"
        style={{ background: '#C4CBD81A', border: '1px solid #C4CBD833', color: '#C4CBD8' }}
      >
        SUGERENCIA
      </span>
    </div>
  )
}
