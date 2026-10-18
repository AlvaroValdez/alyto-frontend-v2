/**
 * Variables de entorno que un binario de producción NO puede llevar vacías.
 *
 * Vive aparte porque la consumen dos sitios y tenerla duplicada era parte del
 * problema: `scripts/checkProduction.js` (el informe legible, con ✔ y ✘) y
 * `vite.config.js` (la barrera real, que corta la compilación).
 *
 * `validate` recibe el valor ya comprobado como no vacío.
 */
export const REQUIRED_VARS = [
  {
    key: 'VITE_API_URL',
    validate: (v) => v.startsWith('https://'),
    hint: 'Debe comenzar con https://',
  },
  {
    key: 'VITE_WS_URL',
    validate: (v) => v.startsWith('wss://'),
    hint: 'Debe comenzar con wss://',
  },
  {
    key: 'VITE_SENTRY_DSN',
    validate: (v) => v.length > 0,
    hint: 'Requerida para monitoreo de errores en producción',
  },
  {
    key: 'VITE_FIREBASE_API_KEY',
    validate: (v) => v.length > 0,
    hint: 'Requerida para autenticación y notificaciones push',
  },
  {
    key: 'VITE_FIREBASE_PROJECT_ID',
    validate: (v) => v.length > 0,
    hint: 'Requerida para identificar el proyecto Firebase',
  },
  {
    key: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    validate: (v) => v.length > 0,
    hint: 'Requerida para Firebase Cloud Messaging',
  },
  {
    key: 'VITE_FIREBASE_APP_ID',
    validate: (v) => v.length > 0,
    hint: 'Requerida para inicializar Firebase App',
  },
  {
    key: 'VITE_FIREBASE_VAPID_KEY',
    validate: (v) => v.length > 0,
    hint: 'Requerida para notificaciones push web (VAPID)',
  },
  {
    key: 'VITE_SUPPORT_WHATSAPP',
    validate: (v) => v.startsWith('+'),
    hint: 'Debe incluir código de país, ej: +56949705364',
  },
];

/**
 * Devuelve los problemas encontrados en un objeto de variables ya resuelto.
 * No imprime nada ni lanza: decide quien llama.
 */
export function revisarEntorno(env) {
  const problemas = [];
  for (const { key, validate, hint } of REQUIRED_VARS) {
    const valor = env[key];
    if (!valor || String(valor).trim() === '') {
      problemas.push({ key, motivo: 'no definida o vacía', hint });
    } else if (!validate(String(valor))) {
      problemas.push({ key, motivo: 'valor inválido', hint });
    }
  }
  return problemas;
}
