import { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { LEGAL_DOCS } from '../../legal/terms'

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
]

export default function LegalModal({ isOpen, onClose, docType, language = 'es' }) {
  const [lang, setLang] = useState(language)

  useEffect(() => { setLang(language) }, [language, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [isOpen])

  if (!isOpen) return null

  const doc = LEGAL_DOCS[docType]?.[lang] ?? LEGAL_DOCS[docType]?.es

  if (!doc) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-[680px] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden bg-white"
        style={{
          boxShadow: '0 8px 40px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08)',
          height: '90dvh',
        }}
      >
        {/* Header navy */}
        <div
          className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0"
          style={{ background: '#233E58' }}
        >
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
              <h2 className="text-[1.0625rem] font-bold text-white mt-1 leading-tight">
                {doc.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Language tabs */}
        <div
          className="flex gap-1 px-4 py-2 border-b flex-shrink-0"
          style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
        >
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

        {/* Content scrollable */}
        <div
          className="overflow-y-auto px-6 py-5 flex flex-col gap-5"
          style={{ flex: '1 1 0', overscrollBehavior: 'contain' }}
        >
          {doc.sections.map((sec, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h3 className="text-[0.9375rem] font-bold text-[#0F172A]">
                {sec.title}
              </h3>
              {sec.content.split('\n').map((line, j) => (
                line.trim()
                  ? (
                    <p key={j} className="text-[0.875rem] text-[#334155] leading-[1.65] whitespace-pre-line">
                      {line}
                    </p>
                  )
                  : <div key={j} className="h-1" />
              ))}
            </section>
          ))}
        </div>

        {/* Footer sticky */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-3"
          style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}
        >
          <p className="text-[0.75rem] text-[#64748B]">
            Última actualización: <span className="font-semibold text-[#0F172A]">{doc.lastUpdated}</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[0.875rem] font-bold text-white transition-colors"
            style={{ background: '#233E58' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
