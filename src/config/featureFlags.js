/**
 * featureFlags.js — Interruptores de funcionalidad por entorno.
 *
 * Las VITE_* se resuelven en tiempo de build y quedan embebidas en el bundle:
 * cambiar un flag exige recompilar y volver a desplegar, no basta con reiniciar
 * el servidor.
 */

/**
 * Fintoc (pay-in A2A Chile) visible en el checkout.
 *
 * La integración sigue completa en el frontend y en el backend: este flag solo
 * decide si el usuario ve la opción. Apagarlo no borra nada ni rompe las
 * transacciones ya creadas con `payinMethod: 'fintoc'`.
 *
 * - Sin definir en producción  → apagado (la opción no se muestra).
 * - Sin definir en desarrollo  → encendido, para poder probar el flujo entero.
 * - `VITE_FINTOC_ENABLED=true` → encendido en cualquier entorno.
 *
 * ⚠️ Chile hoy no tiene otro método de pay-in, así que con el flag apagado los
 * usuarios chilenos se quedan sin forma de pagar y Step2PayinMethod les muestra
 * un estado vacío explícito en lugar de una lista en blanco.
 */
export const FINTOC_ENABLED =
  import.meta.env.VITE_FINTOC_ENABLED !== undefined
    ? import.meta.env.VITE_FINTOC_ENABLED === 'true'
    : !import.meta.env.PROD
