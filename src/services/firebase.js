/**
 * firebase.js — Inicialización de Firebase Cloud Messaging (FCM)
 *
 * El objeto `messaging` puede ser null si el entorno no soporta
 * Service Workers (tests, SSR) o si la config está incompleta.
 * El hook usePushNotifications maneja este caso gracefully.
 */

import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyA7i-m4O9qVFcr2QjzNP9mzYQge75JLEFE',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'alyto-14283.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'alyto-14283',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'alyto-14283.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| '786578849025',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:786578849025:web:aeeb9211525363541eef00',
}

let messaging = null

try {
  if (firebaseConfig.apiKey && 'serviceWorker' in navigator) {
    const app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  }
} catch (err) {
  console.warn('[Alyto FCM] Firebase init failed:', err.message)
}

export { messaging, getToken, onMessage }
