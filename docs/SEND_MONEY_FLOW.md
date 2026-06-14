# Send Money Flow — Living Document

> Last updated: June 2026 (v1.3 — añade payin `bankQr` BEC QR Connect)
> This documents **actual working code**, not aspirational spec.
> Update this file whenever the flow changes.
> Both repos (`alyto-backend-v2` and `alyto-frontend-v2`) carry an identical copy.

---

## 1. Overview

Alyto supports three legal entities. The send-money flow varies by `user.legalEntity`:

| Entity | Origin currency | Payin | Payout routing |
|--------|----------------|-------|----------------|
| **SpA** (Chile) | CLP | Fintoc A2A (PISP) | Vita Wallet (LatAm) / anchorBolivia (BOB) |
| **SRL** (Bolivia) | BOB | Manual (`payinMethod = 'manual'`) **o** QR bancario automático (`payinMethod = 'bankQr'`, BEC QR Connect) | Vita Wallet (LatAm) / OwlPay Harbor v2 (CN/NG/global) |
| **LLC** (USA) | USD | Manual: wire transfer (`payinMethod = 'manual'`) | OwlPay Harbor v2 (global) |

**SRL and LLC auto-skip Step 2** — the Step2 component’s `useEffect` fires on mount and forces `payinMethod = 'manual'` + `_skipStep2 = true`, jumping straight to Step 3. They never see the payin-method picker.

In addition to the personal/business split, every user has an `accountType ∈ { personal, business }` flag (set on KYB approval). This is an **orthogonal** axis to `legalEntity` and only affects pricing — see §8.

---

## 2. Frontend — Step Structure

### Hook: `src/hooks/useSendMoney.js`

```
TOTAL_STEPS = 6
State shape: { step: Number, stepData: Object }
```

`stepData` is built **cumulatively** — each `nextStep(data)` merges `data` into the existing state.

Key methods:
- `nextStep(data, targetStep?)` — advances (or jumps to `targetStep`) and merges data.
- `prevStep()` — if `step === 3 && stepData._skipStep2` → jumps back to step 1, not step 2.
- `submitPayment(payload)` — thin wrapper around `initPayment()` that captures exceptions in Sentry before re-throwing.
- `resetFlow()` — full reset; called by SendMoneyPage on unmount. Flow state is **memory-only** (no sessionStorage / localStorage persistence).

---

### SpA Flow (Chile)

```
Step 1: Amount + destination country
  │  nextStep({ originAmount, destinationCountry, quote })
  ↓
Step 2: Payin method (Fintoc — only available option)
  │  nextStep({ payinMethod: 'fintoc', payinVariant: 'fintoc' })
  ↓
Step 3: Beneficiary form (Vita Wallet — dynamic schema)
  │  nextStep({ beneficiaryData, contactId })
  ↓
Step 4: Confirmation → POST /payments/crossborder
  │  nextStep({ transactionId, payinUrl, payinInstructions, paymentQR, paymentQRStatic })
  ↓
Step 5: Fintoc widget (new tab) + polling every 5s
  │  nextStep({ completedAt })
  ↓
Step 6: Success screen
```

### SRL Flow (Bolivia)

```
Step 1: Amount + destination country
  │  nextStep({ originAmount, destinationCountry, quote })
  ↓
  [Step2 useEffect on mount → user.legalEntity === 'SRL' → auto-skip]
  │  nextStep({ payinMethod: 'manual', _skipStep2: true })  ← jumps to step 3
  ↓
Step 3: Beneficiary form
       — Vita corridors: dynamic schema from backend
       — OwlPay corridors (CN, NG): static config from owlPayForms.js
  │  nextStep({ beneficiaryData, contactId })
  ↓
Step 4: Confirmation → POST /payments/crossborder
  │  nextStep({ transactionId, payinInstructions, paymentQR, paymentQRStatic })
  ↓
Step 5: Manual payment screen (ManualPayinScreen)
  │  → Static QR images (paymentQRStatic[] — Tigo Money / Banco Bisa from SRLConfig)
  │  → Dynamic QR (paymentQR base64 — encodes bank data, lazy fetched if missing)
  │  → Bank account card (AV Finance SRL / Banco Bisa) + copyable reference
  │  → Upload comprobante → POST /payments/:txId/comprobante
  │  → Navigates to /transactions/:txId  (no polling — admin confirms manually)
  ↓
Step 6: Success (or user waits at /transactions while admin confirms)
```

### LLC Flow (USA)

Same shape as SRL: Step 2 auto-skips (`payinMethod = 'manual'`); Step 3 is OwlPay-only (all LLC corridors are global Harbor); Step 5 shows USD wire instructions instead of BOB QR.

---

## 3. `stepData` — Complete Shape

```js
{
  // ── Step 1: Step1Amount.jsx ────────────────────────────────────────────
  originAmount:       Number,         // e.g. 100000 (integer CLP or BOB, decimal USD)
  destinationCountry: String,         // ISO-2, e.g. 'CO', 'PE', 'CN', 'NG'
  quote: {
    corridorId:          String,      // e.g. 'cl-co', 'bo-cn'
    originCurrency:      String,      // 'CLP' | 'BOB' | 'USD'
    destinationCurrency: String,      // 'COP', 'PEN', 'ARS', 'CNY', 'NGN', ...
    destinationAmount:   Number,
    exchangeRate:        Number,      // effective rate (net of fees)
    estimatedDelivery:   String,      // e.g. '1 día hábil'
    fees: {
      alytoCSpread:  Number,          // spread % applied on origin amount (business gets a different %)
      fixedFee:      Number,          // flat fee in origin currency
      payinFee:      Number,          // Fintoc/processing fee
      payoutFee:     Number,          // Vita/Harbor payout fee
      // profitRetention: NEVER exposed to frontend
    },
    usdcTransitAmount: Number | null, // BOB corridors only — USDC in-flight (Stellar audit)
  },

  // ── Step 2: Step2PayinMethod.jsx ──────────────────────────────────────
  payinMethod:  String,  // 'fintoc' | 'manual'
  payinVariant: String,  // 'qr' | 'manual' | 'fintoc' — UI-only distinction
  _skipStep2:   Boolean, // true when SRL/LLC auto-skipped — controls prevStep()

  // ── Step 3: Step3Beneficiary.jsx ─────────────────────────────────────
  beneficiaryData: {
    // Vita corridors: keys vary per country, loaded from
    //   GET /payments/withdrawal-rules/:countryCode
    //   fc_* keys are stripped before submit (backend adds them from corridor config).
    //
    // OwlPay corridors: keys are static, defined in owlPayForms.js per country.
    //   Backend maps these to Harbor schema in buildOwlPayBeneficiary().
  },
  contactId: String | null,           // _id of saved Contact, if user picked from picker

  // ── Step 4: Step4Confirm.jsx (response from initCrossBorderPayment) ──
  transactionId:     String,          // e.g. 'ALY-C-1714000000000-ABC123'
  payinUrl:          String | null,   // Fintoc widget URL (SpA only)
  payinMethod:       String,          // backend may override (echoed as the resolved provider name)
  payinInstructions: Object | null,   // bank details for manual payin (SRL/LLC)
  paymentQR:         String | null,   // dynamic QR base64 (SRL)
  paymentQRStatic:   Array,           // admin-uploaded QRs: [{ label, imageBase64 }]

  // ── Step 6 ────────────────────────────────────────────────────────────
  completedAt: String,                // ISO timestamp (from polling response)
}
```

---

## 4. Step Details

### Step 1 — `Step1Amount.jsx`

- **Origin currency by entity:** `SpA→CLP`, `LLC→USD`, `SRL→BOB` (constant `ENTITY_ORIGIN`).
- **Available countries:** loaded from `GET /api/v1/payments/corridors`, filtered by user’s `legalEntity`.
- **Country picker:** bottom-sheet modal with flag images (`flagcdn.com/w80/{code}.png`) and free-text search.
- **Real-time quote:** `useQuoteSocket(rawAmount, countryCode)` — WebSocket, server reads the user’s `accountType` and applies `businessAlytoCSpread` if `business` (see §8).
- **BOB rate display:** SRL corridors fetch `getCurrentExchangeRates()` to show the BOB/USDT rate. Stale badge if rate is >24h old.
- **`canContinue`:** requires `quote` present + WebSocket status not in `['connecting', 'expired', 'disconnected', 'error']` + non-zero amount + selected country.
- **`onNext` payload:** `{ originAmount, destinationCountry, quote }`.

### Step 2 — `Step2PayinMethod.jsx`

- **Auto-skip trigger:** `useEffect` on component mount. If `user.legalEntity === 'SRL' || user.legalEntity === 'LLC'` → calls `onNext({ payinMethod: 'manual', _skipStep2: true })` immediately, skipping to step 3. The user never sees this screen.
- **CL methods:** Only `fintoc` has `available: true`. All others show "Próximamente".
- **BO methods (UI only — SRL never reaches this):** Two options — `qr` and `manual`. Both map to `payinMethod: 'manual'` for the backend; the visual variant lives in `payinVariant`.
- **Other origin countries** (AR, CO, BR, MX): All `available: false`.

### Step 3 — `Step3Beneficiary.jsx`

Two distinct rendering paths driven by `useWithdrawalRules(countryCode).payoutMethod`:

**`payoutMethod === 'vitaWallet'`:**
- Dynamic field list rendered from the backend response.
- `fc_*` fields are hidden from UI and stripped from `beneficiaryData` before submit — backend adds them from corridor config.
- Conditional fields (`field.when = { key, value }`) render only when the referenced field has the expected value.
- `transfer_purpose` and `state_province` (CN) fall back to hardcoded option lists if the backend doesn’t supply options.

**`payoutMethod === 'owlPay'` (OwlPay v2 corridors):**
- Form config is **static** — read from `src/components/SendMoney/owlPayForms.js` keyed by destination country (`CN`, `NG`, …; `GENERIC_OWLPAY_FORM` as fallback).
- The frontend **does not call** Harbor `getRequirementsSchema` at any point. All Harbor schema mapping happens in the backend `buildOwlPayBeneficiary()`.
- Defaults from the form config (e.g. `is_self_transfer: false`) are seeded via `useEffect` on first render.
- Booleans (toggle fields like `is_self_transfer`) are persisted as actual booleans, not strings.

**Common UX (both paths):**
- **ContactPicker:** horizontal chip row above the form. `useContacts(destinationCountry)` returns saved contacts for that country; selecting a chip pre-fills `values` from `contact.beneficiaryData`, sets `contactId`, and replaces the picker with a prefill banner.
- **Prefill from ContactsPage:** `ContactsPage.jsx` calls `sessionStorage.setItem('alyto_prefill_contact', JSON.stringify(contact))` before navigating to `/send`. Step3 reads it on mount and removes the key immediately.
- **Save-as-contact toggle:** non-blocking `createContact()` call. `formType` is `'owlpay'` when `payoutMethod === 'owlPay'`, otherwise `'vita'`. Failures are swallowed — they never block the transfer.
- **`onNext` payload:** `{ beneficiaryData, contactId }` — `contactId` is `null` if no saved contact was used.

### Step 4 — `Step4Confirm.jsx`

- **Fees shown:** `costoEnvio = alytoCSpread + fixedFee + payinFee + payoutFee`. `profitRetention` is **never shown**.
- **Breakdown:** expandable chevron splits into `comisionServicio` (alytoCSpread + fixedFee) and `feeProcesamiento` (payinFee + payoutFee).
- **`payinMethodLabel`** map: `fintoc → 'Fintoc — Transferencia bancaria'`, `manual → 'Transferencia bancaria manual'`, `owlpay → 'OwlPay Harbor'`, `vita → 'Vita Wallet'`.
- **Confirmation checkbox:** required before "Confirmar y pagar" activates.
- **API call:** `POST /api/v1/payments/crossborder` via `initPayment()`.
- **Session save:** `sessionStorage.setItem('lastTransactionId', res.transactionId)` — used by PaymentSuccessPage as redirect target after Fintoc.
- **`onNext` payload:** the full response from `initCrossBorderPayment` (see §6). `payinUrl` falls back to `widgetUrl` / `widgetToken` if Fintoc returned a different shape. The frontend only overwrites `payinMethod` if the backend explicitly returns one — otherwise it preserves whatever was in `stepData` (important for the SRL/LLC skip case).

**Request payload sent to backend:**
```js
{
  corridorId:        quote.corridorId,
  originAmount,                        // Number
  payinMethod,
  beneficiaryData,                     // dynamic field object (Vita) or static (OwlPay)
  destinationAmount: quote.destinationAmount,   // denormalized for traceability
  exchangeRate:      quote.exchangeRate,        // denormalized
  contactId,                           // String | omitted if null
}
```

### Step 5 — `Step5PaymentWidget.jsx`

**Branch `payinMethod === 'manual'` → `ManualPayinScreen`:**
- Shows static QR images uploaded by admin (`paymentQRStatic[]` — Tigo Money, Banco Bisa, etc.).
- Shows dynamic QR base64 (`paymentQR`); falls back to lazy `GET /payments/:txId/qr` if neither is present in stepData.
- Bank account card: Banco, Titular, Cuenta, Tipo, Monto + copyable reference ID.
- Upload comprobante: `POST /payments/:txId/comprobante`, field name: `comprobante`, max 5MB, JPG/PNG/PDF.
- After successful upload: navigates to `/transactions/:txId`.
- **No polling** — admin confirms manually in the Ledger panel.

**Branch `payinMethod !== 'manual'` → `PollingPayinScreen`:**
- Opens `payinUrl` in new tab (`window.open`).
- Polls `GET /api/v1/payments/:txId/status` every **5 seconds**.
- Final statuses that stop polling: `payin_confirmed`, `payin_completed`, `completed`, `in_transit`.
- Timeout: **15 minutes** — shows support contact screen if reached.
- If `payinUrl` is null: shows error with support email link.

---

## 5. Frontend Services Map

| Function | File | Description |
|----------|------|-------------|
| `initPayment(payload)` | `paymentsService.js` | `POST /api/v1/payments/crossborder` |
| `uploadComprobante(txId, file)` | `paymentsService.js` | `POST /api/v1/payments/:txId/comprobante` |
| `getTransactionStatus(txId)` | `paymentsService.js` | `GET /api/v1/payments/:txId/status` |
| `getPaymentQR(txId)` | `paymentsService.js` | `GET /api/v1/payments/:txId/qr` (lazy load) |
| `listUserCorridors()` | `paymentsService.js` | `GET /api/v1/payments/corridors` |
| `getCurrentExchangeRates()` | `paymentsService.js` | `GET /api/v1/exchange-rates/current` |
| `createContact(data)` | `api.js` | `POST /api/v1/contacts` (formType: `'vita'` or `'owlpay'`) |
| `useQuoteSocket(amount, country)` | `hooks/useQuoteSocket.js` | WebSocket real-time quote (server reads `accountType` for spread) |
| `useWithdrawalRules(countryCode)` | `hooks/useWithdrawalRules.js` | Returns `{ rules, payoutMethod }`. For OwlPay corridors `rules` is empty (frontend uses `owlPayForms.js`). Cached 30 min in sessionStorage. |
| `useContacts(country?)` | `hooks/useContacts.js` | Saved contacts, filtered by country if provided |
| `kybService.applyKyb(formData)` | `services/kybService.js` | `POST /api/v1/kyb/apply` (multipart) |
| `kybService.getKybStatus()` | `services/kybService.js` | `GET /api/v1/kyb/status` |

---

## 6. Backend — Transaction Lifecycle

### `POST /api/v1/payments/crossborder` → `initCrossBorderPayment`

**Required fields:** `corridorId`, `originAmount`, `beneficiaryData` (or legacy `beneficiary`).

**Validations:**
- Corridor must be active in `TransactionConfig`.
- User’s `legalEntity` country must match `corridor.originCountry`.
- `originAmount ≥ resolveMinAmountOrigin(corridor)` — see §8 for the dynamic BOB→USD calculation used by `bo-cn` and `bo-ng`.
- `originAmount ≤ corridor.maxAmountOrigin`.
- SRL/BOB: hard cap at **Bs 49,999** per transaction (ASFI RND 102400000021 compliance).

**Transaction ID format:** `ALY-{routingScenario}-{Date.now()}-{random6chars}`
- SpA (routingScenario B): `ALY-B-1714000000000-ABC123`
- SRL (routingScenario C): `ALY-C-1714000000000-ABC123`
- LLC (routingScenario A): `ALY-A-1714000000000-ABC123`

**Branches in `initCrossBorderPayment`:**

```
if corridor.payinMethod === 'fintoc'        (SpA standard LatAm)
  → fintocService.createPayin() → widget URL
  → Transaction.create({ status: 'payin_pending', payinProvider: 'fintoc', payinReference })
  → Response: { transactionId, payinUrl, payinMethod: 'fintoc', status: 'payin_pending', ... }

if corridor.payinMethod === 'manual'        (SRL, LLC)
  → Transaction.create({ status: 'pending_comprobante', payinProvider: 'manual' })
  → Generate dynamic QR (encodes bank data for banking apps)
  → Read SRLConfig for static QRs (Tigo Money, Banco Bisa, ...)
  → Response: { transactionId, paymentInstructions, paymentQR, paymentQRStatic, status: 'payin_pending' }
  → Status real en BD = 'pending_comprobante'; pasa a 'payin_pending' al subir comprobante

if corridor.payinMethod === 'bankQr'        (SRL — BEC QR Connect u otro banco)
  → getBankQrService(corridor.bankQrConfig.bankId).generateQR({ ..., dueDate })
      dueDate = hoy + BANK_QR_DUE_DAYS (env, default 1 día)
  → Transaction.create({ status: 'payin_pending', payinProvider: 'bankQr',
                         bankQr: { bankId, qrId, dueDate },
                         paymentInstructionsExpiresAt = fin del día de vencimiento })
  → Response: { transactionId, paymentQR (imagen real del banco), bankQrId, dueDate, status: 'payin_pending' }
  → Confirmación 100% automática vía IPN del banco (sin admin, sin comprobante)
  → Mock mode si faltan credenciales BEC o BEC_MOCK_ENABLED=true (qrId 'mock-bec-...', SVG placeholder)

if corridor.payinMethod === 'vitaWalletPayin'   (legacy A2A PISP)
  → vitaWalletService.createPayin() → vitaPayinId + payinUrl
  → Transaction.create({ status: 'payin_pending', payinProvider: 'vitaWallet' })
```

**Side effects on all branches:**
- Email to user (payment initiated / manual instructions).
- Push notification to user (`transferInitiated`).
- `notifyAdmins` — push + in-app.
- Admin email `adminBoliviaAlert` if `payinMethod === 'manual'`.

---

### `POST /api/v1/payments/:transactionId/comprobante` → `uploadPaymentProof`

- Multer field: **`comprobante`** | Limit: 5MB | Types: JPG, PNG, PDF.
- Only allowed if `transaction.paymentInstructions != null` (i.e. manual payin flows).
- Persists `Transaction.paymentProof` (buffer as base64 + metadata).
- Appends to `transaction.ipnLog` (`eventType: 'payment_proof_uploaded'`).
- **Fires `broadcastToAdmins('tx_actionable')`** — triggers SSE notification in admin Ledger tab.
- Sends `notifyAdmins(adminPaymentProof)` — push + in-app.
- **Does NOT change transaction status** — admin confirms in Ledger.

---

### `dispatchPayout(transaction)` — Fire-and-Forget

Called from IPN handlers without `await`. Routing decision reads `corridor.payoutMethod`:

```
1. if corridor.payoutMethod === 'owlPay' && legalEntity ∈ { SRL, LLC }
   → tryOwlPayV2(transaction, corridor, netAmountUSD)   ← OwlPay v2 flow, see §7

2. else if corridor.payoutMethod === 'vitaWallet'
   → if destCountry ∈ VITA_SENT_ONLY_COUNTRIES { GT, SV, ES, PL }:
       createVitaSentPayout(vitaPayload)
   → else:
       createPayout(vitaPayload)
   → On success: status = 'payout_sent'

3. else if corridor.payoutMethod === 'anchorBolivia'
   → Append ipnLog, set status = 'payout_pending'
   → Email admin Bolivia alert with beneficiary details
   → STOP — admin executes manual BOB bank transfer
```

**Sandbox mode:** When `VITA_ENVIRONMENT === 'sandbox'`, after `payout_sent` a 4-second timer fires that sets `status = 'completed'` and triggers `recordSent()`.

**Production Vita flow:** After `payout_sent`, waits for a second Vita IPN (`vitaStatus === 'completed'`) to transition to `status = 'completed'`.

---

### IPN Handlers

| Handler | Trigger | Transition |
|---------|---------|------------|
| `handleBankQrIPN` | `POST /ipn/bankqr/:bankId` — pago QR confirmado por el banco (busca tx por `bankQr.qrId`) | `payin_pending → payin_confirmed → dispatchPayout` |
| `handleFintocIPN` | `POST /payments/webhooks/fintoc-crossborder` — `payment_intent.succeeded` | `payin_pending → payin_confirmed → dispatchPayout` |
| `handleVitaIPN` (payin) | `POST /ipn/vita` — `vitaStatus: 'completed'` when `currentStatus ∈ { payin_pending, initiated }` | `payin_pending → payin_confirmed → dispatchPayout` |
| `handleVitaIPN` (payout) | Same endpoint — `vitaStatus: 'completed'` when `currentStatus === 'payout_sent'` | `payout_sent → completed` + recordSent |
| `handleOwlPayIPN` — `transfer.source_received` | `POST /ipn/owlpay` | `payout_pending_usdc_send → payout_sent` |
| `handleOwlPayIPN` — `transfer.completed` | Same endpoint | `payout_sent → completed` + recordSent |

**`recordSent(contactId, destinationAmount, destinationCurrency)`:** fire-and-forget (`.catch(() => {})`) — updates `Contact.lastUsedAt` + `Contact.totalSent`. Never blocks the payment flow.

---

### Background jobs — payin bankQr (`reconcileBankQrPayments`, cada 30 min)

Red de seguridad del IPN bankQr. Dos fases (guard de overlap `_isRunning`):

- **FASE A — confirmar pagos perdidos:** consulta `getPaidQRs` de **ayer + hoy** por cada banco con credenciales (`listAvailableBankIds`). La ventana de 2 días cierra el gap de un IPN perdido a través de medianoche. Por cada QR pagado con tx en `payin_pending` → `confirmBankQrTx` (status `payin_confirmed` + `dispatchPayout`).
- **FASE B — barrido de expiración (give-up):** toma tx bankQr `payin_pending` sin `bankQr.paidAt` cuyo `paymentInstructionsExpiresAt < now − 1h` de gracia. Hace un `getQRStatus` final en el banco:
  - `'paid'` → confirma (cubre cualquier pago que la FASE A no listó).
  - `'pending'` → **cancela el QR en el banco** (`cancelQR`) + marca `failed`/`archived` (`failureCategory='BANKQR_EXPIRED'`). Cancelar antes de fallar cierra la carrera *"marco failed → el usuario paga después → SRL recibe BOB sin payout"*.
  - `'cancelled'` → marca `failed`/`archived`.
  - Banco no responde y tx > 7 días → give-up duro.

**`cleanupOrphanTransactions` (cada 1h)** EXCLUYE bankQr (lo maneja la FASE B). Sí archiva intentos `manual` abandonados: ahora cubre `status ∈ { payin_pending, pending_comprobante }` — antes solo `payin_pending`, dejando zombie los intentos manuales que nunca subieron comprobante.

---

## 7. OwlPay v2 — Off-Ramp via Harbor

`tryOwlPayV2(transaction, corridor, netAmountUSD)` runs as part of `dispatchPayout` whenever `corridor.payoutMethod === 'owlPay'`. The backend **always uses `OWLPAY_CUSTOMER_UUID_LLC`** as the Harbor `customer_uuid` — AV Finance LLC is the Harbor-approved entity for off-ramp regardless of which legal entity processed the payin.

```
A. Pre-check liquidity
   getStellarUSDCBalance() ≥ netAmountUSD + 1   // 1 USDC reserve for network fees
   ↳ if insufficient → status = 'pending_funding'
                       broadcastToAdmins('tx_manual_payout', reason: 'pending_funding_usdc')
                       email admin → STOP

B. createQuote → POST /v2/transfers/quotes
   {
     source_amount, destination_country, destination_currency,
     destination_payment_method: 'bank_transfer',
     source_chain: process.env.OWLPAY_SOURCE_CHAIN ?? 'stellar',
     customer_uuid: OWLPAY_CUSTOMER_UUID_LLC,
     customer_type: 'business',
   }
   → quoteId persisted as transaction.payoutQuoteId

C. Build beneficiary from stored form values
   buildOwlPayBeneficiary(transaction.beneficiaryDetails, null, destinationCountry)
   → returns { beneficiary_info, payout_instrument, transfer_purpose, is_self_transfer }
   ⚠️  Schema fetching is NOT done. Frontend already used owlPayForms.js;
       backend just maps known keys to the Harbor schema.

D. createOwlPayTransfer → POST /v2/transfers
   {
     quote_id, on_behalf_of, application_transfer_uuid: alytoTransactionId,
     source_address: STELLAR_MASTER_PUBLIC,
     beneficiary_info, payout_instrument, transfer_purpose, is_self_transfer,
   }
   → response.transfer_instructions.{ instruction_address, instruction_memo, chain }
   → persisted as transaction.harborTransfer.{ transferId, instructionAddress, instructionMemo, ... }
   → status = 'payout_pending_usdc_send'

E. Send USDC on Stellar
   if process.env.OWLPAY_USDC_SEND_ENABLED === 'true':
     sendUSDCToHarbor({ destinationAddress, amount, memo, transactionId })
     → status = 'payout_sent', stellarTxHash persisted
   else (current default):
     status stays 'payout_pending_usdc_send'
     broadcastToAdmins('tx_manual_payout', reason: 'awaiting_manual_usdc_send')
     email admin with instruction_address + instruction_memo + amount

F. Wait for Harbor webhook
   transfer.source_received  → status = 'payout_sent'
   transfer.completed        → status = 'completed' + recordSent()
```

### OwlPay Sandbox Setup Requirements

These are pre-conditions to make a sandbox transfer go through end-to-end. They are **not** automated and must be coordinated out-of-band:

| # | Requirement | Notes |
|---|-------------|-------|
| 1 | Harbor customer must be enabled for transfers | Done by the Harbor/OwlPay team via Slack — there is no API to self-enable. Without this, `createTransfer` returns `403`. |
| 2 | `customer_limits` must be `> 0` | Harbor team sets per-customer monthly + per-transaction caps. They are **not** configurable via API; ask Harbor support to bump them. |
| 3 | Stellar wallet must hold a USDC trustline before funding | The Harbor faucet refuses to send USDC if the destination account has no `change_trust` op for `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`. Use `createUSDCTrustline()` once per environment. |
| 4 | Harbor faucet | 500 USDC/day per customer, resets at **00:00 UTC**. Hitting the cap returns `429` with no Retry-After. |
| 5 | Circle USDC faucet (manual top-up) | 20 USDC per request, ~2 h cooldown per requesting address. Use as a fallback when Harbor’s faucet is exhausted. |

To smoke-test the Harbor v2 path locally without flipping `OWLPAY_USDC_SEND_ENABLED`, simulate the webhook with `simulateTransferCompleted(transferId)` once the transfer is in `payout_pending_usdc_send`.

---

## 8. Pricing — Personal vs Business + Dynamic Minimums

### Account-type spread

`User.accountType ∈ { personal, business }`. Defaults to `personal`; flipped to `business` when `BusinessProfile.kybStatus = approved` (see §10).

`TransactionConfig` carries two spread fields:
- `alytoCSpread` — applied to personal accounts. Default ≈ **2%** in seeds.
- `businessAlytoCSpread` — applied to business accounts. Default ≈ **0.5%** in seeds. `null` means "no business pricing — use `alytoCSpread`".

`quoteCalculator.calculateQuote({ accountType })` and `quoteSocket` both pick the effective spread:

```js
const effectiveSpreadPct =
  (accountType === 'business' && corridor.businessAlytoCSpread != null)
    ? corridor.businessAlytoCSpread
    : (corridor.alytoCSpread ?? 0);
```

The WebSocket reads the user's `accountType` from `User.findById(userId).select('residenceCountry accountType')` — the frontend does not send it.

### Dynamic minimum (BOB corridors)

`bo-cn` and `bo-ng` define `minAmountUSD` instead of a static `minAmountOrigin`. `resolveMinAmountOrigin(corridor)` then computes the live BOB threshold:

```js
if (corridor.minAmountUSD && corridor.originCurrency === 'BOB') {
  const rate = await getBOBRate();          // current BOB/USDC
  return Math.ceil(corridor.minAmountUSD * rate);
}
return corridor.minAmountOrigin ?? 1;
```

This keeps the BOB minimum aligned with Harbor’s USD floor as the BOB/USDC rate drifts. Both `initCrossBorderPayment` and the HTTP quote endpoint call this helper before validating `originAmount`.

### Quote formula — `src/services/quoteCalculator.js`

> Only entry point for BOB quote math. All callers (HTTP quote endpoint, WebSocket branch 2) **must** call `calculateQuote()` — no duplicated math.

**Inputs:** `{ amount, corridor, bobPerUsdc, vitaRate, accountType }`

```
Step 1 — fees in origin currency (BOB)
  payinFee        = amount × (corridor.payinFeePercent / 100)
  effectiveSpread = (accountType === 'business' && businessAlytoCSpread != null)
                    ? businessAlytoCSpread : alytoCSpread
  alytoCSpread    = amount × (effectiveSpread / 100)
  fixedFee        = corridor.fixedFee
  profitRetention = amount × (corridor.profitRetentionPercent / 100)

Step 2 — user-facing fees
  visibleFees   = payinFee + alytoCSpread + fixedFee
  totalDeducted = round2(visibleFees)

Step 3 — internal total (adds hidden retention)
  totalDeductedReal = round2(visibleFees + profitRetention)

Step 4 — net BOB for conversion
  netBOB = amount - totalDeductedReal

Step 5 — USDC transit (Stellar audit; never shown to user)
  usdcTransitAmount = round2(netBOB / bobPerUsdc)
  digitalAsset = 'USDC'

Step 6 — destination amount (raw Vita rate, vitaRateMarkup always = 0)
  payoutFeeInDest   = corridor.payoutFeeFixed × vitaRate
  destinationAmount = round2((usdcTransitAmount × vitaRate) - payoutFeeInDest)

Step 7 — effective rate for display
  effectiveRate = round2(destinationAmount / amount)
```

**Key invariants:**
- `vitaRateMarkup` is always 0 — spec §3.5 / §6.9.
- `profitRetention` appears in `Transaction.fees` for audit but is **never** in the frontend response or Step4 display.
- `usdcTransitAmount` is preserved in `Transaction.digitalAssetAmount` to avoid recalculation at payout time.

---

## 9. Status State Machine

```
pending_comprobante              ← Created by initCrossBorderPayment (payinMethod 'manual')
  │                                 Abandonado + vencido sin comprobante → cleanup → failed/archived
  └─ payin_pending               ← user uploads comprobante (uploadPaymentProof)

payin_pending                    ← Created by initCrossBorderPayment (fintoc / bankQr / vita)
  │
  ├─ payin_confirmed             ← Fintoc IPN payment_intent.succeeded
  │    └─→ dispatchPayout()          or Vita IPN completed (payin)
  │                                  or bankQr IPN / reconcileBankQrPayments (FASE A/B)
  │                                  or Admin manual confirmation (Ledger)
  │
  ├─ failed                      ← Vita IPN vitaStatus: 'denied'
  │                                 or bankQr QR vencido (failureCategory='BANKQR_EXPIRED', FASE B)
  │
  └─ [user uploads comprobante   ← No status change — admin confirms
       → broadcastToAdmins]

payin_confirmed
  │
  └─ [dispatchPayout runs]
       │
       ├─ payout_sent            ← Vita/Harbor accepted the payout request
       │    ├─ completed         ← Vita 2nd IPN: 'completed' / Harbor: transfer.completed
       │    └─ failed            ← tryOwlPayV2 exception
       │
       ├─ payout_pending_usdc_send  ← OwlPay: Harbor transfer created, manual USDC send needed
       │    └─ payout_sent       ← Harbor: transfer.source_received
       │
       ├─ pending_funding        ← OwlPay: Stellar USDC liquidity insufficient
       │
       ├─ payout_pending         ← anchorBolivia: admin notified, manual BOB transfer pending
       │
       └─ processing             ← Unimplemented payoutMethod (fallback — no external call)
```

**Polling stops at:** `payin_confirmed`, `payin_completed`, `completed`, `in_transit`.

---

## 10. KYB Flow (Business Accounts)

KYB unlocks `accountType = 'business'` (cheaper spread, OwlPay corridors, higher per-tx limits) and is required before invoices can be generated.

**Frontend form — `pages/Kyb/KybForm.jsx`** (currently 3 steps in the UI; the underlying BusinessProfile model carries a 4th block of derived/admin-only fields):
1. **Empresa** — legal name, RUT/NIT, address, country of incorporation.
2. **Representante** — legal representative ID, role, contact.
3. **Operativa + documentos** — estimated monthly volume, target corridors, business description, document uploads (multipart `documentos` field, max 10 files × 10 MB each).

After submit (`POST /api/v1/kyb/apply`), the user lands on `/kyb/status` and sees the appropriate `KybPage` state:
- `not_started` — informational benefits card + CTA.
- `pending` / `under_review` — waiting screen.
- `more_info` — modal to upload extra docs (`POST /api/v1/kyb/documents`).
- `approved` — limits + business pricing active.
- `rejected` — reason + WhatsApp support link.

**Admin review — `controllers/kybController.js → reviewKYBApplication`**
`PATCH /api/v1/admin/kyb/:businessId/review` accepts `status ∈ { approved, rejected, more_info, under_review }` plus optional `note`, `rejectionReason`, `transactionLimits`.

On `approved`:
- `BusinessProfile.kybStatus = 'approved'`, `transactionLimits` updated if provided.
- `User.kybStatus = 'approved'`, **`User.accountType = 'business'`** (the trigger that flips pricing in §8).
- Email: `EMAILS.kybApproved(user, profile)` (fire-and-forget).

On `rejected` / `more_info`: corresponding email (`EMAILS.kybRejected` / `EMAILS.kybMoreInfo`); `accountType` stays `personal`.

**Business invoice (PDF):** `GET /api/v1/payments/:transactionId/business-invoice` (gated by `checkBusinessKYB`) generates a PDF via `businessInvoiceGenerator`, persists `businessInvoice.{ invoiceNumber, invoiceGeneratedAt, invoicePdfUrl, verificationHash }` on the transaction, and returns the file. Admins can fetch the same invoice through `GET /api/v1/admin/transactions/:transactionId/business-invoice`.

---

## 11. Dashboard — WalletCard (SRL only)

`pages/Dashboard/DashboardPage.jsx` renders `<WalletCard>` only when `legalEntity === 'SRL' && data?.wallet` is truthy. The card consumes:

```js
{
  bobBalance:      data.wallet.bob.balanceAvailable,
  usdcBalance:     data.wallet.usdc.balanceAvailable,
  stellarAddress:  data.wallet.usdc.stellarAddress,
  status:          data.wallet.bob.status,   // 'active' | 'pending' | 'frozen'
}
```

**`components/WalletCard/WalletCard.jsx`** is a single visual card with a local `showUSDC` toggle (`useState(false)` — defaults to BOB):
- Default view: `Bs. {bobBalance}` formatted `es-BO`, 2 decimals.
- Toggle "Ver en USDC" / "Ver en BOB" flips the displayed balance to `{usdcBalance} USDC` (`en-US`, up to 6 decimals).
- Truncated Stellar address shown when `stellarAddress` is present (`G….KZVN`).
- `StatusDot` renders a colored dot + label from `status`.

LLC and SpA dashboards do not render this card; only SRL has the dual-ledger BOB+USDC wallet wired to the dashboard payload.

---

## 12. Contacts Module

**Save toggle (Step 3):** see §4 — non-blocking, `formType` derived from `payoutMethod`.

**ContactsPage → SendMoney prefill (`pages/Contacts/ContactsPage.jsx`):**
```js
const handleSend = useCallback(contact => {
  sessionStorage.setItem('alyto_prefill_contact', JSON.stringify(contact))
  navigate('/send')
}, [navigate])
```
Step3 reads the key on mount, hydrates `values + contactId + prefill banner`, then deletes the key. Reloading `/send` afterwards starts fresh.

**Picker (`components/Contacts/ContactPicker.jsx`):** chip row inside Step3 filtered by `destinationCountry`. Clicking a chip calls `handleContactPick(contact)` which mirrors the same hydration as the sessionStorage path.

**Backend (`controllers/contactsController.js → createContact`):** validates `destinationCountry`, `formType ∈ { 'vita', 'owlpay' }`, `beneficiaryData`. Dedupes against `(userId, destinationCountry, formType, beneficiaryData.account_number || account_bank)`.

---

## 13. Active Corridors (April 2026)

### SpA — Chile (CLP origin)

| Corridor ID | Destination | Dest currency | Payout provider |
|-------------|-------------|---------------|-----------------|
| cl-co | Colombia | COP | Vita Wallet |
| cl-pe | Perú | PEN | Vita Wallet |
| cl-ar | Argentina | ARS | Vita Wallet |
| cl-mx | México | MXN | Vita Wallet |
| cl-br | Brasil | BRL | Vita Wallet |
| cl-bo | Bolivia | BOB | anchorBolivia (SRL manual) |
| cl-uy | Uruguay | UYU | Vita Wallet |
| cl-py | Paraguay | PYG | Vita Wallet |
| cl-ec | Ecuador | USD | Vita Wallet |
| cl-ve | Venezuela | USD | Vita Wallet |
| cl-us | EE.UU. | USD | Vita Wallet |
| cl-gt | Guatemala | GTQ | Vita (vitaSent) |
| cl-sv | El Salvador | USD | Vita (vitaSent) |
| cl-cr | Costa Rica | CRC | Vita Wallet |
| cl-pa | Panamá | USD | Vita Wallet |
| cl-do | R. Dominicana | DOP | Vita Wallet |

### SRL — Bolivia (BOB origin)

| Corridor ID | Destination | Dest currency | Payout provider | Min amount |
|-------------|-------------|---------------|-----------------|------------|
| bo-co | Colombia | COP | Vita Wallet | static (BOB) |
| bo-pe | Perú | PEN | Vita Wallet | static (BOB) |
| bo-ar | Argentina | ARS | Vita Wallet | static (BOB) |
| bo-mx | México | MXN | Vita Wallet | static (BOB) |
| bo-br | Brasil | BRL | Vita Wallet | static (BOB) |
| bo-cl | Chile | CLP | Vita Wallet | static (BOB) |
| bo-uy | Uruguay | UYU | Vita Wallet | static (BOB) |
| bo-py | Paraguay | PYG | Vita Wallet | static (BOB) |
| bo-ec | Ecuador | USD | Vita Wallet | static (BOB) |
| bo-ve | Venezuela | USD | Vita Wallet | static (BOB) |
| bo-us | EE.UU. | USD | Vita Wallet | static (BOB) |
| bo-gt | Guatemala | GTQ | Vita (vitaSent) | static (BOB) |
| bo-sv | El Salvador | USD | Vita (vitaSent) | static (BOB) |
| bo-es | España | EUR | Vita (vitaSent) | static (BOB) |
| bo-pl | Polonia | PLN | Vita (vitaSent) | static (BOB) |
| bo-cr | Costa Rica | CRC | Vita Wallet | static (BOB) |
| bo-pa | Panamá | USD | Vita Wallet | static (BOB) |
| bo-do | R. Dominicana | DOP | Vita Wallet | static (BOB) |
| bo-ht | Haití | HTG | Vita Wallet | static (BOB) |
| bo-hk | Hong Kong | HKD | Vita Wallet | static (BOB) |
| bo-ca | Canadá | CAD | Vita Wallet | static (BOB) |
| **bo-cn** | China | CNY | **OwlPay Harbor v2** | **`minAmountUSD` × live BOB rate** |
| **bo-ng** | Nigeria | NGN | **OwlPay Harbor v2** | **`minAmountUSD` × live BOB rate** |

**`VITA_SENT_ONLY_COUNTRIES`** (use `createVitaSentPayout` instead of `createPayout`): `GT`, `SV`, `ES`, `PL`.

### LLC — USA (USD origin)

| Corridor ID | Destination | Payout provider |
|-------------|-------------|-----------------|
| us-* (global) | Global | OwlPay Harbor v2 |

---

## 14. Known Limitations / Deferred

| # | Item | Status |
|---|------|--------|
| 1 | BOB wallet with balance (Dual Ledger off-chain + Stellar on-chain) | Pending Phase 25 |
| 2 | Fund freezing via Stellar Trustlines (ASFI requirement) | Pending Phase 26 |
| 3 | PRILI complaint point in app | Pending Phase 27 |
| 4 | OFAC/UN/PEPs sanctions scanning | Pending Phase 28 |
| 5 | `sendUSDCToHarbor()` automatic mode (`OWLPAY_USDC_SEND_ENABLED=true`) | Pending chain confirmation with Sam (OwlPay) — currently manual |
| 6 | Payin methods for AR (Khipu/Bind), CO (PSE/Nequi), BR (PIX), MX (CLABE) | Próximamente |
| 7 | OwlPay additional corridors: AU, GB, JP, SG, ZA, AE | Pending LLC MSA activation |
| 8 | `dispatchPayout` is fire-and-forget — post-catch errors don't update status | See Phase 25+ improvement |
| 9 | BOB transaction limit is 49,999 Bs per tx while ASFI ETF/PSAV license pending | Lift once license granted |
| 10 | KYB form has 3 visible UI steps; the 4th admin-review block lives in `BusinessProfile` (admin-only) | Document accordingly |

---

## 15. Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-23 | 1.0 | Claude Code | Initial document from working code |
| 2026-04-23 | 1.1 | Claude Code | Corrections: Fintoc IPN handler (`handleFintocIPN`), status always `payin_pending` on creation, `dispatchPayout` routing from actual code (corridor.payoutMethod-based, not legalEntity+amount threshold), `contactId` added to stepData and payload, `formType` uses `payoutMethod` (vita/owlpay), `ContactPicker` inline in Step3 |
| 2026-04-27 | 1.2 | Claude Code | OwlPay v2 flow expanded into §7 with sandbox setup checklist; Step3 split into Vita / OwlPay paths (static `owlPayForms.js`); Step2 SRL/LLC auto-skip clarified; `accountType` business-spread pricing (§8) and dynamic `minAmountUSD` minimum for `bo-cn` / `bo-ng`; KYB flow + admin approve/reject/email behavior + business invoice (§10); SRL Dashboard `WalletCard` BOB↔USDC toggle (§11); Contacts save-toggle and ContactsPage prefill (§12); explicit OwlPay corridors marked in §13. |
