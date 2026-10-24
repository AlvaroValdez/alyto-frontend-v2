/**
 * LabHeader — barra superior del apartado Dark Minimal.
 *
 * El logo va en su variante clara (letras blancas + chevron amarillo). El
 * amarillo del chevron no se recolorea y tampoco se saca del logo para
 * decorar: fuera de él, el amarillo no aparece en esta pantalla.
 */

import { QrCode, User } from 'lucide-react'

export default function LabHeader({ nombre, subtitulo = 'INICIO', onScan, onPerfil }) {
  const inicial = (nombre || 'A').trim().charAt(0).toUpperCase()

  return (
    <header className="flex items-center gap-3 px-4 pt-4 pb-3">
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[15px] font-bold"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--adm-border)',
          color: 'var(--adm-text)',
        }}
      >
        {inicial}
      </div>

      <div className="min-w-0 flex-1">
        <img
          src="/assets/LogoAlytoWB.png"
          alt="Alyto"
          className="h-5 w-auto"
          style={{ minWidth: 80 }}
        />
        <p className="adm__label mt-1">{subtitulo}</p>
      </div>

      <button
        type="button"
        onClick={onScan}
        aria-label="Escanear QR"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
        style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
      >
        <QrCode size={19} style={{ color: 'var(--adm-text-70)' }} />
      </button>

      <button
        type="button"
        onClick={onPerfil}
        aria-label="Perfil"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
        style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
      >
        <User size={19} style={{ color: 'var(--adm-text-70)' }} />
      </button>
    </header>
  )
}
