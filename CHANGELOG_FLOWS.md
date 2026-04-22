# Changelog — Flows

Curated log of user-flow-level changes. The spec documents (`docs/SEND_MONEY_FLOW.md`, etc.) are the contract; this file records which commits implemented or amended that contract and why.

## Send Money Flow v1.0 — 2026-04-22

Canonical contract: [`docs/SEND_MONEY_FLOW.md`](docs/SEND_MONEY_FLOW.md)

Consolidates the legacy 6-step journey into a **3-step flow** (details → review → payment) with URL-backed navigation, progressive disclosure, and mandatory proof upload for SRL manual transfers.

| Commit    | Scope | Summary                                                                 |
|-----------|-------|-------------------------------------------------------------------------|
| `a5c7c86` | docs  | Publish SEND_MONEY_FLOW.md v1.0 — canonical contract                    |
| `460bd9b` | feat  | 3-step flow pages + `/send/*` router wiring                             |
| `fff63bf` | chore | `@deprecated` markers on legacy 6-step components                       |
| `fc8d4a3` | test  | `tests/send-money-spec.test.mjs` — static-analysis contract test        |

**What changed, concretely:**
- New pages under `src/pages/send-money/`: `SendMoneyFlow.jsx` (URL-routed container), `StepDetails.jsx`, `StepReview.jsx`, `StepPayment.jsx`.
- `StepDetails` reuses existing `Step1Amount` + `Step3Beneficiary` with progressive disclosure (amount locks after quote, then beneficiary appears) to preserve the dynamic Vita field loader, Bolivia manual-corridor handling, and bank-detail validators.
- `StepReview` collapses detail rows by default and exposes `Ver detalles` (§2.2); commission is shown in the origin currency with a USD equivalent.
- `StepPayment` dispatches on payin method: manual (SRL Bolivia) enforces a mandatory proof upload with an "Obligatorio" badge (§2.3); widget flows (Fintoc / Vita) open the provider URL in a new tab and poll `getTransactionStatus` every 5 s, timing out at 15 min and redirecting to `/transactions/:id` on any final status.
- Router mounts `SendMoneyFlow` once at `/send/*` so shared `flowData` state survives sub-route changes; `/send` redirects to `/send/details`.
- Legacy components (`Step2PayinMethod`, `Step4Confirm`, `Step5PaymentWidget`, `Step6Success`, `StepIndicator`, `SendMoneyPage`) kept in-tree with `@deprecated` JSDoc headers until a follow-up cleanup pass removes them.
- Compliance guardrails (§1.5, §6.1, §6.9, §6.10): the new step pages contain no user-facing references to `USDC`, `Stellar`, `Vita`, `vitaRateMarkup`, `pivot currency`, or `remesa/remittance`. Guarded by `tests/send-money-spec.test.mjs` (run with `node tests/send-money-spec.test.mjs`).

**Backend counterpart:** the matching calculator + refactor + tests ship in `alyto-backend-v2` commits `df0b216`, `3b191f3`, `1059997`, `ef066c2`.
