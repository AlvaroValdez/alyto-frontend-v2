/**
 * Toggle.jsx — Switch toggle reutilizable.
 *
 * @param {boolean}           checked   — Estado actual del toggle
 * @param {(val: boolean) => void} onChange — Callback al cambiar estado
 * @param {boolean}           [disabled] — Deshabilita interacción
 * @param {boolean}           [loading]  — Muestra spinner de carga; implica disabled
 */

import { Loader2 } from 'lucide-react'

export default function Toggle({ checked, onChange, disabled, loading }) {
  const isDisabled = disabled || loading

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 size={12} className="text-[#1D9E75] animate-spin" />}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={isDisabled}
        onClick={() => {
          if (disabled || loading) return
          onChange(!checked)
        }}
        className={`relative overflow-hidden w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${checked ? 'bg-[#1D9E75]' : 'bg-[#263050]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
