# CHANGELOG_FLOWS.md

> Change log for all canonical flow specifications.
> **Any change to a flow spec must be logged here BEFORE modifying code.**

---

## 2026-04-22 — Send Money Flow v1.0 / v1.1 REVERTED

**Requested by:** Alvaro Valdez (Founder)
**Reason:** v1.0 (3-step consolidation) and v1.1 attempts broke the original working flow.
The 5-step flow (Step1-6) with Vita dynamic beneficiary forms and OwlPay destinations
is the correct operational model. The invented QR-in-beneficiary-step (isManualCorridor
toggle) was not the right abstraction.

**Action taken:**
- Reverted `src/components/SendMoney/*` to commit `586d82f` (2026-03-26 15:03)
- Manually applied OwlPay country metadata from `f50e4ca` (Step1Amount.jsx only)
- Deleted `src/pages/send-money/` directory (all v1.0 / v1.1 components)
- Deleted `docs/SEND_MONEY_FLOW.md` (spec was based on incorrect structure)
- Restored `src/router/index.jsx` to original `/send` → `SendMoneyPage` route
- Backup branch `flow-revert-backup` created before changes

**Lesson:** Document the working flow BEFORE proposing architectural changes.

**Current state:** 5-step flow via `SendMoneyPage` (src/pages/SendMoney/SendMoneyPage.jsx):
1. Step1Amount       — ¿Cuánto envías y a dónde? (Vita quote + OwlPay countries)
2. Step2PayinMethod  — ¿Cómo pagas?
3. Step3Beneficiary  — ¿A quién le envías? (Vita dynamic form per country)
4. Step4Confirm      — Confirma el envío (calls initPayment without proof)
5. Step5PaymentWidget — Widget + uploadComprobante separado
6. Step6Success      — ¡Tu dinero está en camino!

---

## 2026-04-22 — Send Money Flow v1.1 (CORRECTED STRUCTURE)

**Requested by:** Alvaro Valdez (Founder)
**Reason:** v1.0 had incorrect step structure (Step 1 mixed Amount + Beneficiary, Step 2 Review, Step 3 Payment). This contradicted the actual operational model where beneficiary data requires its own step due to dynamic forms (Vita per-country fields, OwlPay QR/wallet). v1.1 corrects to proper 3-step structure.

**Impact:**
- Frontend: complete rewrite of SendMoney step components
- Backend: no logic changes (calculator already unified in v1.0 design)
- Schema: no changes
- UX: proper progressive data collection, no form fatigue

**Spec changes from v1.0:**
- Step 1: Amount + Destination only (no beneficiary)
- Step 2: Beneficiary only (dynamic form by provider)
- Step 3: Review + Payment + Proof (two internal states on same screen)
- Added principle §1.6: Provider-agnostic beneficiary forms
- Added anti-patterns #11-15 covering step separation rules

**Code changes:**
- `f8057d8` — docs: spec files committed to both repos
- `737c7c9` — feat: StepAmount / StepBeneficiary / StepConfirm + updated SendMoneyFlow router
- `2581b08` — test: spec-compliance tests updated (51 assertions, all passing)

---

## 2026-04-22 — Send Money Flow v1.0 (SUPERSEDED)

**Requested by:** Alvaro Valdez (Founder)
**Reason:** Previous flow had 5 steps with inconsistent calculations between quote and execution (0.39% drift).

**Status:** SUPERSEDED by v1.1 — structure was incorrect.

**Key achievements retained from v1.0:**
- Removal of vitaRateMarkup from calculation
- Unified calculator module
- 5→3 step reduction
- Design principles §1.1-§1.5

**What changed in v1.1:**
- Step 1 was "Details" (amount + beneficiary mixed) → now "Amount only"
- Step 2 was "Review" → now "Beneficiary"
- Step 3 was "Payment" → now "Review + Payment + Proof"