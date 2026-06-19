/**
 * LegalPage.jsx — Página pública (sin auth) de documentos legales.
 *
 * Sirve Términos y Política de Privacidad en URLs accesibles públicamente,
 * requisito de Google Play (la Privacy Policy debe tener URL pública, no solo
 * un modal in-app). Reutiliza el contenido data-driven de `src/legal/terms.js`.
 *
 * Rutas: /terms y /privacy (ver router/index.jsx).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { LEGAL_DOCS } from '../../legal/terms'

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
]

export default function LegalPage({ docType = 'terms' }) {
  const [lang, setLang] = useState('es')

  const doc = LEGAL_DOCS[docType]?.[lang] ?? LEGAL_DOCS[docType]?.es

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-[#334155] p-6">
        Documento no disponible.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header navy */}
      <header className="px-6 pt-8 pb-5" style={{ background: '#233E58' }}>
        <div className="max-w-[760px] mx-auto flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold text-[#FCD34D] tracking-[0.12em] uppercase leading-none">
                Alyto
              </p>
              <h1 className="text-[1.125rem] font-bold text-white mt-1 leading-tight">
                {doc.title}
              </h1>
            </div>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-[0.8125rem] font-bold text-[#233E58] bg-white hover:bg-white/90 transition-colors flex-shrink-0"
          >
            Volver
          </Link>
        </div>
      </header>

      {/* Language tabs */}
      <div className="border-b" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <div className="max-w-[760px] mx-auto flex gap-1 px-4 py-2">
          {LANGUAGES.map((l) => {
            const active = l.code === lang
            const available = !!LEGAL_DOCS[docType]?.[l.code]
            return (
              <button
                key={l.code}
                onClick={() => available && setLang(l.code)}
                disabled={!available}
                className={`flex-1 py-2 text-[0.75rem] font-bold rounded-xl transition-all ${
                  active
                    ? 'bg-[#FCD34D] text-[#0F172A] shadow-sm'
                    : available
                      ? 'text-[#64748B] hover:bg-white'
                      : 'text-[#CBD5E1] cursor-not-allowed'
                }`}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[760px] mx-auto px-6 py-8 flex flex-col gap-6">
        {doc.sections.map((sec, i) => (
          <section key={i} className="flex flex-col gap-2">
            <h2 className="text-[1rem] font-bold text-[#0F172A]">{sec.title}</h2>
            {sec.content.split('\n').map((line, j) => (
              line.trim()
                ? (
                  <p key={j} className="text-[0.9375rem] text-[#334155] leading-[1.7] whitespace-pre-line">
                    {line}
                  </p>
                )
                : <div key={j} className="h-1" />
            ))}
          </section>
        ))}

        <p className="text-[0.8125rem] text-[#64748B] pt-4 border-t" style={{ borderColor: '#E2E8F0' }}>
          Última actualización: <span className="font-semibold text-[#0F172A]">{doc.lastUpdated}</span>
        </p>

        <nav className="flex gap-4 text-[0.8125rem] font-semibold text-[#233E58]">
          <Link to="/terms" className="hover:underline">Términos</Link>
          <Link to="/privacy" className="hover:underline">Privacidad</Link>
          <Link to="/eliminar-cuenta" className="hover:underline">Eliminar cuenta</Link>
        </nav>
      </main>
    </div>
  )
}
