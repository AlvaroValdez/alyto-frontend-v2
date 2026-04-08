// ⚠️  Sentry debe ser la PRIMERA importación para instrumentar toda la app
import Sentry from './services/sentry.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerFirebaseSW } from './services/firebase'

// Registrar SW de FCM al arranque (sin bloquear render)
registerFirebaseSW()

/** Fallback que se muestra cuando un error no capturado llega al ErrorBoundary raíz. */
function ErrorFallback({ eventId, resetError }) {
  return (
    <div style={{
      minHeight:       '100vh',
      background:      '#0F1628',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexDirection:   'column',
      gap:             '16px',
      padding:         '24px',
      fontFamily:      'Inter, sans-serif',
      color:           '#FFFFFF',
      textAlign:       'center',
    }}>
      <div style={{
        background:    '#1A2340',
        borderRadius:  '20px',
        padding:       '32px 40px',
        maxWidth:      '400px',
        width:         '100%',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 700 }}>
          Algo salió mal
        </h2>
        <p style={{ color: '#8A96B8', fontSize: '0.875rem', margin: '0 0 24px' }}>
          Por favor recarga la página. Si el problema persiste, contacta soporte.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            width:         '100%',
            padding:       '14px',
            background:    '#C4CBD8',
            color:         '#0F1628',
            border:        'none',
            borderRadius:  '14px',
            fontSize:      '0.9375rem',
            fontWeight:    700,
            cursor:        'pointer',
            marginBottom:  '16px',
          }}
        >
          Recargar
        </button>

        {eventId && (
          <p style={{ color: '#4E5A7A', fontSize: '0.6875rem', margin: 0 }}>
            Código de referencia:{' '}
            <span style={{ fontFamily: 'monospace', color: '#8A96B8' }}>{eventId}</span>
          </p>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={ErrorFallback}>
    <App />
  </Sentry.ErrorBoundary>,
)
