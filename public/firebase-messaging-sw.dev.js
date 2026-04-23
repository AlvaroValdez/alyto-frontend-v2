/**
 * firebase-messaging-sw.js — Service Worker para notificaciones push en background.
 * @version 2.0.0
 *
 * Las credenciales Firebase son públicas por diseño (igual que cualquier SDK web).
 * La seguridad real se maneja via Firebase Security Rules.
 */

// ── Lifecycle: activar inmediatamente sin esperar tabs abiertas ──────────
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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

// ── Click en notificación background ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data ?? {}
  const url  = data.transactionId
    ? `/transactions/${data.transactionId}`
    : '/'

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
