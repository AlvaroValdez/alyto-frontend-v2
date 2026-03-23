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
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
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
