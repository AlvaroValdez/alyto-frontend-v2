/**
 * inject-firebase-sw.js — Inyecta las variables de entorno Firebase en el SW.
 *
 * Ejecutar después de `vite build`:
 *   node scripts/inject-firebase-sw.js
 *
 * Por qué es necesario: los Service Workers no pasan por Vite, por lo que
 * las variables VITE_* no están disponibles en tiempo de ejecución del SW.
 * Las claves Firebase son públicas por diseño (igual que cualquier apiKey
 * de SDK web), por lo que hardcodearlas en el build es la práctica estándar.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const swSrc     = path.join(__dirname, '../public/firebase-messaging-sw.js')

// Mapa de placeholders → valores del .env
const replacements = {
  'self.FIREBASE_API_KEY':             `"${process.env.VITE_FIREBASE_API_KEY            ?? ''}"`,
  'self.FIREBASE_AUTH_DOMAIN':         `"${process.env.VITE_FIREBASE_AUTH_DOMAIN        ?? ''}"`,
  'self.FIREBASE_PROJECT_ID':          `"${process.env.VITE_FIREBASE_PROJECT_ID         ?? ''}"`,
  'self.FIREBASE_STORAGE_BUCKET':      `"${process.env.VITE_FIREBASE_STORAGE_BUCKET     ?? ''}"`,
  'self.FIREBASE_MESSAGING_SENDER_ID': `"${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''}"`,
  'self.FIREBASE_APP_ID':              `"${process.env.VITE_FIREBASE_APP_ID             ?? ''}"`,
}

let content = fs.readFileSync(swSrc, 'utf8')
for (const [placeholder, value] of Object.entries(replacements)) {
  content = content.replaceAll(placeholder, value)
}

// ── Escribir en dist/ (build de producción) ────────────────────────────────
const distSw = path.join(__dirname, '../dist/firebase-messaging-sw.js')
if (fs.existsSync(path.dirname(distSw))) {
  fs.writeFileSync(distSw, content)
  console.log('✅ firebase-messaging-sw.js inyectado en dist/')
} else {
  console.warn('⚠️  dist/ no existe — corre `vite build` primero.')
}

// ── Escribir versión de desarrollo (para depuración) ──────────────────────
const devSw = path.join(__dirname, '../public/firebase-messaging-sw.dev.js')
fs.writeFileSync(devSw, content)
console.log('✅ firebase-messaging-sw.dev.js generado en public/')
