#!/usr/bin/env node
/**
 * send-money-spec.test.mjs
 *
 * Spec-compliance contract test for the Send Money Flow v1.0 frontend
 * implementation (docs/SEND_MONEY_FLOW.md §1, §2, §6).
 *
 * This is not a UI e2e test (the repo has no test framework installed);
 * it is a static-analysis assertion suite that catches the kind of drift
 * the spec exists to prevent:
 *
 *   1. The 3 new step pages exist at the canonical paths.
 *   2. The router serves /send/details, /send/review, /send/payment/:txId
 *      and redirects /send → /send/details.
 *   3. Legacy Step components carry @deprecated markers.
 *   4. The new step components do NOT reference forbidden user-facing
 *      terms: "USDC", "Stellar", "vitaRateMarkup", "pivot currency".
 *      (spec §1.5, §6.1, §6.9, §6.10)
 *
 * Run: `node tests/send-money-spec.test.mjs`
 * Exits 0 on success, 1 on any failure. Intended for CI / pre-commit.
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath }            from 'node:url'
import { dirname, resolve }         from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')

let failures = 0
function pass(msg) { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.log(`  ✗ ${msg}`); failures++ }
function section(title) { console.log(`\n▸ ${title}`) }

function read(path) {
  const abs = resolve(ROOT, path)
  if (!existsSync(abs)) return null
  return readFileSync(abs, 'utf8')
}

// Strip /* */ block comments and // line comments so forbidden-term scans
// don't flag the spec quotes we put in JSDoc headers.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm,     '')
}

// ── §1 / §2: files exist ─────────────────────────────────────────────────────

section('File layout — 3-step flow pages exist')
const NEW_PAGES = [
  'src/pages/send-money/SendMoneyFlow.jsx',
  'src/pages/send-money/StepDetails.jsx',
  'src/pages/send-money/StepReview.jsx',
  'src/pages/send-money/StepPayment.jsx',
]
for (const p of NEW_PAGES) {
  existsSync(resolve(ROOT, p))
    ? pass(p)
    : fail(`missing ${p}`)
}

// ── §2: router wires the new routes ──────────────────────────────────────────

section('Router — canonical routes are wired')
const routerSrc = read('src/router/index.jsx') ?? ''
;[
  ['/send/*',         'wildcard send route'],
  ['SendMoneyFlow',   'SendMoneyFlow imported'],
  ['/send/details',   '/send redirects to /send/details'],
].forEach(([needle, label]) => {
  routerSrc.includes(needle) ? pass(label) : fail(`router missing: ${label}`)
})

// ── §2: legacy step components carry @deprecated markers ─────────────────────

section('Deprecation — legacy step components marked')
const DEPRECATED = [
  'src/components/SendMoney/Step2PayinMethod.jsx',
  'src/components/SendMoney/Step4Confirm.jsx',
  'src/components/SendMoney/Step5PaymentWidget.jsx',
  'src/components/SendMoney/Step6Success.jsx',
  'src/components/SendMoney/StepIndicator.jsx',
  'src/pages/SendMoney/SendMoneyPage.jsx',
]
for (const p of DEPRECATED) {
  const src = read(p)
  if (src === null) { fail(`${p} — file missing (cannot check marker)`); continue }
  src.includes('@deprecated')
    ? pass(`${p}`)
    : fail(`${p} — missing @deprecated`)
}

// ── §1.5 / §6.10 / §6.1 / §6.9: forbidden user-facing terms ──────────────────
//
// The new step pages must never expose the pivot-currency, Stellar, Vita or
// vitaRateMarkup in end-user UI strings. (These may still appear in imports
// or audit fields handled server-side — we only scan the new step files.)

section('Forbidden terms — new step pages are clean')
const FORBIDDEN = [
  { re: /\bUSDC\b/,            label: 'USDC user-facing string' },
  { re: /\bStellar\b/,         label: 'Stellar user-facing string' },
  { re: /vitaRateMarkup/,      label: 'vitaRateMarkup reference' },
  { re: /pivot currency/i,     label: 'pivot-currency reference' },
  { re: /\bremesa|remittance/i,label: 'remesa/remittance (compliance)' },
]
for (const page of NEW_PAGES) {
  const raw = read(page)
  if (raw === null) continue
  const src = stripComments(raw)
  for (const { re, label } of FORBIDDEN) {
    re.test(src)
      ? fail(`${page} — forbidden: ${label}`)
      : pass(`${page} — clean of ${label}`)
  }
}

// ── §2.3: StepPayment enforces mandatory proof upload via uploadComprobante ──
//
// Per SEND_MONEY_FLOW.md §2.3 the tx is created in Step 2 without proof;
// Step 3 uploads the comprobante through the dedicated
// POST /payments/:txId/comprobante endpoint (uploadComprobante helper).

section('§2.3 — StepPayment enforces mandatory proof upload')
const stepPayment = read('src/pages/send-money/StepPayment.jsx') ?? ''
;[
  ['Obligatorio',        'comprobante labeled "Obligatorio"'],
  ['uploadComprobante',  'proof attached via uploadComprobante helper'],
  ['proofFile',          'proof file state exists'],
].forEach(([needle, label]) => {
  stepPayment.includes(needle) ? pass(label) : fail(`StepPayment missing: ${label}`)
})

// Guardrail: proof must NOT be attached to initPayment anymore.
const stepPaymentSrc = stripComments(stepPayment)
if (/initPayment\s*\(/.test(stepPaymentSrc)) {
  fail('StepPayment still calls initPayment — should be uploadComprobante (spec §2.3)')
} else {
  pass('StepPayment does not call initPayment (proof is a separate upload)')
}
const stepReviewRaw = read('src/pages/send-money/StepReview.jsx') ?? ''
if (/paymentProofBase64/.test(stripComments(stepReviewRaw))) {
  fail('StepReview still ships paymentProofBase64 — Step 2 must create tx without proof')
} else {
  pass('StepReview does not attach paymentProofBase64 to create request')
}

// ── §2.2: StepReview has "Ver detalles" expand/collapse ──────────────────────

section('§2.2 — StepReview has expandable detail view')
const stepReview = read('src/pages/send-money/StepReview.jsx') ?? ''
;[
  ['Ver detalles', 'expand toggle label'],
  ['Editar',       'Editar button back to /send/details'],
  ['Confirmar',    'Confirmar button advances to payment'],
].forEach(([needle, label]) => {
  stepReview.includes(needle) ? pass(label) : fail(`StepReview missing: ${label}`)
})

// ── Final ────────────────────────────────────────────────────────────────────

console.log('')
if (failures === 0) {
  console.log('✅  All spec-compliance checks passed.')
  process.exit(0)
} else {
  console.log(`❌  ${failures} check(s) failed.`)
  process.exit(1)
}
