/**
 * stellar.js — Resolución de red Stellar y enlaces al explorer.
 *
 * Regla del default:
 *   La producción de Alyto opera en MAINNET (horizon.stellar.org, USDC emitido
 *   por Circle). Por eso el default es 'public' y no 'testnet': si el build se
 *   despliega sin VITE_STELLAR_NETWORK, un enlace apuntando a testnet rompe la
 *   trazabilidad de fondos reales, mientras que el error inverso solo afecta a
 *   un entorno de pruebas. Los builds de testnet deben declararlo de forma
 *   explícita (ARG en el Dockerfile + arg en docker-compose.yml).
 *
 * Preferir siempre la red que reporta el backend (`tx.stellarNetwork`), que ya
 * viene resuelta como 'public' | 'testnet'; este módulo es el respaldo.
 */

/** Red del build: 'public' (mainnet) | 'testnet'. */
export const STELLAR_NETWORK =
  import.meta.env.VITE_STELLAR_NETWORK === 'testnet' ? 'testnet' : 'public';

/**
 * URL de una transacción en stellar.expert.
 * @param {string} hash            TXID Stellar.
 * @param {string} [network]       Red reportada por el backend, si existe.
 */
export function stellarExpertTx(hash, network) {
  return `https://stellar.expert/explorer/${network ?? STELLAR_NETWORK}/tx/${hash}`;
}
