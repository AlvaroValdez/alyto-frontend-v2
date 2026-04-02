/**
 * ContactsPage.jsx — Agenda de Contactos
 *
 * Fase 33 — Lista, edición y eliminación de beneficiarios guardados.
 * Favoritos primero, luego por último uso.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Star, Trash2, ArrowLeft,
  Loader2, ChevronRight, AlertCircle,
} from 'lucide-react'
import { useContacts } from '../../hooks/useContacts'
import { deleteContact, toggleContactFavorite } from '../../services/api'

const COUNTRY_FLAGS = {
  CO: '🇨🇴', PE: '🇵🇪', BO: '🇧🇴', AR: '🇦🇷', MX: '🇲🇽',
  BR: '🇧🇷', US: '🇺🇸', EC: '🇪🇨', VE: '🇻🇪', PY: '🇵🇾',
  UY: '🇺🇾', CL: '🇨🇱', GT: '🇬🇹', SV: '🇸🇻', PA: '🇵🇦',
}

const COUNTRY_NAMES = {
  CO: 'Colombia', PE: 'Perú', BO: 'Bolivia', AR: 'Argentina',
  MX: 'México',  BR: 'Brasil', US: 'EE.UU.', EC: 'Ecuador',
  VE: 'Venezuela', PY: 'Paraguay', UY: 'Uruguay', CL: 'Chile',
}

function timeAgo(iso) {
  if (!iso) return null
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'ahora'
  if (mins  < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  if (days  < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function ContactDetailModal({ contact, onClose, onDelete, onToggleFavorite }) {
  const name = contact.nickname
    ? contact.nickname
    : `${contact.firstName} ${contact.lastName}`.trim() || 'Sin nombre'
  const bank    = contact.beneficiaryData?.beneficiary_bank ?? contact.beneficiaryData?.beneficiary_bank_label ?? ''
  const account = contact.beneficiaryData?.beneficiary_account_number ?? ''
  const docNum  = contact.beneficiaryData?.beneficiary_document_number
                ?? contact.beneficiaryData?.beneficiary_document ?? ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl flex flex-col pb-8"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
        </div>

        <div className="px-5 pb-2 flex items-center justify-between">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">{name}</h3>
          <button
            onClick={onToggleFavorite}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[#E2E8F0]"
          >
            <Star
              size={14}
              className={contact.isFavorite ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}
              fill={contact.isFavorite ? '#F59E0B' : 'none'}
            />
          </button>
        </div>

        {/* País */}
        <div className="px-5 py-1">
          <span className="text-[0.75rem] text-[#94A3B8]">
            {COUNTRY_FLAGS[contact.destinationCountry] ?? ''}{' '}
            {COUNTRY_NAMES[contact.destinationCountry] ?? contact.destinationCountry}
            {contact.destinationCurrency ? ` · ${contact.destinationCurrency}` : ''}
          </span>
        </div>

        {/* Datos bancarios */}
        <div className="mx-5 mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3 space-y-2.5">
          {bank && (
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Banco</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{bank}</span>
            </div>
          )}
          {account && (
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Cuenta</span>
              <span className="text-[0.875rem] font-mono font-semibold text-[#0F172A]">****{account.slice(-4)}</span>
            </div>
          )}
          {docNum && (
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Documento</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{docNum}</span>
            </div>
          )}
        </div>

        {/* Historial */}
        {contact.sendCount > 0 && (
          <div className="mx-5 mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3 space-y-2">
            <p className="text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wider">Historial</p>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Envíos realizados</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{contact.sendCount}</span>
            </div>
            {contact.lastSentAt && (
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#64748B]">Último envío</span>
                <span className="text-[0.875rem] text-[#233E58]">
                  {contact.lastAmount?.toLocaleString('es-CL')} {contact.lastCurrency} · {timeAgo(contact.lastSentAt)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="px-5 mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-[#E2E8F0] text-[0.875rem] font-semibold text-[#64748B]"
          >
            Cerrar
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EF44441A] border border-[#EF444433] text-[#F87171] text-[0.875rem] font-semibold"
          >
            <Trash2 size={15} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const navigate = useNavigate()
  const { contacts, loading, error, reload } = useContacts()
  const [selected,  setSelected]  = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  async function handleToggleFavorite(contact) {
    try {
      await toggleContactFavorite(contact._id)
      reload()
    } catch { /* silencioso */ }
    setSelected(null)
  }

  async function handleDelete(contact) {
    setDeletingId(contact._id)
    try {
      await deleteContact(contact._id)
      reload()
    } catch { /* silencioso */ }
    setDeletingId(null)
    setSelected(null)
  }

  return (
    <div className="pb-4">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-[1.0625rem] font-bold text-[#0F172A]">Mis contactos</h1>
          <p className="text-[0.75rem] text-[#94A3B8]">Beneficiarios guardados</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#94A3B8]" />
        </div>
      )}

      {error && !loading && (
        <div className="mx-4 flex items-start gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-[#F87171] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#F87171]">No se pudieron cargar los contactos.</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && contacts.length === 0 && (
        <div className="mx-4 mt-4 flex flex-col items-center text-center py-16 bg-white rounded-3xl border border-[#E2E8F0]">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#233E581A', border: '1px solid #233E5833' }}
          >
            <Users size={28} className="text-[#94A3B8]" />
          </div>
          <p className="text-[0.9375rem] font-semibold text-[#0F172A] mb-2">
            Aún no tienes contactos
          </p>
          <p className="text-[0.8125rem] text-[#64748B] max-w-[260px] leading-relaxed">
            Al enviar dinero, marca la opción "Guardar como contacto" para agilizar los próximos envíos.
          </p>
        </div>
      )}

      {/* Lista */}
      {!loading && contacts.length > 0 && (
        <div className="mx-4 bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden">
          {contacts.map((c, idx) => {
            const name = c.nickname
              ? c.nickname
              : `${c.firstName} ${c.lastName}`.trim() || 'Sin nombre'
            const bank    = c.beneficiaryData?.beneficiary_bank ?? c.beneficiaryData?.beneficiary_bank_label ?? ''
            const account = c.beneficiaryData?.beneficiary_account_number ?? ''

            return (
              <button
                key={c._id}
                onClick={() => setSelected(c)}
                disabled={deletingId === c._id}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-[#F8FAFC] transition-colors ${
                  idx < contacts.length - 1 ? 'border-b border-[#E2E8F060]' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
                  <span className="text-[1rem] font-bold text-[#233E58]">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[0.9375rem] font-semibold text-[#0F172A] truncate leading-tight">
                      {name}
                    </p>
                    {c.isFavorite && (
                      <Star size={11} className="text-[#F59E0B] flex-shrink-0" fill="#F59E0B" />
                    )}
                  </div>
                  <p className="text-[0.75rem] text-[#94A3B8] truncate">
                    {COUNTRY_FLAGS[c.destinationCountry] ?? ''}{' '}
                    {COUNTRY_NAMES[c.destinationCountry] ?? c.destinationCountry}
                    {bank ? ` · ${bank}` : ''}
                    {account ? ` ****${account.slice(-4)}` : ''}
                  </p>
                  {c.lastSentAt && (
                    <p className="text-[0.6875rem] text-[#94A3B8]">
                      Último: {c.lastAmount?.toLocaleString('es-CL')} {c.lastCurrency} · {timeAgo(c.lastSentAt)}
                    </p>
                  )}
                </div>

                {deletingId === c._id
                  ? <Loader2 size={16} className="animate-spin text-[#94A3B8] flex-shrink-0" />
                  : <ChevronRight size={16} className="text-[#94A3B8] flex-shrink-0" />
                }
              </button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <ContactDetailModal
          contact={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
          onToggleFavorite={() => handleToggleFavorite(selected)}
        />
      )}
    </div>
  )
}
