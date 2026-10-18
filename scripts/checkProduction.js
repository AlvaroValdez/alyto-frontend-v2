#!/usr/bin/env node
/**
 * checkProduction.js
 * Verifica variables de entorno del frontend antes del build de producción.
 * Ejecutar: node scripts/checkProduction.js
 */

import { REQUIRED_VARS } from './requiredEnv.js';

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

function ok(msg)   { console.log(`  ${c.green}✔${c.reset}  ${msg}`); }
function fail(msg) { console.log(`  ${c.red}✘${c.reset}  ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`); }

// ── Carga .env.production si existe ──────────────────────────────────────────
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = resolve(__dirname, '..');
const envFile   = resolve(rootDir, '.env.production');

if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ── Encabezado ────────────────────────────────────────────────────────────────
console.log('');
console.log(`${c.bold}${c.cyan}╔══════════════════════════════════════════════╗${c.reset}`);
console.log(`${c.bold}${c.cyan}║   Alyto Frontend V2.0 — Check Producción     ║${c.reset}`);
console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════╝${c.reset}`);
console.log('');

// ── Verificación ──────────────────────────────────────────────────────────────
let errors   = 0;
let warnings = 0;

for (const { key, validate, hint } of REQUIRED_VARS) {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    fail(`${c.bold}${key}${c.reset} ${c.red}— no definida o vacía${c.reset}`);
    warn(`  ${c.gray}${hint}${c.reset}`);
    errors++;
    continue;
  }

  if (!validate(value)) {
    fail(`${c.bold}${key}${c.reset} ${c.red}— valor inválido${c.reset}`);
    warn(`  ${c.gray}${hint}${c.reset}`);
    errors++;
    continue;
  }

  // Enmascarar valores sensibles en el log
  const SENSITIVE = ['API_KEY', 'DSN', 'APP_ID', 'SENDER_ID', 'VAPID'];
  const masked = SENSITIVE.some((s) => key.includes(s))
    ? value.slice(0, 8) + '••••••••'
    : value;

  ok(`${c.bold}${key}${c.reset} ${c.gray}→ ${masked}${c.reset}`);
}

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('');
console.log(`${c.bold}${'─'.repeat(48)}${c.reset}`);

if (errors === 0) {
  console.log(`${c.green}${c.bold}  ✔ Todas las variables están correctas. Iniciando build…${c.reset}`);
  console.log(`${'─'.repeat(48)}`);
  console.log('');
} else {
  console.log(`${c.red}${c.bold}  ✘ ${errors} variable(s) con error. El build ha sido detenido.${c.reset}`);
  console.log(`${'─'.repeat(48)}`);
  console.log('');
  console.log(`${c.yellow}  Copia .env.production y completa los valores faltantes.${c.reset}`);
  console.log('');
  process.exit(1);
}
