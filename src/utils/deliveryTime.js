/**
 * deliveryTime.js — Texto estándar de tiempo estimado de entrega.
 *
 * Regla:
 *   • OwlPay/Harbor (corredores institucionales) → 1 a 3 días hábiles
 *   • Destino Bolivia (anchorBolivia manual)     → Hasta 24 horas hábiles
 *   • Resto LatAm via Vita Wallet                → Pocas horas
 */
export function getDeliveryTime(destCountry, payoutMethod) {
  const method = (payoutMethod ?? '').toLowerCase();
  if (method === 'owlpay' || method === 'harbor') return '1 a 3 días hábiles';
  if ((destCountry ?? '').toUpperCase() === 'BO')  return 'Hasta 24 horas hábiles';
  return 'Pocas horas';
}
