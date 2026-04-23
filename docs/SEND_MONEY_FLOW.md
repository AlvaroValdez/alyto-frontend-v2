# Send Money Flow — Specification v1.1

> **Status:** Contract document — DO NOT modify without updating CHANGELOG_FLOWS.md first
> **Last updated:** April 2026
> **Applies to:** AV Finance SRL (Bolivia) — BOB → LatAm corridors via Vita Wallet / OwlPay
> **Related entities:** SpA (Chile) and LLC (institutional) follow analogous patterns

---

## 1. Design Principles

These principles are **inviolable**. Any proposed change must be evaluated against them first.

### 1.1 User promises = System delivery
The amount the user sees in the quote is **exactly** what the beneficiary receives.

### 1.2 Zero hidden markup on execution
`vitaRateMarkup` is **removed** from the calculation chain. Revenue comes from explicit fees only.

### 1.3 Three steps maximum
The flow has **exactly 3 steps**.

### 1.4 Progressive disclosure
Default view shows only essentials. Details available on demand.

### 1.5 Audit trail is internal
USDC/Stellar never shown to end user.

### 1.6 Provider-agnostic beneficiary forms
Step 2 uses **dynamic forms** that adapt to the selected corridor's provider:
- Vita corridors → dynamic fields per destination country (bank, account, document)
- OwlPay corridors → QR/wallet address OR bank fields per destination
- Future providers → form schema from corridor configuration

---

## 2. Navigation Contract — 3 Steps

```
Step 1: /send/amount       → Monto + País destino
Step 2: /send/beneficiary  → Seleccionar o crear beneficiario (form dinámico)
Step 3: /send/confirm      → Review + Pago + Comprobante (todo en una pantalla)
```

### 2.1 Step 1 — Amount + Destination

User inputs:
- Destination country (dropdown)
- Amount (origin currency)

Shows live:
- Destination amount
- Estimated delivery time
- Total fee

`[Continuar]` disabled until quote is valid.

### 2.2 Step 2 — Beneficiary

Two paths:

**Path A — Select existing:**
List of user's saved beneficiaries filtered by destination country.

**Path B — Create new:**
Dynamic form based on corridor's provider:
- `corridor.provider === 'vita'` → Vita bank form (fields by country)
- `corridor.provider === 'owlpay'` → OwlPay form (QR or bank)
- `corridor.provider === 'anchor'` → Bolivia internal form

Form schema comes from corridor's `beneficiaryFormSchema` config, NOT hardcoded.

`[Continuar]` disabled until beneficiary selected/created.

### 2.3 Step 3 — Review + Payment + Proof

**Single screen with TWO internal states:**

#### State A — Review (before first Confirmar)

Shows:
- DE TI: user name + envío amount
- BENEFICIARIO: name (prominent), country flag, bank/account
- Recibe: destination amount (highlighted)
- Llega en: estimated time
- [Ver detalles ↓] expandable section with:
  - Comisión desglosada
  - Tasa efectiva aplicada
- `[Editar]` → back to Step 2 (preserves state)
- `[Confirmar]` → creates transaction, transitions to State B

#### State B — Payment (after Confirmar)

On the same screen (no route change), now shows:
- ✓ "Transferencia creada" confirmation
- Transaction ID (ALY-C-...)
- **AV Finance SRL bank account** for user to transfer
  - Banco, Cuenta, Número de referencia
  - Copy buttons
- **MANDATORY proof upload zone**
- Warning if proof not uploaded
- `[Cancelar]` | `[Confirmar envío]`
  - `Confirmar envío` DISABLED until proof uploaded
- On success → redirect to `/transactions/:txId`

**Rules for Step 3:**
- Transaction created when user clicks **first** `[Confirmar]` in State A
- Transaction stored with `status: 'payin_pending'` and NO proof initially
- Proof uploaded via separate endpoint `POST /payments/:txId/comprobante`
- Only when proof uploaded can user click `[Confirmar envío]`
- After final submit: `broadcastToAdmins('tx_actionable', ...)` fires

---

## 3. Mathematical Specification

### 3.1 Unified formula

**This is the ONLY formula. Every quote site calls this single function.**

```javascript
// Inputs
const A             = amount;
const bobPerUsdc    = rateFromExchangeRateOrEnv;
const vitaRate      = rateFromVitaAPI; // RAW — no markup

// Fees
const payinFee         = A * corridor.payinFeePercent / 100;
const alytoCSpread     = A * corridor.alytoCSpread / 100;
const fixedFee         = corridor.fixedFee;
const profitRetention  = A * corridor.profitRetentionPercent / 100;

// User-facing fees
const visibleFees      = payinFee + alytoCSpread + fixedFee;
const totalDeducted    = visibleFees;

// Internal
const totalDeductedReal = visibleFees + profitRetention;

// Net for conversion
const netBOB           = A - totalDeductedReal;

// USDC transit
const usdcTransitAmount = round2(netBOB / bobPerUsdc);

// Destination — RAW rate, NO markup
const payoutFeeInDest  = corridor.payoutFeeFixed * vitaRate;
const destinationAmount = round2((usdcTransitAmount * vitaRate) - payoutFeeInDest);

// For user display
const effectiveRate    = round2(destinationAmount / A);
```

### 3.2 Example — 635 BOB → COP

```
Inputs:
  A              = 635 BOB
  alytoCSpread   = 2%
  fixedFee       = 5 BOB
  profitRetention = 1%
  bobPerUsdc     = 9.31
  vitaRate       = 4,201.32

Results:
  visibleFees       = 17.70 BOB
  totalDeducted     = 17.70 BOB   ← user sees
  totalDeductedReal = 24.05 BOB   ← internal
  netBOB            = 610.95 BOB
  usdcTransit       = 65.62 USDC
  destinationAmount = ~275,698 COP
  effectiveRate     = 434.17 COP/BOB

User sees:
  Envías:    635 BOB
  Comisión:  17.70 BOB
  Recibe:    275,698 COP
  Tasa:      1 BOB = 434.17 COP
```

### 3.3 Display rounding

| Currency | Decimals |
|---|---|
| BOB | 2 |
| USD | 2 |
| USDC | not shown |
| COP | 0 |
| ARS, BRL, MXN, default | 2 |

### 3.4 Transaction document

```javascript
{
  alytoTransactionId: "ALY-C-...",
  originAmount: 635,
  originCurrency: "BOB",
  destinationAmount: 275698.64,    // LOCKED at creation
  destinationCurrency: "COP",
  exchangeRate: 434.17,            // effectiveRate
  
  conversionRate: {
    fromCurrency: "BOB",
    toCurrency: "USDC",
    rate: 9.31,
    convertedAmount: 65.62
  },
  
  digitalAssetAmount: 65.62,
  digitalAsset: "USDC",
  
  fees: {
    payinFee: 0,
    alytoCSpread: 12.70,
    fixedFee: 5,
    payoutFee: 0,
    profitRetention: 6.35,
    totalDeducted: 17.70,
    totalDeductedReal: 24.05,
    feeCurrency: "BOB",
    vitaRateMarkup: 0              // ALWAYS 0
  },
  
  status: "payin_pending",
  paymentProof: null               // populated in Step 3 State B
}
```

---

## 4. Quote Lifecycle

- Quote valid 60s
- User advances through steps → quote locked in frontend state
- Step 3 re-validates quote with backend on arrival
- On first `[Confirmar]` in Step 3 → tx created → amounts frozen
- `destinationAmount` NEVER recalculated after creation
- Any rate drift absorbed by Alyto margin

---

## 5. Status Transitions

```
payin_pending (created in Step 3 State B, no proof yet)
  ↓ user uploads proof + clicks Confirmar envío
payin_pending (with proof) → admin sees in "Accionables"
  ↓ admin approves
payin_confirmed
  ↓ backend dispatches to Vita
processing
  ↓ Vita IPN payout_sent
payout_sent
  ↓ Vita IPN payout_completed
completed
```

---

## 6. Anti-patterns (FORBIDDEN)

1. ❌ Apply `vitaRateMarkup > 0` anywhere
2. ❌ Show rate ≠ `destinationAmount / originAmount`
3. ❌ Add a 4th step
4. ❌ Show USDC/Stellar to user
5. ❌ "Rate will vary" disclaimers
6. ❌ Create tx without subsequent proof flow
7. ❌ Recalculate destinationAmount after creation
8. ❌ Duplicate calculation formula
9. ❌ Reference vitaRateMarkup in calculation
10. ❌ Show intermediate currencies
11. ❌ Put proof upload in Step 2 — belongs in Step 3 State B
12. ❌ Require proof in `initCrossBorderPayment` — separate endpoint
13. ❌ Hardcode beneficiary form — must come from corridor schema
14. ❌ Combine Review and Beneficiary in same step
15. ❌ Skip transaction re-validation on Step 3 arrival

---

## 7. Change Protocol

Changes to this spec require:
1. Update `docs/CHANGELOG_FLOWS.md`
2. Bump this spec version
3. Code changes reference new version
4. E2E tests updated

**Do not change code without updating spec first.**

---

## 8. Test Fixtures

### Fixture 1 — Calculation
```
Input: 635 BOB → Colombia (bo-co)
Expected: destinationAmount ≈ 275,698 COP, effectiveRate 434.17, vitaRateMarkup 0
```

### Fixture 2 — Navigation
```
Step 1: /send/amount      (Monto + Destino)
Step 2: /send/beneficiary (Beneficiario form)
Step 3: /send/confirm     (Review + Pago + Comprobante)
Total: exactly 3 steps
```

### Fixture 3 — Step 3 two states
```
State A: shows Review, [Confirmar] enabled, no tx yet
Click [Confirmar] → tx created → State B
State B: shows bank details, proof upload, [Confirmar envío] disabled until proof
```

### Fixture 4 — Beneficiary form dynamic
```
Vita corridor → Vita fields
OwlPay corridor → OwlPay fields
Schema from corridor config, not hardcoded
```

### Fixture 5 — No markup
```
Any corridor → fees.vitaRateMarkup === 0
No (1 - markup/100) multiplication anywhere
```

---

## Signatures

Spec v1.1 — April 2026
Changes from v1.0: step structure corrected (Amount / Beneficiary / Review+Payment+Proof).
Next review: post ASFI approval for AV Finance SRL.