/**
 * notificationRoutes.js — Mapeo tipo de notificación → ruta in-app.
 *
 * ⚠️ Debe mantenerse en paridad con resolveNotificationUrl() de
 * `public/firebase-messaging-sw.js` (web push background). Si cambias el mapeo
 * aquí, replícalo allá (el SW no puede importar módulos ES).
 */

export function resolveNotificationUrl(data = {}) {
  const type = data.type ?? '';
  const txId = data.transactionId;

  // Transacciones
  if (txId && (
    type === 'transfer_initiated' ||
    type === 'payin_confirmed'    ||
    type === 'payment_completed'  ||
    type === 'payment_failed'     ||
    type === 'payout_sent'
  )) return `/transactions/${txId}`;

  // Wallet BOB (incluye USDC→BOB, cuyo resultado acredita BOB)
  if (
    type === 'deposit_confirmed'     ||
    type === 'withdrawal_requested'  ||
    type === 'wallet_frozen'         ||
    type === 'wallet_unfrozen'       ||
    type === 'p2p_received'          ||
    type === 'usdc_to_bob_confirmed' ||
    type === 'usdc_to_bob_rejected'
  ) return '/wallet';

  // Wallet USDC (incluye BOB→USDC, cuyo resultado acredita USDC)
  if (
    type === 'usdc_received'        ||
    type === 'conversion_confirmed' ||
    type === 'conversion_rejected'
  ) return '/wallet/usdc';

  // KYB
  if (
    type === 'kyb_approved'  ||
    type === 'kyb_rejected'  ||
    type === 'kyb_more_info' ||
    type === 'kyb_received'
  ) return '/kyb';

  // Reclamos
  if (type === 'reclamo_received' || type === 'reclamo_resolved') return '/reclamos';

  if (txId) return `/transactions/${txId}`;

  return '/notifications';
}
