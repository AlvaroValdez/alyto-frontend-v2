/**
 * SRLConfigPage.jsx — Gestión de QR de pago Bolivia (Admin) · Alyto V2.0
 *
 * Permite al admin:
 *   • Ver el grid de QR activos/inactivos
 *   • Activar / Desactivar cada QR
 *   • Eliminar un QR (con confirmación inline)
 *   • Subir un nuevo QR con label e imagen
 *
 * Backend: GET/POST/PATCH/DELETE /api/v1/admin/srl-config/qr
 */

import { useState, useEffect, useRef } from 'react'
import {
  QrCode, Upload, X, Loader2, CheckCircle2,
  ToggleLeft, ToggleRight, Trash2, Image as ImageIcon, Building2, Save,
} from 'lucide-react'
import {
  getSRLConfig,
  uploadSRLQR,
  toggleSRLQR,
  deleteSRLQR,
  updateSRLBankData,
} from '../../../services/adminService'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg"
      style={{ background: '#1A2340', border: '1px solid #22C55E33', color: '#22C55E' }}>
      <CheckCircle2 size={16} />
      <span className="text-[0.875rem] font-medium">{message}</span>
    </div>
  )
}

// ── Modal: subir nuevo QR ─────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }) {
  const [label,    setLabel]    = useState('')
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const inputRef               = useRef()

  function handleFile(f) {
    if (!f) return
    if (f.size > 2 * 1024 * 1024) {
      setError('La imagen no puede superar 2 MB')
      return
    }
    setFile(f)
    setError(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  async function handleSubmit() {
    if (!label.trim()) { setError('El label es requerido'); return }
    if (!file)         { setError('Selecciona una imagen QR'); return }
    setSaving(true)
    setError(null)
    try {
      await uploadSRLQR(label.trim(), file)
      onUploaded()
    } catch (err) {
      setError(err.message || 'Error al subir el QR')
      setSaving(false)
    }
  }

  const inputCls   = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A]'
  const labelCls   = 'block text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[1rem] font-bold text-white">Subir nuevo QR</h2>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Label */}
        <div>
          <label className={labelCls}>Label del QR *</label>
          <input
            className={inputCls}
            placeholder="ej. Tigo Money, Banco Bisa QR"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </div>

        {/* File input */}
        <div>
          <label className={labelCls}>Imagen QR *</label>
          <div
            className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            style={{ borderColor: file ? '#22C55E' : '#263050' }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-40 max-w-full object-contain rounded-lg"
              />
            ) : (
              <>
                <ImageIcon size={28} className="text-[#4E5A7A]" />
                <p className="text-[0.8125rem] text-[#8A96B8]">Toca para seleccionar</p>
                <p className="text-[0.75rem] text-[#4E5A7A]">PNG, JPG, WebP — máx. 2 MB</p>
              </>
            )}
          </div>
          {file && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-[0.75rem] text-[#8A96B8] truncate">{file.name}</span>
              <button
                onClick={() => { setFile(null); setPreview(null) }}
                className="text-[#4E5A7A] hover:text-[#EF4444] transition-colors ml-2"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
            style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Subiendo…</> : <><Upload size={16} /> Subir QR</>}
        </button>
      </div>
    </div>
  )
}

// ── Bank Data Card ────────────────────────────────────────────────────────

function BankDataCard({ initial, onSaved }) {
  const [form,    setForm]    = useState({
    bankName:      initial?.bankName      ?? '',
    accountHolder: initial?.accountHolder ?? '',
    accountNumber: initial?.accountNumber ?? '',
    accountType:   initial?.accountType   ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A]'
  const labelCls = 'block text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSave() {
    if (!form.bankName.trim() || !form.accountHolder.trim() || !form.accountNumber.trim() || !form.accountType.trim()) {
      setError('Todos los campos son requeridos.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateSRLBankData(form)
      onSaved('Datos bancarios actualizados')
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: '#1A2340', border: '1px solid #263050' }}
    >
      <div className="flex items-center gap-2.5 mb-1">
        <Building2 size={17} className="text-[#C4CBD8]" />
        <h2 className="text-[0.9375rem] font-bold text-white">Datos bancarios AV Finance SRL</h2>
      </div>
      <p className="text-[0.8125rem] text-[#4E5A7A] -mt-2">
        Estos datos se muestran al usuario en las instrucciones de pago manual Bolivia.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Banco *</label>
          <input
            className={inputCls}
            placeholder="ej. Banco Bisa"
            value={form.bankName}
            onChange={e => set('bankName', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Titular *</label>
          <input
            className={inputCls}
            placeholder="ej. AV Finance SRL"
            value={form.accountHolder}
            onChange={e => set('accountHolder', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Número de cuenta *</label>
          <input
            className={inputCls}
            placeholder="ej. 1234567890"
            value={form.accountNumber}
            onChange={e => set('accountNumber', e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Tipo de cuenta *</label>
          <input
            className={inputCls}
            placeholder="ej. Cuenta Corriente"
            value={form.accountType}
            onChange={e => set('accountType', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628] disabled:opacity-60 transition-opacity"
        style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.2)' }}
      >
        {saving
          ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
          : <><Save size={14} /> Guardar datos bancarios</>
        }
      </button>
    </div>
  )
}

// ── QR Card ────────────────────────────────────────────────────────────────

function QRCard({ qr, onToggle, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toggling,      setToggling]      = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      await onToggle(qr.qrId, !qr.isActive)
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete(qr.qrId)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: '#1A2340',
        border: `1px solid ${qr.isActive ? '#22C55E33' : '#263050'}`,
      }}
    >
      {/* Image */}
      <div
        className="flex items-center justify-center p-6"
        style={{ background: '#0F1628', minHeight: '180px' }}
      >
        {qr.imageBase64 ? (
          <img
            src={qr.imageBase64}
            alt={qr.label}
            className="max-h-40 max-w-full object-contain"
          />
        ) : (
          <QrCode size={64} className="text-[#263050]" />
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.9375rem] font-bold text-white">{qr.label}</p>
            <p className="text-[0.75rem] text-[#4E5A7A] mt-0.5">
              Subido: {formatDate(qr.uploadedAt)}
            </p>
          </div>
          {/* Status badge */}
          <span
            className="inline-block text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
            style={
              qr.isActive
                ? { background: '#22C55E1A', border: '1px solid #22C55E33', color: '#22C55E' }
                : { background: '#1A23401A', border: '1px solid #263050',    color: '#4E5A7A' }
            }
          >
            {qr.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.8125rem] font-medium transition-all disabled:opacity-50"
            style={{
              background: qr.isActive ? '#EF44441A' : '#22C55E1A',
              border: `1px solid ${qr.isActive ? '#EF444433' : '#22C55E33'}`,
              color: qr.isActive ? '#EF4444' : '#22C55E',
            }}
          >
            {toggling
              ? <Loader2 size={13} className="animate-spin" />
              : qr.isActive
                ? <><ToggleLeft size={14} /> Desactivar</>
                : <><ToggleRight size={14} /> Activar</>
            }
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-1 disabled:opacity-50"
                style={{ background: '#EF44441A', border: '1px solid #EF444433', color: '#EF4444' }}
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : '¿Confirmar?'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-xl text-[0.75rem] font-medium"
                style={{ background: '#1A2340', border: '1px solid #263050', color: '#8A96B8' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 rounded-xl text-[#4E5A7A] hover:text-[#EF4444] transition-colors"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden animate-pulse"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <div className="h-44 bg-[#263050]" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 bg-[#263050] rounded-full" />
            <div className="h-3 w-1/2 bg-[#263050] rounded-full" />
            <div className="h-9 bg-[#263050] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SRLConfigPage() {
  const [qrImages,  setQrImages]  = useState([])
  const [bankData,  setBankData]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [toast,     setToast]     = useState(null)

  async function fetchConfig() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSRLConfig()
      setQrImages(data.qrImages ?? [])
      setBankData(data.bankData  ?? {})
    } catch (err) {
      setError(err.message || 'Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  async function handleToggle(qrId, isActive) {
    await toggleSRLQR(qrId, isActive)
    setQrImages(prev =>
      prev.map(q => q.qrId === qrId ? { ...q, isActive } : q)
    )
    setToast(isActive ? 'QR activado' : 'QR desactivado')
  }

  async function handleDelete(qrId) {
    await deleteSRLQR(qrId)
    setQrImages(prev => prev.filter(q => q.qrId !== qrId))
    setToast('QR eliminado')
  }

  function handleUploaded() {
    setShowModal(false)
    setToast('QR subido correctamente')
    fetchConfig()
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <QrCode size={22} className="text-[#C4CBD8]" />
            <h1 className="text-[1.125rem] font-bold text-white">
              Configuración Bolivia — QR de pago
            </h1>
          </div>
          <p className="text-[0.8125rem] text-[#4E5A7A]">
            Gestiona los códigos QR que ven los usuarios al pagar desde Bolivia
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628] flex-shrink-0"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.2)' }}
        >
          <Upload size={15} />
          Subir nuevo QR
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          {error}
        </div>
      )}

      {/* ── Datos bancarios ── */}
      {!loading && bankData !== null && (
        <BankDataCard
          initial={bankData}
          onSaved={msg => setToast(msg)}
        />
      )}

      {/* ── Separador QR ── */}
      <div className="flex items-center gap-3 pt-1">
        <QrCode size={16} className="text-[#4E5A7A] flex-shrink-0" />
        <span className="text-[0.8125rem] font-semibold text-[#4E5A7A]">Códigos QR de pago</span>
        <div className="h-px flex-1 bg-[#263050]" />
      </div>

      {/* ── Content ── */}
      {loading ? (
        <SkeletonGrid />
      ) : !qrImages.length ? (
        <div
          className="rounded-2xl p-12 flex flex-col items-center text-center"
          style={{ background: '#1A2340', border: '2px dashed #263050' }}
        >
          <QrCode size={40} className="text-[#263050] mb-4" />
          <p className="text-[0.9375rem] font-bold text-[#4E5A7A] mb-2">
            Sin QR configurados
          </p>
          <p className="text-[0.8125rem] text-[#4E5A7A] mb-5">
            Sube el primer QR de pago para Bolivia.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628]"
            style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            <Upload size={15} />
            Subir QR
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {qrImages.map(qr => (
            <QRCard
              key={qr.qrId}
              qr={qr}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUploaded={handleUploaded}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

    </div>
  )
}
