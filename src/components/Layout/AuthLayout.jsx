import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 20px',
        background:     'var(--color-bg-primary)',
        fontFamily:     "'Manrope', sans-serif",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <img
          src="/assets/LogoAlytoWB.png"
          alt="Alyto"
          style={{ height: 40, width: 'auto', objectFit: 'contain' }}
        />
        <p
          style={{
            fontSize:      '0.6875rem',
            fontWeight:    600,
            color:         'var(--color-text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Plataforma Financiera
        </p>
      </div>

      {/* Page content (LoginPage, RegisterPage, etc.) */}
      <Outlet />

      {/* Legal footer */}
      <p
        style={{
          marginTop:  24,
          textAlign:  'center',
          fontSize:   '0.6875rem',
          color:      'var(--color-text-muted)',
          maxWidth:   320,
          lineHeight: 1.6,
        }}
      >
        Al acceder aceptas los Términos de Servicio de AV Finance LLC, SpA y SRL
        según la jurisdicción correspondiente a tu cuenta.
      </p>
    </div>
  )
}
