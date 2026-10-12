/**
 * firebase-messaging-sw.js — Service Worker para notificaciones push en background.
 * @version 2.0.0
 *
 * Las credenciales Firebase son públicas por diseño (igual que cualquier SDK web).
 * La seguridad real se maneja via Firebase Security Rules.
 */

// ── Caché de la PWA ───────────────────────────────────────────────────────
// Este service worker hace DOS cosas: push en background y caché para que la
// app sea instalable. Van juntas por obligación, no por gusto: el SDK de
// Firebase registra este archivo en el ámbito raíz, así que un segundo service
// worker ahí lo reemplazaría y perderíamos las notificaciones.
//
// ⚠️ REGLA INVIOLABLE: nunca se cachea una respuesta de la API. Servir un saldo
// o un estado de transacción viejo es peor que no funcionar. La API vive en
// otro origen (api.alyto.app), así que el filtro de same-origin ya la excluye;
// el guard explícito de `/api/` es por si algún día se sirve tras un proxy.
const CACHE = 'alyto-shell-v1'
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll([SHELL, '/manifest.webmanifest', '/logo192.png']))
      .catch(() => {})   // una precarga fallida no debe impedir la instalación
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n.startsWith('alyto-shell-') && n !== CACHE)
             .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return   // API y terceros: nunca
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.endsWith('firebase-messaging-sw.js')) return

  // Navegación (SPA): red primero para no servir un shell viejo tras un
  // despliegue; si no hay red, el shell cacheado y React resuelve la ruta.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(SHELL).then((r) => r ?? Response.error()))
    )
    return
  }

  // Estáticos: Vite les pone hash en el nombre, así que una URL siempre
  // devuelve el mismo contenido y la caché puede ir primero.
  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      }))
    )
  }
})

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

// ── Configuración ─────────────────────────────────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyA7i-m4O9qVFcr2QjzNP9mzYQge75JLEFE",
  authDomain:        "alyto-14283.firebaseapp.com",
  projectId:         "alyto-14283",
  storageBucket:     "alyto-14283.firebasestorage.app",
  messagingSenderId: "786578849025",
  appId:             "1:786578849025:web:aeeb9211525363541eef00",
})

const messaging = firebase.messaging()

// ── Notificaciones en background ──────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  const data = payload.data ?? {}

  if (!title) return

  self.registration.showNotification(title, {
    body:  body ?? '',
    icon:  '/logo192.png',
    badge: '/badge.png',
    data,
    // Agrupar notificaciones por tipo para no saturar el centro de notificaciones
    tag: data.type ?? 'alyto-notification',
    renotify: true,
  })
})

// ── Deep link por tipo de notificación ───────────────────────────────────
function resolveNotificationUrl(data) {
  const type = data.type ?? ''
  const txId = data.transactionId

  // Transacciones
  if (txId && (
    type === 'transfer_initiated' ||
    type === 'payin_confirmed'    ||
    type === 'payment_completed'  ||
    type === 'payment_failed'     ||
    type === 'payout_sent'
  )) return `/transactions/${txId}`

  // Wallet BOB
  if (
    type === 'deposit_confirmed'    ||
    type === 'withdrawal_requested' ||
    type === 'wallet_frozen'        ||
    type === 'wallet_unfrozen'      ||
    type === 'p2p_received'
  ) return '/wallet'

  // Wallet USDC
  if (
    type === 'usdc_received'                ||
    type === 'usdc_conversion_confirmed'    ||
    type === 'usdc_conversion_rejected'
  ) return '/wallet/usdc'

  // KYB
  if (
    type === 'kyb_approved'   ||
    type === 'kyb_rejected'   ||
    type === 'kyb_more_info'  ||
    type === 'kyb_received'
  ) return '/kyb'

  // Reclamos
  if (type === 'reclamo_received' || type === 'reclamo_resolved') return '/reclamos'

  // Si hay transactionId pero sin tipo reconocido — ir a la tx
  if (txId) return `/transactions/${txId}`

  // Default: centro de notificaciones
  return '/notifications'
}

// ── Click en notificación background ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  const url  = resolveNotificationUrl(data)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Enfocar tab existente si ya está abierta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Abrir nueva tab si no hay ninguna abierta
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
