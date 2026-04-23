/**
 * ContactPicker.jsx — Selector inline de contactos guardados.
 *
 * Muestra los contactos del usuario filtrados por destinationCountry como
 * chips horizontales. Usado en Step3Beneficiary para pre-rellenar el formulario
 * con un toque, sin necesidad de navegar a ContactsPage.
 *
 * Retorna null si no hay contactos para ese país (sin ruido visual).
 *
 * Props:
 *   destinationCountry — string ISO-2 para filtrar
 *   selectedId         — _id del contacto actualmente seleccionado (o null)
 *   onSelect(contact)  — callback cuando el usuario toca un chip
 */

import { useContacts } from '../../hooks/useContacts'

function contactDisplayName(c) {
  return (c.nickname ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()) || '?'
}

function Avatar({ name, size = 38 }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1D3461 0%, #233E58 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#FFFFFF', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function ContactPicker({ destinationCountry, selectedId, onSelect }) {
  const { contacts, loading } = useContacts(destinationCountry)

  if (loading || contacts.length === 0) return null

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontSize: '0.6875rem', fontWeight: 700,
        color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Contactos guardados
      </p>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto',
        paddingBottom: 4, scrollbarWidth: 'none' }}>
        {contacts.map(c => {
          const name     = contactDisplayName(c)
          const isActive = c._id === selectedId
          return (
            <button
              key={c._id}
              type="button"
              onClick={() => onSelect(c)}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 8px', borderRadius: 14, cursor: 'pointer',
                background: isActive ? '#EEF2FF' : '#FFFFFF',
                border: `1.5px solid ${isActive ? '#1D3461' : '#E2E8F0'}`,
                minWidth: 68,
                fontFamily: 'inherit',
                boxShadow: isActive
                  ? '0 0 0 2px rgba(29,52,97,0.15)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.15s',
              }}
            >
              <Avatar name={name} size={36} />
              <span style={{
                fontSize: '0.6875rem', fontWeight: 700,
                color: isActive ? '#1D3461' : '#0D1F3C',
                whiteSpace: 'nowrap', maxWidth: 60,
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {name.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
