import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star, Trash2, ArrowLeft, Loader2, ChevronRight, AlertCircle, Search } from 'lucide-react'
import { useContacts } from '../../hooks/useContacts'
import { deleteContact, toggleContactFavorite } from '../../services/api'

const COUNTRY_FLAGS = {
  CO: '🇨🇴', PE: '🇵🇪', BO: '🇧🇴', AR: '🇦🇷', MX: '🇲🇽',
  BR: '🇧🇷', US: '🇺🇸', EC: '🇪🇨', VE: '🇻🇪', PY: '🇵🇾',
  UY: '🇺🇾', CL: '🇨🇱', GT: '🇬🇹', SV: '🇸🇻', PA: '🇵🇦',
}

const COUNTRY_NAMES = {
  CO: 'Colombia', PE: 'Perú', BO: 'Bolivia', AR: 'Argentina',
  MX: 'México', BR: 'Brasil', US: 'EE.UU.', EC: 'Ecuador',
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

function Avatar({ name, size = 44 }) {
  return (
    <div
      style={{
        width:           size, height: size, borderRadius: '50%',
        background:      'linear-gradient(135deg, #1D3461, #0F1628)',
        border:          '1.5px solid var(--color-border)',
        display:         'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink:      0,
        fontSize:        size * 0.35,
        fontWeight:      700,
        color:           'var(--color-accent-teal)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function ContactDetailModal({ contact, onClose, onDelete, onToggleFavorite }) {
  const name    = (contact.nickname ?? `${contact.firstName} ${contact.lastName}`.trim()) || 'Sin nombre'
  const bank    = contact.beneficiaryData?.beneficiary_bank ?? contact.beneficiaryData?.beneficiary_bank_label ?? ''
  const account = contact.beneficiaryData?.beneficiary_account_number ?? ''
  const docNum  = contact.beneficiaryData?.beneficiary_document_number ?? contact.beneficiaryData?.beneficiary_document ?? ''

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'var(--color-bg-overlay)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width:        '100%', maxWidth: 430,
          background:   'var(--color-bg-elevated)',
          border:       '1px solid var(--color-border)',
          borderBottom: 'none',
          borderTopLeftRadius: 'var(--radius-2xl)',
          borderTopRightRadius: 'var(--radius-2xl)',
          paddingBottom: 32,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 'var(--radius-full)', background: 'var(--color-border)' }} />
        </div>

        <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</h3>
          <button
            onClick={onToggleFavorite}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Star size={14} style={{ color: contact.isFavorite ? '#F59E0B' : 'var(--color-text-muted)', fill: contact.isFavorite ? '#F59E0B' : 'none' }} />
          </button>
        </div>

        <div style={{ padding: '0 20px 4px' }}>
          <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
            {COUNTRY_FLAGS[contact.destinationCountry] ?? ''} {COUNTRY_NAMES[contact.destinationCountry] ?? contact.destinationCountry}
            {contact.destinationCurrency ? ` · ${contact.destinationCurrency}` : ''}
          </span>
        </div>

        {/* Bank data */}
        <div style={{ margin: '12px 20px 0', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '12px 16px' }}>
          {bank && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Banco</span>
              <span style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{bank}</span>
            </div>
          )}
          {account && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Cuenta</span>
              <span style={{ fontSize: 'var(--font-base)', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>****{account.slice(-4)}</span>
            </div>
          )}
          {docNum && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Documento</span>
              <span style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{docNum}</span>
            </div>
          )}
        </div>

        {/* History */}
        {contact.sendCount > 0 && (
          <div style={{ margin: '12px 20px 0', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '12px 16px' }}>
            <p className="label-uppercase" style={{ marginBottom: 8 }}>Historial</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Envíos realizados</span>
              <span style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{contact.sendCount}</span>
            </div>
            {contact.lastSentAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>Último envío</span>
                <span style={{ fontSize: 'var(--font-base)', color: 'var(--color-accent-teal)' }}>
                  {contact.lastAmount?.toLocaleString('es-CL')} {contact.lastCurrency} · {timeAgo(contact.lastSentAt)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '16px 20px 0', display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--radius-xl)',
              background: 'transparent', border: '1px solid var(--color-border)',
              fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--color-text-secondary)',
              cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
            }}
          >
            Cerrar
          </button>
          <button
            onClick={onDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 'var(--radius-xl)',
              background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--color-error)', fontSize: 'var(--font-base)', fontWeight: 600,
              cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
            }}
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
  const navigate               = useNavigate()
  const { contacts, loading, error, reload } = useContacts()
  const [selected,  setSelected]  = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [search,    setSearch]    = useState('')

  async function handleToggleFavorite(contact) {
    try { await toggleContactFavorite(contact._id); reload() } catch { /* silencioso */ }
    setSelected(null)
  }

  async function handleDelete(contact) {
    setDeletingId(contact._id)
    try { await deleteContact(contact._id); reload() } catch { /* silencioso */ }
    setDeletingId(null)
    setSelected(null)
  }

  const filtered = contacts.filter(c => {
    const name = (c.nickname ?? `${c.firstName} ${c.lastName}`).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const favorites = filtered.filter(c => c.isFavorite)
  const all       = filtered

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Mis contactos</h1>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>Beneficiarios guardados</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Buscar contacto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text-primary)', fontSize: 'var(--font-md)',
              fontFamily: "'Manrope', sans-serif",
            }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={28} style={{ color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            margin: '0 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-xl)', padding: '12px 16px',
          }}
        >
          <AlertCircle size={16} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)' }}>No se pudieron cargar los contactos.</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && contacts.length === 0 && (
        <div
          style={{
            margin: '0 16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', padding: '64px 20px',
            background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-xl)',
              background: 'var(--color-accent-teal-dim)', border: '1px solid var(--color-accent-teal-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}
          >
            <Users size={28} style={{ color: 'var(--color-accent-teal)' }} />
          </div>
          <p style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Aún no tienes contactos
          </p>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', maxWidth: 260, lineHeight: 1.6 }}>
            Al enviar dinero, marca "Guardar como contacto" para agilizar los próximos envíos.
          </p>
        </div>
      )}

      {/* Favorites horizontal scroll */}
      {!loading && favorites.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: '0 16px', marginBottom: 10 }}>
            <p className="label-uppercase">Favoritos</p>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
            {favorites.map(c => {
              const name = (c.nickname ?? `${c.firstName} ${c.lastName}`.trim()) || 'Sin nombre'
              return (
                <button
                  key={c._id}
                  onClick={() => setSelected(c)}
                  style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '14px 16px', borderRadius: 'var(--radius-xl)',
                    background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                    cursor: 'pointer', minWidth: 88, transition: 'var(--transition-fast)',
                    fontFamily: "'Manrope', sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-secondary)' }}
                >
                  <Avatar name={name} size={40} />
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>
                    {COUNTRY_FLAGS[c.destinationCountry] ?? ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      {!loading && all.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ marginBottom: 10 }}>
            <p className="label-uppercase">Todos</p>
          </div>
          <div
            style={{
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-2xl)', overflow: 'hidden',
            }}
          >
            {all.map((c, idx) => {
              const name    = (c.nickname ?? `${c.firstName} ${c.lastName}`.trim()) || 'Sin nombre'
              const bank    = c.beneficiaryData?.beneficiary_bank ?? c.beneficiaryData?.beneficiary_bank_label ?? ''
              const account = c.beneficiaryData?.beneficiary_account_number ?? ''

              return (
                <button
                  key={c._id}
                  onClick={() => setSelected(c)}
                  disabled={deletingId === c._id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: idx < all.length - 1 ? '1px solid var(--color-border)' : 'none',
                    transition: 'var(--transition-fast)', fontFamily: "'Manrope', sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar name={name} />
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </p>
                      {c.isFavorite && <Star size={11} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {COUNTRY_FLAGS[c.destinationCountry] ?? ''} {COUNTRY_NAMES[c.destinationCountry] ?? c.destinationCountry}
                      {bank ? ` · ${bank}` : ''}
                      {account ? ` ****${account.slice(-4)}` : ''}
                    </p>
                    {c.lastSentAt && (
                      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {c.lastAmount?.toLocaleString('es-CL')} {c.lastCurrency} · {timeAgo(c.lastSentAt)}
                      </p>
                    )}
                  </div>

                  {deletingId === c._id
                    ? <Loader2 size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                    : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  }
                </button>
              )
            })}
          </div>
        </div>
      )}

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
