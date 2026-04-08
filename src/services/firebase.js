/**
 * firebase.js — Inicialización de Firebase Cloud Messaging (FCM)
 *
 * Las credenciales Firebase web son públicas por diseño —
 * igual que en cualquier app React/Angular/Vue con Firebase.
 * La seguridad se maneja via Firebase Security Rules, no ocultando las keys.
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase web config — pública por diseño (igual que cualquier SDK web)
// Seguridad real via Firebase Security Rules en console.firebase.google.com
const firebaseConfig = {
  apiKey:            'AIzaSyA7i-m4O9qVFcr2QjzNP9mzYQge75JLEFE',
  authDomain:        'alyto-14283.firebaseapp.com',
  projectId:         'alyto-14283',
  storageBucket:     'alyto-14283.firebasestorage.app',
  messagingSenderId: '786578849025',
  appId:             '1:786578849025:web:aeeb9211525363541eef00',
}

let messaging = null

try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Evitar doble inicialización en hot reload
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    messaging = getMessaging(app)
    console.info('[Alyto FCM] Firebase inicializado. Project:', firebaseConfig.projectId)
  }
} catch (err) {
  console.error('[Alyto FCM] Firebase init failed:', err.message)
}

export { messaging, getToken, onMessage }
