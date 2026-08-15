/**
 * MarketingAgentPage.jsx — Agente de marketing y educación financiera
 *
 * Panel del módulo: generar piezas con IA, resolver la cola de aprobación y
 * consultar el historial. Endpoints: /api/v1/admin/marketing
 *
 * La pantalla está organizada alrededor del trabajo real del revisor, no del
 * CRUD. Por eso la pestaña por defecto es la COLA (lo que exige acción) y no el
 * formulario de generación.
 *
 * Tres reglas de diseño que vienen del backend y no son cosméticas:
 *
 *  1. El motivo del gate se muestra Y se resalta dentro del texto. Un revisor
 *     que lee "Contiene cifras económicas" y tiene que buscar la cifra a ojo
 *     termina aprobando sin leer.
 *  2. Las piezas con prohibiciones absolutas (terminología de marca vetada,
 *     certificaciones inexistentes, sobre-afirmación regulatoria) NO ofrecen botón de aprobar — el backend devuelve 422 igual, pero
 *     un botón que siempre rebota entrena a ignorar los errores.
 *  3. Se muestran los DOS veredictos: lo que dijo el modelo de sí mismo y lo que
 *     decidió el clasificador. La brecha entre ambos es la métrica que dice si
 *     el gate humano puede relajarse algún día.
 *
 * Módulo feature-gated en el backend (MARKETING_AGENT_ENABLED): si está apagado
 * los endpoints devuelven 404 y la página lo informa en vez de romperse.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, RefreshCw, Loader, AlertTriangle, Ban, CheckCircle2, XCircle,
  Sparkles, Inbox, History, Image as ImageIcon, Bot, ShieldCheck, Send,
  ChevronLeft, ChevronRight, Rocket, ExternalLink, Unlock, Clock, KeyRound,
} from 'lucide-react'
import {
  getMarketingEstado, generarPieza, listarPendientes, listarPublicables,
  listarHistorial, aprobarPieza, rechazarPieza, publicarPieza, destrabarPieza,
} from '../../../services/marketingService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', {
    timeZone: 'America/La_Paz', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const CANAL_LABEL = { facebook: 'Facebook', x: 'X', tiktok: 'TikTok' }
const TIPO_LABEL  = { captacion: 'Captación', educacion: 'Educación' }

const ESTADO = {
  pendiente_aprobacion: { label: 'Pendiente',     color: '#C4CBD8', bg: '#C4CBD81A' },
  aprobado:             { label: 'Aprobada',      color: '#22C55E', bg: '#22C55E1A' },
  rechazado:            { label: 'Rechazada',     color: '#F87171', bg: '#EF44441A' },
  autopublicado:        { label: 'Autopublicada', color: '#22C55E', bg: '#22C55E1A' },
  publicado:            { label: 'Publicada',     color: '#22C55E', bg: '#22C55E1A' },
}

// ── Primitivas visuales ───────────────────────────────────────────────────────

function Card({ children, className = '', style }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: '#1A2340', border: '1px solid #263050', ...style }}>
      {children}
    </div>
  )
}

function Badge({ label, color, bg, icon: Icon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
      style={{ background: bg, color }}
    >
      {Icon && <Icon size={12} />}{label}
    </span>
  )
}

function EstadoBadge({ estado }) {
  const e = ESTADO[estado] ?? { label: estado, color: '#8A96B8', bg: '#1A2340' }
  return <Badge label={e.label} color={e.color} bg={e.bg} />
}

/**
 * Resalta dentro del texto los fragmentos exactos que disparó el clasificador.
 *
 * La comparación es insensible a tildes y mayúsculas (el backend guarda las
 * coincidencias normalizadas), pero se muestra SIEMPRE el texto original: se
 * buscan los índices sobre una copia normalizada y se corta el original. La
 * normalización NFD + quitar diacríticos preserva la longitud, así que los
 * índices coinciden.
 */
function Resaltado({ texto, coincidencias = [] }) {
  const partes = []
  const t = String(texto || '')

  if (!coincidencias.length) return <>{t}</>

  const re = new RegExp(coincidencias.filter(Boolean).map(escapeRe).join('|'), 'gi')
  const plano = norm(t)
  let ultimo = 0

  for (const m of plano.matchAll(re)) {
    if (m.index > ultimo) partes.push(t.slice(ultimo, m.index))
    partes.push(
      <mark
        key={`${m.index}-${m[0]}`}
        className="rounded px-1"
        style={{ background: '#FBBF2426', color: '#FBBF24', fontWeight: 600 }}
      >
        {t.slice(m.index, m.index + m[0].length)}
      </mark>,
    )
    ultimo = m.index + m[0].length
  }
  if (ultimo < t.length) partes.push(t.slice(ultimo))

  return <>{partes}</>
}

function Empty({ icon: Icon, titulo, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
           style={{ background: '#1A2340', border: '1px solid #263050' }}>
        <Icon size={24} className="text-[#4E5A7A]" />
      </div>
      <p className="text-[0.95rem] font-semibold text-white">{titulo}</p>
      {sub && <p className="text-[0.8rem] text-[#8A96B8] mt-1 max-w-sm">{sub}</p>}
    </div>
  )
}

/**
 * Salud de las credenciales de publicación, verificada contra la red.
 *
 * El backend (/estado) ya no reporta solo "hay una variable seteada": consulta a
 * la red y devuelve `credencial.ok` de TRES estados. La distinción importa y por
 * eso se pinta distinto cada uno:
 *
 *   false → la red dice que no sirve. Rojo, con el motivo textual de la red.
 *   null  → no se pudo verificar (timeout/red caída). Neutro, y se dice explícito
 *           que NO significa que esté rota: pintarlo de rojo haría que alguien
 *           regenere un token sano.
 *   true  → silencio. El estado sano no merece un cartel; si además vence pronto,
 *           ahí sí avisa.
 *
 * Solo se avisa de canales CONFIGURADOS (`disponible`). Un canal sin configurar
 * devuelve ok:false con motivo "Sin configurar", pero eso ya lo dice el aviso del
 * feature flag — repetirlo entrena a ignorar el cartel.
 *
 * Es informativo, no bloqueante: no deshabilita el botón de publicar. Quien
 * decide si se puede publicar es el backend, y bloquear la UI por una
 * verificación que pudo fallar por red sería peor que dejar intentar.
 */
const DIAS_AVISO_VENCIMIENTO = 14

function AvisoCredenciales({ canales = [] }) {
  const avisos = []

  for (const c of canales) {
    if (!c.disponible) continue
    const cr = c.credencial
    if (!cr) continue

    if (cr.ok === false) {
      avisos.push({
        tono:   'error',
        titulo: `La credencial de ${c.nombre} no sirve`,
        detalle: cr.motivo,
        codigo: cr.codigo,
        accion: 'Regenerá el token de página y actualizá FACEBOOK_PAGE_ACCESS_TOKEN. Hasta entonces, publicar va a fallar.',
      })
    } else if (cr.ok === null) {
      avisos.push({
        tono:   'neutro',
        titulo: `No se pudo verificar la credencial de ${c.nombre}`,
        detalle: cr.motivo,
        accion: 'No quiere decir que esté rota: la verificación no obtuvo respuesta. Probá actualizar en un momento.',
      })
    } else if (cr.expira) {
      const dias = Math.ceil((new Date(cr.expira) - Date.now()) / 86_400_000)
      if (dias <= DIAS_AVISO_VENCIMIENTO) {
        avisos.push({
          tono:   'neutro',
          titulo: dias <= 0
            ? `La credencial de ${c.nombre} venció`
            : `La credencial de ${c.nombre} vence en ${dias} día${dias === 1 ? '' : 's'}`,
          detalle: `Vencimiento: ${fmtFecha(cr.expira)}`,
          accion: 'Conviene regenerar el token antes de que caduque.',
        })
      }
    }
  }

  if (avisos.length === 0) return null

  return (
    <>
      {avisos.map((a, i) => {
        const err = a.tono === 'error'
        return (
          <div
            key={`${a.titulo}-${i}`}
            className="rounded-xl p-3.5 mb-4 flex items-start gap-3"
            style={err
              ? { background: '#EF44441A', border: '1px solid #EF444440' }
              : { background: '#C4CBD81A', border: '1px solid #C4CBD833' }}
          >
            <KeyRound size={16} className={`flex-shrink-0 mt-0.5 ${err ? 'text-[#F87171]' : 'text-[#C4CBD8]'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[0.8rem] font-semibold ${err ? 'text-[#FCA5A5]' : 'text-[#C4CBD8]'}`}>
                {a.titulo}
                {a.codigo != null && (
                  <span className="ml-2 font-normal text-[0.72rem] text-[#8A96B8]">código {a.codigo}</span>
                )}
              </p>
              {a.detalle && <p className="text-[0.75rem] text-[#8A96B8] mt-1 break-words">{a.detalle}</p>}
              <p className="text-[0.75rem] text-[#8A96B8] mt-1">{a.accion}</p>
            </div>
          </div>
        )
      })}
    </>
  )
}

function Paginacion({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null
  const { page, pages, total } = pagination
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-[0.75rem] text-[#4E5A7A]">{total} pieza{total === 1 ? '' : 's'}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#8A96B8' }}
        ><ChevronLeft size={16} /></button>
        <span className="text-[0.75rem] text-[#8A96B8]">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#8A96B8' }}
        ><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}

// ── Tarjeta de pieza ──────────────────────────────────────────────────────────

/**
 * Una pieza. En la cola trae acciones; en el historial es solo lectura.
 * `pieza.prohibida` viene del backend solo en la cola.
 */
function PiezaCard({ pieza, acciones = false, publicacion = false,
                    onAprobar, onRechazar, onPublicar, onDestrabar, ocupada }) {
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [mostrarRechazo, setMostrarRechazo] = useState(false)

  const coincidencias = pieza.coincidenciasClasificador ?? []
  const divergencia   = pieza.autoevaluacionRiesgo !== pieza.clasificacionFinal

  return (
    <Card className="p-5">
      {/* Cabecera: canal · tipo · estado · fecha */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge label={CANAL_LABEL[pieza.canal] ?? pieza.canal} color="#C4CBD8" bg="#C4CBD81A" />
        <Badge label={TIPO_LABEL[pieza.tipo] ?? pieza.tipo} color="#8A96B8" bg="#0F1628" />
        <EstadoBadge estado={pieza.estado} />
        <span className="ml-auto text-[0.7rem] text-[#4E5A7A]">{fmtFecha(pieza.createdAt)}</span>
      </div>

      {/* Prohibición absoluta — lo primero que tiene que ver el revisor */}
      {pieza.prohibida && (
        <div className="rounded-xl p-3 mb-4 flex items-start gap-3"
             style={{ background: '#EF44441A', border: '1px solid #EF444440' }}>
          <Ban size={18} className="text-[#F87171] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[0.8rem] font-bold text-[#F87171]">No se puede aprobar</p>
            <p className="text-[0.75rem] text-[#FCA5A5] mt-0.5">
              {pieza.motivoProhibicion}
              {pieza.coincidencia && <> — aparece <strong>“{pieza.coincidencia}”</strong></>}.
              {' '}Corresponde rechazarla.
            </p>
          </div>
        </div>
      )}

      {/* Contenido de la pieza, con lo que disparó el gate resaltado */}
      <h3 className="text-[1rem] font-bold text-white leading-snug mb-2">
        <Resaltado texto={pieza.titulo} coincidencias={coincidencias} />
      </h3>
      <p className="text-[0.85rem] text-[#C7CFE2] leading-relaxed whitespace-pre-line mb-3">
        <Resaltado texto={pieza.cuerpo} coincidencias={coincidencias} />
      </p>

      {pieza.sugerenciaVisual && (
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5" style={{ background: '#0F1628', border: '1px solid #263050' }}>
          <ImageIcon size={14} className="text-[#4E5A7A] flex-shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
            <Resaltado texto={pieza.sugerenciaVisual} coincidencias={coincidencias} />
          </p>
        </div>
      )}

      {/* Motivos del clasificador */}
      {pieza.motivosClasificador?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pieza.motivosClasificador.map(m => (
            <Badge key={m} label={m} color="#FBBF24" bg="#FBBF241A" icon={AlertTriangle} />
          ))}
        </div>
      )}

      {/* Los dos veredictos — la brecha entre ambos es la métrica del gate */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.7rem] pt-3"
           style={{ borderTop: '1px solid #263050' }}>
        <span className="flex items-center gap-1.5 text-[#8A96B8]">
          <Bot size={12} /> modelo: <strong style={{ color: pieza.autoevaluacionRiesgo === 'alto' ? '#FBBF24' : '#22C55E' }}>
            {pieza.autoevaluacionRiesgo}
          </strong>
        </span>
        <span className="flex items-center gap-1.5 text-[#8A96B8]">
          <ShieldCheck size={12} /> clasificador: <strong style={{ color: pieza.clasificacionFinal === 'alto' ? '#FBBF24' : '#22C55E' }}>
            {pieza.clasificacionFinal}
          </strong>
        </span>
        {divergencia && (
          <span className="text-[#4E5A7A]">· no coinciden (manda el clasificador)</span>
        )}
        {pieza.aprobadoPor && (
          <span className="text-[#4E5A7A] ml-auto">
            {pieza.estado === 'rechazado' ? 'rechazó' : 'aprobó'} {pieza.aprobadoPor} · {fmtFecha(pieza.aprobadoEn)}
          </span>
        )}
      </div>

      {/* Ya publicada — enlace al post real */}
      {pieza.publicacion?.postId && (
        <a href={pieza.publicacion.url} target="_blank" rel="noreferrer"
           className="mt-4 inline-flex items-center gap-2 text-[0.75rem] font-semibold"
           style={{ color: '#22C55E' }}>
          <ExternalLink size={13} /> Ver publicación · {fmtFecha(pieza.publicacion.publicadoEn)}
        </a>
      )}

      {/* Intento sin resolver: no sabemos si el post salió */}
      {pieza.publicacion?.enCurso && (
        <div className="rounded-xl p-3 mt-4 flex items-start gap-3"
             style={{ background: '#FBBF241A', border: '1px solid #FBBF2440' }}>
          <Clock size={18} className="text-[#FBBF24] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[0.8rem] font-bold text-[#FBBF24]">Intento de publicación sin resolver</p>
            <p className="text-[0.75rem] text-[#FDE68A] mt-0.5 leading-relaxed">
              No hubo respuesta de la red, así que no sabemos si el post salió. Revisá la página
              antes de reintentar: publicar de nuevo podría duplicarlo.
              {pieza.publicacion.ultimoError && <><br /><span className="text-[#4E5A7A]">{pieza.publicacion.ultimoError}</span></>}
            </p>
            {publicacion && (
              <button
                onClick={() => onDestrabar(pieza._id)} disabled={ocupada}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold disabled:opacity-40"
                style={{ background: 'transparent', border: '1px solid #FBBF2440', color: '#FBBF24' }}
              ><Unlock size={12} /> Ya verifiqué: no salió, destrabar</button>
            )}
          </div>
        </div>
      )}

      {/* Último error de publicación (sin traba) */}
      {publicacion && !pieza.publicacion?.enCurso && pieza.publicacion?.ultimoError && !pieza.publicacion?.postId && (
        <p className="mt-3 text-[0.72rem] text-[#F87171]">
          Último intento falló: {pieza.publicacion.ultimoError}
        </p>
      )}

      {/* Acción de publicar */}
      {publicacion && !pieza.publicacion?.postId && !pieza.publicacion?.enCurso && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #263050' }}>
          {pieza.publicable === false ? (
            <p className="text-[0.75rem] text-[#8A96B8] flex items-center gap-2">
              <AlertTriangle size={13} className="text-[#FBBF24]" />
              {pieza.motivoNoPublicable}
            </p>
          ) : (
            <button
              onClick={() => onPublicar(pieza._id)} disabled={ocupada}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8rem] font-bold disabled:opacity-40"
              style={{ background: '#C4CBD8', color: '#0F1628', boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
            >
              <Rocket size={15} /> Publicar en {CANAL_LABEL[pieza.canal] ?? pieza.canal}
            </button>
          )}
        </div>
      )}

      {/* Acciones (solo en la cola) */}
      {acciones && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #263050' }}>
          {mostrarRechazo ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                autoFocus
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Motivo del rechazo (queda en el registro de auditoría)"
                className="flex-1 rounded-xl px-3 py-2.5 text-[0.8rem] text-white outline-none"
                style={{ background: '#0F1628', border: '1px solid #263050' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onRechazar(pieza._id, motivoRechazo)}
                  disabled={ocupada}
                  className="px-4 py-2.5 rounded-xl text-[0.8rem] font-bold disabled:opacity-40"
                  style={{ background: '#EF4444', color: '#FFFFFF' }}
                >Confirmar rechazo</button>
                <button
                  onClick={() => setMostrarRechazo(false)}
                  className="px-4 py-2.5 rounded-xl text-[0.8rem] font-semibold"
                  style={{ background: 'transparent', border: '1.5px solid #263050', color: '#8A96B8' }}
                >Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Prohibida → no se ofrece el botón. Ver regla 2 en la cabecera. */}
              {!pieza.prohibida && (
                <button
                  onClick={() => onAprobar(pieza._id)}
                  disabled={ocupada}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8rem] font-bold disabled:opacity-40"
                  style={{ background: '#C4CBD8', color: '#0F1628', boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
                >
                  <CheckCircle2 size={15} /> Aprobar
                </button>
              )}
              <button
                onClick={() => setMostrarRechazo(true)}
                disabled={ocupada}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8rem] font-semibold disabled:opacity-40"
                style={{
                  background: pieza.prohibida ? '#EF4444' : 'transparent',
                  border: pieza.prohibida ? '1px solid #EF4444' : '1.5px solid #263050',
                  color: pieza.prohibida ? '#FFFFFF' : '#8A96B8',
                }}
              >
                <XCircle size={15} /> Rechazar
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cola',        label: 'Cola de aprobación',  icon: Inbox },
  { id: 'publicables', label: 'Listas para publicar', icon: Rocket },
  { id: 'generar',     label: 'Generar pieza',        icon: Sparkles },
  { id: 'historial',   label: 'Historial',            icon: History },
]

const EJEMPLOS = [
  'Genera una pieza de educación financiera para Facebook que explique qué es la custodia institucional, dirigida a personas que nunca usaron una plataforma de este tipo.',
  'Genera una pieza de captación para Facebook dirigida a empresas bolivianas que pagan a proveedores en el exterior.',
  'Genera una pieza educativa para TikTok que explique qué es una transferencia internacional y por qué la regulación importa.',
]

export default function MarketingAgentPage() {
  const [tab, setTab]           = useState('cola')
  const [estado, setEstado]     = useState(null)
  const [deshabilitado, setDeshabilitado] = useState(false)
  const [error, setError]       = useState(null)
  const [aviso, setAviso]       = useState(null)

  // Cola
  const [cola, setCola]             = useState({ piezas: [], pagination: null })
  const [cargandoCola, setCargandoCola] = useState(true)
  const [pagCola, setPagCola]       = useState(1)
  const [ocupada, setOcupada]       = useState(null)   // id de la pieza en curso

  // Generación
  const [tarea, setTarea]           = useState('')
  const [generando, setGenerando]   = useState(false)
  const [ultima, setUltima]         = useState(null)

  // Listas para publicar
  const [pubs, setPubs]             = useState({ piezas: [], pagination: null })
  const [cargandoPubs, setCargandoPubs] = useState(false)
  const [pagPubs, setPagPubs]       = useState(1)

  // Historial
  const [hist, setHist]             = useState({ piezas: [], pagination: null })
  const [cargandoHist, setCargandoHist] = useState(false)
  const [pagHist, setPagHist]       = useState(1)
  const [filtroEstado, setFiltroEstado] = useState('')

  // ── Carga ───────────────────────────────────────────────────────────────────

  const cargarEstado = useCallback(async () => {
    try {
      setEstado(await getMarketingEstado())
      setDeshabilitado(false)
    } catch (e) {
      // 404 = el router no está montado → el flag está apagado en el backend.
      if (e.status === 404) setDeshabilitado(true)
      else setError(e.message)
    }
  }, [])

  const cargarCola = useCallback(async (page = 1) => {
    setCargandoCola(true)
    try {
      setCola(await listarPendientes({ page, limit: 10 }))
      setError(null)
    } catch (e) {
      if (e.status === 404) setDeshabilitado(true)
      else setError(e.message)
    } finally {
      setCargandoCola(false)
    }
  }, [])

  const cargarPublicables = useCallback(async (page = 1) => {
    setCargandoPubs(true)
    try {
      setPubs(await listarPublicables({ page, limit: 10 }))
    } catch (e) {
      if (e.status !== 404) setError(e.message)
    } finally {
      setCargandoPubs(false)
    }
  }, [])

  const cargarHistorial = useCallback(async (page = 1, estadoFiltro = '') => {
    setCargandoHist(true)
    try {
      setHist(await listarHistorial({ page, limit: 10, estado: estadoFiltro || undefined }))
    } catch (e) {
      if (e.status !== 404) setError(e.message)
    } finally {
      setCargandoHist(false)
    }
  }, [])

  useEffect(() => { cargarEstado(); cargarCola(1) }, [cargarEstado, cargarCola])
  useEffect(() => {
    if (tab === 'historial') cargarHistorial(pagHist, filtroEstado)
  }, [tab, pagHist, filtroEstado, cargarHistorial])
  useEffect(() => {
    if (tab === 'publicables') cargarPublicables(pagPubs)
  }, [tab, pagPubs, cargarPublicables])

  // ── Acciones ────────────────────────────────────────────────────────────────

  async function handleGenerar() {
    if (!tarea.trim() || generando) return
    setGenerando(true); setError(null); setUltima(null)
    try {
      const { pieza } = await generarPieza(tarea.trim())
      setUltima(pieza)
      setTarea('')
      cargarEstado()
      if (pieza.estado === 'pendiente_aprobacion') cargarCola(1)
    } catch (e) {
      // 502 = el modelo devolvió algo inutilizable. El backend manda un `code`
      // accionable; se muestra tal cual porque dice si reintentar o reformular.
      setError(e.status === 502 ? `${e.message}` : e.message)
    } finally {
      setGenerando(false)
    }
  }

  async function handleAprobar(id) {
    setOcupada(id); setError(null); setAviso(null)
    try {
      await aprobarPieza(id)
      setAviso('Pieza aprobada. Queda registrada en el log de auditoría.')
      await Promise.all([cargarCola(pagCola), cargarEstado()])
    } catch (e) {
      if (e.status === 422) {
        setError(`${e.message}`)
        await cargarCola(pagCola)      // refresca para que aparezca el bloqueo
      } else if (e.status === 409) {
        setError('Otro administrador ya resolvió esta pieza.')
        await cargarCola(pagCola)
      } else setError(e.message)
    } finally {
      setOcupada(null)
    }
  }

  async function handleRechazar(id, motivo) {
    setOcupada(id); setError(null); setAviso(null)
    try {
      await rechazarPieza(id, motivo)
      setAviso('Pieza rechazada.')
      await Promise.all([cargarCola(pagCola), cargarEstado()])
    } catch (e) {
      if (e.status === 409) {
        setError('Otro administrador ya resolvió esta pieza.')
        await cargarCola(pagCola)
      } else setError(e.message)
    } finally {
      setOcupada(null)
    }
  }

  async function handlePublicar(id) {
    setOcupada(id); setError(null); setAviso(null)
    try {
      const { pieza } = await publicarPieza(id)
      setAviso(`Publicada en ${CANAL_LABEL[pieza.canal] ?? pieza.canal}.`)
      await Promise.all([cargarPublicables(pagPubs), cargarEstado()])
    } catch (e) {
      // 504 = no hubo respuesta de la red: la pieza queda trabada a propósito.
      setError(e.message)
      await cargarPublicables(pagPubs)
    } finally {
      setOcupada(null)
    }
  }

  async function handleDestrabar(id) {
    setOcupada(id); setError(null); setAviso(null)
    try {
      await destrabarPieza(id, 'Verificado en la red: el post no salió.')
      setAviso('Pieza destrabada. Podés reintentar la publicación.')
      await cargarPublicables(pagPubs)
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupada(null)
    }
  }

  // ── Módulo apagado ──────────────────────────────────────────────────────────

  if (deshabilitado) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: '#C4CBD81A' }}>
              <Megaphone size={20} className="text-[#C4CBD8]" />
            </div>
            <div>
              <h1 className="text-[1.05rem] font-bold text-white">Agente de marketing deshabilitado</h1>
              <p className="text-[0.85rem] text-[#8A96B8] mt-2 leading-relaxed">
                El módulo está apagado en el backend. Para activarlo, poné{' '}
                <code className="px-1.5 py-0.5 rounded text-[0.8rem]" style={{ background: '#0F1628', color: '#C4CBD8' }}>
                  MARKETING_AGENT_ENABLED=true
                </code>{' '}
                y reiniciá el servicio.
              </p>
              <p className="text-[0.78rem] text-[#4E5A7A] mt-3 leading-relaxed">
                Nota: mientras esté apagado, las piezas que hayan quedado en la cola siguen
                guardadas pero no son accesibles desde acá.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const pendientes = estado?.piezas?.pendiente_aprobacion ?? 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl">

      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#C4CBD81A' }}>
            <Megaphone size={20} className="text-[#C4CBD8]" />
          </div>
          <div>
            <h1 className="text-[1.15rem] font-bold text-white leading-tight">Agente de marketing</h1>
            <p className="text-[0.78rem] text-[#8A96B8]">
              Contenido generado con IA · toda pieza de riesgo pasa por revisión humana
            </p>
          </div>
        </div>
        <button
          onClick={() => { cargarEstado(); cargarCola(pagCola) }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[0.78rem] font-semibold"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#8A96B8' }}
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Resumen */}
      {estado && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'En cola',        valor: pendientes,                                   color: pendientes > 0 ? '#FBBF24' : '#FFFFFF' },
            { label: 'Autopublicadas', valor: estado.piezas?.autopublicado ?? 0,             color: '#22C55E' },
            { label: 'Aprobadas',      valor: estado.piezas?.aprobado ?? 0,                  color: '#22C55E' },
            { label: 'Publicadas',     valor: estado.piezas?.publicado ?? 0,                 color: '#22C55E' },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-3.5" style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <p className="text-[0.62rem] uppercase tracking-wide text-[#8A96B8] mb-1">{m.label}</p>
              <p className="text-[1.4rem] font-extrabold leading-none" style={{ color: m.color }}>{m.valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* Avisos */}

      {/* Estado de las credenciales: va arriba y en TODAS las pestañas a
          propósito. El costo de enterarse tarde es redactar y aprobar piezas
          contando con poder publicarlas. */}
      <AvisoCredenciales canales={estado?.publicacion?.canales} />

      {error && (
        <div className="rounded-xl p-3.5 mb-4 flex items-start gap-3" style={{ background: '#EF44441A', border: '1px solid #EF444440' }}>
          <AlertTriangle size={16} className="text-[#F87171] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8rem] text-[#FCA5A5] flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-[#F87171] text-[0.75rem] font-semibold">Cerrar</button>
        </div>
      )}
      {aviso && (
        <div className="rounded-xl p-3.5 mb-4 flex items-start gap-3" style={{ background: '#22C55E1A', border: '1px solid #22C55E40' }}>
          <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8rem] text-[#86EFAC] flex-1">{aviso}</p>
          <button onClick={() => setAviso(null)} className="text-[#22C55E] text-[0.75rem] font-semibold">Cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {TABS.map(t => {
          const activa = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8rem] font-semibold whitespace-nowrap"
              style={{
                background:  activa ? '#C4CBD81A' : 'transparent',
                border:      `1px solid ${activa ? '#C4CBD833' : '#263050'}`,
                color:       activa ? '#C4CBD8' : '#8A96B8',
              }}
            >
              <t.icon size={15} /> {t.label}
              {t.id === 'cola' && pendientes > 0 && (
                <span className="ml-1 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold"
                      style={{ background: '#FBBF24', color: '#0F1628' }}>{pendientes}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Cola ── */}
      {tab === 'cola' && (
        cargandoCola ? (
          <div className="flex justify-center py-16"><Loader size={22} className="animate-spin text-[#C4CBD8]" /></div>
        ) : cola.piezas.length === 0 ? (
          <Empty icon={Inbox} titulo="No hay piezas esperando revisión"
                 sub="Cuando el clasificador marque una pieza como de alto riesgo, va a aparecer acá." />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {cola.piezas.map(p => (
                <PiezaCard
                  key={p._id} pieza={p} acciones
                  onAprobar={handleAprobar} onRechazar={handleRechazar}
                  ocupada={ocupada === p._id}
                />
              ))}
            </div>
            <Paginacion pagination={cola.pagination} onPage={(n) => { setPagCola(n); cargarCola(n) }} />
          </>
        )
      )}

      {/* ── Listas para publicar ── */}
      {tab === 'publicables' && (
        <>
          {estado?.publicacion && !estado.publicacion.habilitada && (
            <div className="rounded-xl p-3.5 mb-4 flex items-start gap-3"
                 style={{ background: '#C4CBD81A', border: '1px solid #C4CBD833' }}>
              <AlertTriangle size={16} className="text-[#C4CBD8] flex-shrink-0 mt-0.5" />
              <p className="text-[0.8rem] text-[#C4CBD8]">
                La publicación a redes está deshabilitada. Para activarla, poné{' '}
                <code className="px-1.5 py-0.5 rounded text-[0.75rem]" style={{ background: '#0F1628' }}>
                  MARKETING_PUBLISH_ENABLED=true
                </code>.
              </p>
            </div>
          )}

          {cargandoPubs ? (
            <div className="flex justify-center py-16"><Loader size={22} className="animate-spin text-[#C4CBD8]" /></div>
          ) : pubs.piezas.length === 0 ? (
            <Empty icon={Rocket} titulo="Nada listo para publicar"
                   sub="Acá aparecen las piezas aprobadas y las de bajo riesgo que todavía no salieron al aire." />
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {pubs.piezas.map(p => (
                  <PiezaCard
                    key={p._id} pieza={p} publicacion
                    onPublicar={handlePublicar} onDestrabar={handleDestrabar}
                    ocupada={ocupada === p._id}
                  />
                ))}
              </div>
              <Paginacion pagination={pubs.pagination} onPage={setPagPubs} />
            </>
          )}
        </>
      )}

      {/* ── Generar ── */}
      {tab === 'generar' && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <label className="block text-[0.75rem] uppercase tracking-wide text-[#8A96B8] mb-2">
              ¿Qué pieza querés generar?
            </label>
            <textarea
              rows={4}
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              placeholder="Describí el contenido, el canal y a quién va dirigido…"
              className="w-full rounded-xl px-3.5 py-3 text-[0.85rem] text-white outline-none resize-y leading-relaxed"
              style={{ background: '#0F1628', border: '1px solid #263050' }}
            />

            <div className="flex flex-wrap gap-2 mt-3">
              {EJEMPLOS.map((ej, i) => (
                <button
                  key={i} onClick={() => setTarea(ej)}
                  className="text-[0.72rem] px-3 py-1.5 rounded-lg text-left"
                  style={{ background: '#0F1628', border: '1px solid #263050', color: '#8A96B8' }}
                >Ejemplo {i + 1}</button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={handleGenerar}
                disabled={!tarea.trim() || generando}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.85rem] font-bold disabled:opacity-40"
                style={{ background: '#C4CBD8', color: '#0F1628', boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
              >
                {generando ? <><Loader size={15} className="animate-spin" /> Generando…</> : <><Send size={15} /> Generar</>}
              </button>
              {estado?.modelo && (
                <span className="text-[0.72rem] text-[#4E5A7A]">modelo: {estado.modelo}</span>
              )}
            </div>
          </Card>

          {ultima && (
            <div>
              <p className="text-[0.75rem] uppercase tracking-wide text-[#8A96B8] mb-2">
                Resultado — {ultima.estado === 'autopublicado'
                  ? 'clasificada de bajo riesgo, apta para publicar'
                  : 'clasificada de alto riesgo, quedó en la cola de revisión'}
              </p>
              <PiezaCard pieza={ultima} />
            </div>
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {[['', 'Todas'], ...Object.entries(ESTADO).map(([k, v]) => [k, v.label])].map(([valor, label]) => {
              const activo = filtroEstado === valor
              return (
                <button
                  key={valor || 'todas'}
                  onClick={() => { setFiltroEstado(valor); setPagHist(1) }}
                  className="px-3.5 py-1.5 rounded-lg text-[0.75rem] font-semibold"
                  style={{
                    background: activo ? '#C4CBD81A' : 'transparent',
                    border:     `1px solid ${activo ? '#C4CBD833' : '#263050'}`,
                    color:      activo ? '#C4CBD8' : '#8A96B8',
                  }}
                >{label}</button>
              )
            })}
          </div>

          {cargandoHist ? (
            <div className="flex justify-center py-16"><Loader size={22} className="animate-spin text-[#C4CBD8]" /></div>
          ) : hist.piezas.length === 0 ? (
            <Empty icon={History} titulo="Sin piezas" sub="Todavía no se generó contenido con estos filtros." />
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {hist.piezas.map(p => <PiezaCard key={p._id} pieza={p} />)}
              </div>
              <Paginacion pagination={hist.pagination} onPage={setPagHist} />
            </>
          )}
        </>
      )}
    </div>
  )
}
