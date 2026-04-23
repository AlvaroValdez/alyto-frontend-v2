#!/usr/bin/env node
/**
 * send-money-spec.test.mjs
 *
 * Spec-compliance contract test for Send Money Flow v1.1 frontend
 * (docs/SEND_MONEY_FLOW.md §1–§6, anti-patterns §6).
 *
 * Not a UI e2e test — static-analysis assertions that catch spec drift:
 *   1. v1.1 step pages exist at canonical paths.
 *   2. Router serves /send/amount, /send/beneficiary, /send/confirm.
 *   3. Legacy Step components carry @deprecated markers.
 *   4. New step components are clean of forbidden user-facing terms.
 *   5. StepConfirm enforces two-state proof flow (§2.3, anti-patterns #11 #12).
 *   6. StepBeneficiary is a separate step (anti-pattern #14).
 *   7. v1.0 routes still exist for backward compat.
 *
 * Run: `node tests/send-money-spec.test.mjs`
 * Exits 0 on success, 1 on any failure.
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

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm,     '')
}

// ── §2: v1.1 step files exist ────────────────────────────────────────────────

section('File layout — v1.1 step pages exist')
const V11_PAGES = [
  'src/pages/send-money/SendMoneyFlow.jsx',
  'src/pages/send-money/StepAmount.jsx',
  'src/pages/send-money/StepBeneficiary.jsx',
  'src/pages/send-money/StepConfirm.jsx',
]
for (const p of V11_PAGES) {
  existsSync(resolve(ROOT, p))
    ? pass(p)
    : fail(`missing ${p}`)
}

// ── §2: v1.0 legacy step files still exist (backward compat) ─────────────────

section('File layout — v1.0 legacy pages still present')
const V10_PAGES = [
  'src/pages/send-money/StepDetails.jsx',
  'src/pages/send-money/StepReview.jsx',
  'src/pages/send-money/StepPayment.jsx',
]
for (const p of V10_PAGES) {
  existsSync(resolve(ROOT, p))
    ? pass(p)
    : fail(`missing legacy ${p}`)
}

// ── §2: router wires v1.1 routes ─────────────────────────────────────────────

section('Router — v1.1 canonical routes are wired')
const routerSrc = read('src/router/index.jsx') ?? ''
;[
  ['/send/*',           'wildcard send route'],
  ['SendMoneyFlow',     'SendMoneyFlow imported'],
  ['/send/amount',      '/send redirects to /send/amount'],
].forEach(([needle, label]) => {
  routerSrc.includes(needle) ? pass(label) : fail(`router missing: ${label}`)
})

// ── §2: SendMoneyFlow mounts v1.1 routes ─────────────────────────────────────

section('SendMoneyFlow — v1.1 routes mounted')
const flowSrc = read('src/pages/send-money/SendMoneyFlow.jsx') ?? ''
;[
  ['StepAmount',      'StepAmount imported'],
  ['StepBeneficiary', 'StepBeneficiary imported'],
  ['StepConfirm',     'StepConfirm imported'],
  ['path="amount"',   'amount route'],
  ['path="beneficiary"', 'beneficiary route'],
  ['path="confirm"',  'confirm route'],
].forEach(([needle, label]) => {
  flowSrc.includes(needle) ? pass(label) : fail(`SendMoneyFlow missing: ${label}`)
})

// ── §2: deprecation markers on legacy components ──────────────────────────────

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

// ── §1.5 / §6.10 / §6.1 / §6.9: forbidden user-facing terms ─────────────────

section('Forbidden terms — v1.1 step pages are clean')
const FORBIDDEN = [
  { re: /\bUSDC\b/,             label: 'USDC user-facing string' },
  { re: /\bStellar\b/,          label: 'Stellar user-facing string' },
  { re: /vitaRateMarkup/,       label: 'vitaRateMarkup reference' },
  { re: /pivot currency/i,      label: 'pivot-currency reference' },
  { re: /\bremesa|remittance/i, label: 'remesa/remittance (compliance)' },
]
for (const page of V11_PAGES) {
  const raw = read(page)
  if (raw === null) continue
  const src = stripComments(raw)
  for (const { re, label } of FORBIDDEN) {
    re.test(src)
      ? fail(`${page} — forbidden: ${label}`)
      : pass(`${page} — clean of ${label}`)
  }
}

// ── §2.1: StepAmount delegates to Step1Amount ────────────────────────────────

section('§2.1 — StepAmount wraps Step1Amount')
const stepAmount = read('src/pages/send-money/StepAmount.jsx') ?? ''
;[
  ['Step1Amount',           'uses Step1Amount component'],
  ['/send/beneficiary',     'navigates to /send/beneficiary on next'],
].forEach(([needle, label]) => {
  stepAmount.includes(needle) ? pass(label) : fail(`StepAmount missing: ${label}`)
})

// ── §2.2: StepBeneficiary is a separate step (anti-pattern #14) ──────────────

section('§2.2 — StepBeneficiary is independent (anti-pattern #14)')
const stepBeneficiary = read('src/pages/send-money/StepBeneficiary.jsx') ?? ''
;[
  ['Step3Beneficiary',      'uses Step3Beneficiary component'],
  ['/send/confirm',         'navigates to /send/confirm on next'],
  ['/send/amount',          'redirects to /send/amount if no quote'],
].forEach(([needle, label]) => {
  stepBeneficiary.includes(needle) ? pass(label) : fail(`StepBeneficiary missing: ${label}`)
})

// Guardrail: StepBeneficiary must NOT contain proof upload logic (anti-pattern #11)
const beneficiarySrc = stripComments(stepBeneficiary)
if (/comprobante|proofFile|uploadComprobante/.test(beneficiarySrc)) {
  fail('StepBeneficiary contains proof upload logic — anti-pattern #11 violation')
} else {
  pass('StepBeneficiary has no proof upload (anti-pattern #11 satisfied)')
}

// ── §2.3: StepConfirm has State A (review) + State B (payment+proof) ─────────

section('§2.3 — StepConfirm two internal states')
const stepConfirm = read('src/pages/send-money/StepConfirm.jsx') ?? ''
;[
  ['ReviewState',           'ReviewState component exists'],
  ['PaymentState',          'PaymentState component exists'],
  ['initPayment',           'State A calls initPayment'],
  ['uploadComprobante',     'State B calls uploadComprobante (anti-pattern #12)'],
  ['Obligatorio',           'proof labeled Obligatorio'],
  ['proofFile',             'proof file state exists'],
  ['Ver detalles',          'expandable details section (spec §2.3 State A)'],
  ['Editar',                'Editar navigates back to /send/beneficiary'],
  ['Confirmar',             'Confirmar button creates tx'],
  ['/send/beneficiary',     'Editar targets /send/beneficiary'],
].forEach(([needle, label]) => {
  stepConfirm.includes(needle) ? pass(label) : fail(`StepConfirm missing: ${label}`)
})

// Guardrail: initPayment must be in ReviewState only, not StepPayment-style
const confirmSrc = stripComments(stepConfirm)
if (/paymentProofBase64/.test(confirmSrc)) {
  fail('StepConfirm attaches paymentProofBase64 to initPayment — anti-pattern #12 violation')
} else {
  pass('StepConfirm does not attach paymentProofBase64 (anti-pattern #12 satisfied)')
}

// ── §2.3: StepPayment v1.0 still enforces mandatory proof ────────────────────

section('§2.3 — StepPayment (v1.0) still enforces mandatory proof')
const stepPayment = read('src/pages/send-money/StepPayment.jsx') ?? ''
;[
  ['Obligatorio',        'comprobante labeled "Obligatorio"'],
  ['uploadComprobante',  'proof attached via uploadComprobante helper'],
  ['proofFile',          'proof file state exists'],
].forEach(([needle, label]) => {
  stepPayment.includes(needle) ? pass(label) : fail(`StepPayment missing: ${label}`)
})

const stepPaymentSrc = stripComments(stepPayment)
if (/initPayment\s*\(/.test(stepPaymentSrc)) {
  fail('StepPayment still calls initPayment — should be uploadComprobante only (spec §2.3)')
} else {
  pass('StepPayment does not call initPayment (tx created in StepReview)')
}

// ── §2.2 v1.0: StepReview has expandable details ─────────────────────────────

section('§2.2 (v1.0) — StepReview expandable detail view')
const stepReview = read('src/pages/send-money/StepReview.jsx') ?? ''
;[
  ['Ver detalles', 'expand toggle label'],
  ['Editar',       'Editar button'],
  ['Confirmar',    'Confirmar button'],
].forEach(([needle, label]) => {
  stepReview.includes(needle) ? pass(label) : fail(`StepReview missing: ${label}`)
})

const stepReviewSrc = stripComments(stepReview)
if (/paymentProofBase64/.test(stepReviewSrc)) {
  fail('StepReview still ships paymentProofBase64 — Step 2 must create tx without proof')
} else {
  pass('StepReview does not attach paymentProofBase64 to create request')
}

// ── Final ────────────────────────────────────────────────────────────────────

console.log('')
if (failures === 0) {
  console.log('✅  All spec-compliance checks passed.')
  process.exit(0)
} else {
  console.log(`❌  ${failures} check(s) failed.`)
  process.exit(1)
}
