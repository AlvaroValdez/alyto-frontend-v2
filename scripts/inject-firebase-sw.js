/**
 * inject-firebase-sw.js — Inyecta las variables de entorno Firebase en el SW.
 */
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

try {
  const { config } = await import('dotenv')
  config()
} catch {}

// Fallbacks hardcoded — Firebase web config es pública por diseño
const FIREBASE_CONFIG = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY             || 'AIzaSyA7i-m4O9qVFcr2QjzNP9mzYQge75JLEFE',
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN         || 'alyto-14283.firebaseapp.com',
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID          || 'alyto-14283',
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET      || 'alyto-14283.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '786578849025',
  appId:             process.env.VITE_FIREBASE_APP_ID              || '1:786578849025:web:aeeb9211525363541eef00',
}

console.log('Firebase config:', FIREBASE_CONFIG.projectId)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const swSrc     = path.join(__dirname, '../public/firebase-messaging-sw.js')

const replacements = {
  'self.FIREBASE_API_KEY':             `"${FIREBASE_CONFIG.apiKey}"`,
  'self.FIREBASE_AUTH_DOMAIN':         `"${FIREBASE_CONFIG.authDomain}"`,
  'self.FIREBASE_PROJECT_ID':          `"${FIREBASE_CONFIG.projectId}"`,
  'self.FIREBASE_STORAGE_BUCKET':      `"${FIREBASE_CONFIG.storageBucket}"`,
  'self.FIREBASE_MESSAGING_SENDER_ID': `"${FIREBASE_CONFIG.messagingSenderId}"`,
  'self.FIREBASE_APP_ID':              `"${FIREBASE_CONFIG.appId}"`,
}

let content = fs.readFileSync(swSrc, 'utf8')
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.replaceAll(placeholder, value)
}

const distSw = path.join(__dirname, '../dist/firebase-messaging-sw.js')
if (fs.existsSync(path.dirname(distSw))) {
  fs.writeFileSync(distSw, content)
  console.log('✅ firebase-messaging-sw.js inyectado en dist/')
} else {
  console.warn('⚠️  dist/ no existe — corre `vite build` primero.')
}

const devSw = path.join(__dirname, '../public/firebase-messaging-sw.dev.js')
fs.writeFileSync(devSw, content)
console.log('✅ firebase-messaging-sw.dev.js generado en public/')
