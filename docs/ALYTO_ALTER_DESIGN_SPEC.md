# Alyto-Alter — Design System Specification v2.0

> **Status:** Canonical design contract — DO NOT implement without following this spec.
> **Last updated:** April 2026
> **Mode:** Light Mode (claro) con identidad Alyto
> **Reference:** FinWallet UI + Alyto navy/teal brand colors
> **Stack:** React + Vite
> **Breakpoints:** Mobile-first: 390px (primary) / 1440px (desktop)

---

## 1. Design Tokens

### Colors

```css
:root {
  /* ── Backgrounds ── */
  --color-bg-app:       #F4F6FA;  /* App background — light gray-blue */
  --color-bg-white:     #FFFFFF;  /* Cards, modals, inputs */
  --color-bg-hover:     #F0F3F9;  /* Hover states */

  /* ── Brand Navy (from original spec) ── */
  --color-navy-900:     #0D1F3C;  /* Darkest navy — balance card bg */
  --color-navy-800:     #1A2F52;  /* Darker navy */
  --color-navy-700:     #1E3A5F;  /* Nav active states */
  --color-navy-100:     #EEF2F8;  /* Light navy tint — subtle backgrounds */

  /* ── Teal Accent (from original spec) ── */
  --color-teal-600:     #1D9E75;  /* Primary teal — CTAs, highlights */
  --color-teal-500:     #22B88A;  /* Lighter teal */
  --color-teal-100:     #E6F7F2;  /* Teal background tint */

  /* ── Text ── */
  --color-text-primary:   #0D1F3C;  /* Navy — headings, primary content */
  --color-text-secondary: #5A6A8A;  /* Secondary labels */
  --color-text-muted:     #9AA5C0;  /* Placeholder, disabled, fine print */
  --color-text-white:     #FFFFFF;  /* Text on dark backgrounds */

  /* ── Status ── */
  --color-success:        #16A34A;
  --color-success-bg:     #DCFCE7;
  --color-warning:        #D97706;
  --color-warning-bg:     #FEF3C7;
  --color-error:          #DC2626;
  --color-error-bg:       #FEE2E2;
  --color-pending:        #6366F1;
  --color-pending-bg:     #EEF2FF;
  --color-transit:        #0891B2;
  --color-transit-bg:     #E0F2FE;

  /* ── Borders ── */
  --color-border:         #E8EDF5;  /* Subtle card borders */
  --color-border-input:   #D1D9E8;  /* Input borders */
  --color-border-focus:   #1D9E75;  /* Focus ring — teal */

  /* ── Shadows ── */
  --shadow-card:    0 1px 4px rgba(13, 31, 60, 0.06), 0 4px 16px rgba(13, 31, 60, 0.06);
  --shadow-card-hover: 0 4px 12px rgba(13, 31, 60, 0.10), 0 8px 32px rgba(13, 31, 60, 0.08);
  --shadow-nav:     0 -1px 0 rgba(13, 31, 60, 0.06), 0 -4px 16px rgba(13, 31, 60, 0.04);
  --shadow-teal:    0 4px 16px rgba(29, 158, 117, 0.30);
}
```

### Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  --font-primary: 'Manrope', -apple-system, sans-serif;

  --text-xs:   11px;   /* Uppercase labels */
  --text-sm:   13px;   /* Metadata, secondary */
  --text-base: 15px;   /* Body */
  --text-md:   17px;   /* Sub-headings */
  --text-lg:   20px;   /* Section headings */
  --text-xl:   24px;   /* Card headings */
  --text-2xl:  32px;   /* Balance amount */
  --text-3xl:  40px;   /* Amount input */

  --tracking-wide:  0.05em;
  --tracking-wider: 0.08em;
}
```

### Shape & Spacing

```css
:root {
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;   /* Standard card */
  --radius-xl:   20px;   /* Balance card, large modals */
  --radius-full: 9999px; /* Pills, badges, buttons */

  --spacing-xs:  8px;
  --spacing-sm:  12px;
  --spacing-md:  16px;
  --spacing-lg:  24px;
  --spacing-xl:  32px;
}
```

---

## 2. Global Layout

```css
body {
  font-family: var(--font-primary);
  background: var(--color-bg-app);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
}
```

---

## 3. Navigation Components

### 3.1 TopNavBar (Mobile + Desktop)

```
┌─────────────────────────────────────┐
│  [Logo Alyto]        [🔔 2] [Avatar]│
│  height: 64px, bg: white, shadow    │
└─────────────────────────────────────┘
```

```css
.top-nav {
  position: sticky;
  top: 0;
  height: 64px;
  background: var(--color-bg-white);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  z-index: 100;
  box-shadow: 0 1px 4px rgba(13,31,60,0.06);
}

/* Bell icon with badge */
.nav-bell {
  position: relative;
}
.nav-bell-badge {
  position: absolute;
  top: -2px; right: -2px;
  width: 16px; height: 16px;
  background: var(--color-error);
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: 700;
  color: white;
  display: flex; align-items: center; justify-content: center;
}

/* Avatar */
.nav-avatar {
  width: 36px; height: 36px;
  border-radius: var(--radius-full);
  background: var(--color-navy-900);
  color: var(--color-text-white);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700;
  font-size: var(--text-sm);
}
```

### 3.2 BottomNavBar (Mobile only, < 1024px)

```
┌─────────────────────────────────────┐
│  🏠      💳      ↗      👥      👤  │
│  Home  Assets Trans. Contacts Profile│
│  height: 72px, bg: white            │
└─────────────────────────────────────┘
```

```css
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 72px;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-nav);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: color 0.15s;
  cursor: pointer;
  flex: 1;
}
.nav-tab.active {
  color: var(--color-teal-600);
}
.nav-tab span {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* Active indicator dot */
.nav-tab.active::after {
  content: '';
  display: block;
  width: 4px; height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-teal-600);
  margin-top: 2px;
}
```

### 3.3 SideNavBar (Desktop only, ≥ 1024px)

```css
.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: 240px;
  height: 100vh;
  background: var(--color-bg-white);
  border-right: 1px solid var(--color-border);
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  z-index: 50;
}
.sidebar-logo {
  padding: 0 12px 24px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 16px;
}
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.sidebar-nav-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}
.sidebar-nav-item.active {
  background: var(--color-teal-100);
  color: var(--color-teal-600);
  font-weight: 600;
}
.sidebar-profile {
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 10px;
}
```

---

## 4. Component Library

### 4.1 Cards

```css
.card {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-lg);
}

/* Balance card — dark navy with white text */
.card-balance {
  background: var(--color-navy-900);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  color: var(--color-text-white);
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(13, 31, 60, 0.25);
}
.card-balance::before {
  content: '';
  position: absolute;
  top: -50px; right: -50px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
}
.card-balance .balance-label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
}
.card-balance .balance-amount {
  font-size: var(--text-2xl);
  font-weight: 800;
  margin: 8px 0 4px;
}
.card-balance .balance-sub {
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.6);
}

/* Quote card */
.card-quote {
  background: var(--color-teal-100);
  border: 1px solid rgba(29, 158, 117, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
.card-quote .quote-label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
.card-quote .quote-amount {
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--color-teal-600);
  margin: 4px 0;
}
.card-quote .quote-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.card-quote .quote-timer {
  background: white;
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
}
.card-quote .quote-timer.expiring {
  color: var(--color-error);
  animation: pulse 1s ease infinite;
}
```

### 4.2 Buttons

```css
.btn-primary {
  background: var(--color-navy-900);
  color: var(--color-text-white);
  border-radius: var(--radius-full);
  font-family: var(--font-primary);
  font-weight: 700;
  font-size: var(--text-base);
  padding: 16px 32px;
  width: 100%;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  box-shadow: 0 4px 12px rgba(13, 31, 60, 0.25);
}
.btn-primary:hover  { opacity: 0.88; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Teal variant — for confirmations */
.btn-teal {
  background: var(--color-teal-600);
  color: white;
  box-shadow: var(--shadow-teal);
}
.btn-teal:hover { background: var(--color-teal-500); }

/* Ghost */
.btn-ghost {
  background: var(--color-bg-app);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: var(--radius-full);
  font-weight: 600;
  padding: 14px 24px;
}

/* Action button (icon + label, in dashboard row) */
.btn-action {
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.1s;
  flex: 1;
}
.btn-action:hover  { box-shadow: var(--shadow-card-hover); }
.btn-action:active { transform: scale(0.97); }
.btn-action .action-icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-navy-100);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-navy-900);
}
/* Send button gets teal icon bg */
.btn-action.send .action-icon {
  background: var(--color-teal-100);
  color: var(--color-teal-600);
}
.btn-action span {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
```

### 4.3 Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.badge-success { background: var(--color-success-bg); color: var(--color-success); }
.badge-pending { background: var(--color-pending-bg); color: var(--color-pending); }
.badge-warning { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-error   { background: var(--color-error-bg);   color: var(--color-error); }
.badge-transit { background: var(--color-transit-bg); color: var(--color-transit); }
.badge-teal    { background: var(--color-teal-100);   color: var(--color-teal-600); }
```

### 4.4 Input Fields

```css
.input-field {
  background: var(--color-bg-white);
  border: 1.5px solid var(--color-border-input);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-primary);
  font-size: var(--text-base);
  padding: 13px 16px;
  width: 100%;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input-field:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(29, 158, 117, 0.12);
}
.input-field::placeholder { color: var(--color-text-muted); }

/* Amount input — large centered */
.input-amount {
  background: transparent;
  border: none;
  font-size: var(--text-3xl);
  font-weight: 800;
  color: var(--color-text-primary);
  width: 100%;
  text-align: center;
  outline: none;
}

/* Field label */
.field-label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}
```

### 4.5 Transaction List Item

```css
.tx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}
.tx-item:last-child { border-bottom: none; }

.tx-icon {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tx-icon.success { background: var(--color-success-bg); color: var(--color-success); }
.tx-icon.pending { background: var(--color-pending-bg); color: var(--color-pending); }
.tx-icon.failed  { background: var(--color-error-bg);   color: var(--color-error); }
.tx-icon.transit { background: var(--color-transit-bg); color: var(--color-transit); }

.tx-info { flex: 1; min-width: 0; }
.tx-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: 2px;
}
.tx-right { text-align: right; flex-shrink: 0; }
.tx-amount {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-primary);
}
```

---

## 5. Screen Specifications

### 5.1 Dashboard — Mobile

```
┌─────────────────────────────────────┐
│  TopNavBar: logo | 🔔 | avatar      │
├─────────────────────────────────────┤
│  padding: 16px                      │
│                                     │
│  ┌─── Balance Card (navy) ────────┐ │
│  │  AVAILABLE BALANCE              │ │
│  │  Bs. 2,450.00                   │ │
│  │  ≈ $263.45 USD  +2.4% ▲        │ │
│  └───────────────────────────────┘ │
│                                     │
│  [SEND] [LOAD] [WITHDRAW]           │  ← 3 btn-action equal width
│                                     │
│  RECENT TRANSACTIONS ─── See All →  │
│  ┌──────────────────────────────┐   │
│  │ 🇨🇴 Envío Colombia   510 BOB │   │
│  │   hace 4h · BOB→COP  PENDING │   │
│  │ ✓ Envío Argentina  1,200 BOB │   │
│  │   ayer · BOB→ARS   SUCCESS   │   │
│  └──────────────────────────────┘   │
│                                     │
│  padding-bottom: 88px               │  ← space for BottomNavBar
├─────────────────────────────────────┤
│  BottomNavBar (fixed)               │
└─────────────────────────────────────┘
```

### 5.2 Dashboard — Desktop

```
┌───────────┬─────────────────────────────────────────────┐
│  Sidebar  │  TopNavBar                                   │
│  240px    ├─────────────────────────────────────────────┤
│           │  padding: 32px                              │
│  Logo     │  ┌──── Balance Card ──┐ ┌─── Quick Send ──┐│
│  ──────   │  │  Bs. 2,450.00      │ │  [Send widget]  ││
│  navItems │  │  +2.4% this month  │ │                 ││
│           │  └────────────────────┘ └─────────────────┘│
│           │                                              │
│  ──────   │  ┌──── Recent Transactions table ─────────┐ │
│  Profile  │  │ Date | Beneficiary | Amount | Status   │ │
└───────────┴─────────────────────────────────────────────┘
```

### 5.3 Send Money Step 1 — Mobile

```
┌─────────────────────────────────────┐
│  ← Send Money                       │
│                                     │
│  ┌─── Country Selector ───────────┐ │
│  │  🇨🇴  Colombia              ▼  │ │
│  └───────────────────────────────┘ │
│                                     │
│  YOU SEND                           │  ← field-label
│  ┌─── Amount input ───────────────┐ │
│  │       635.00          [BOB]    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─── Quote Card (teal bg) ──────┐ │
│  │  RECIPIENT GETS    ⏱ 0:58     │ │
│  │  267,483 COP                   │ │
│  │  1 BOB = 421.23 COP           │ │
│  │  Fee: 17.70 BOB · Pocas horas │ │
│  └───────────────────────────────┘ │
│                                     │
│  [──────── Continuar ───────────]   │  ← btn-primary sticky
└─────────────────────────────────────┘
```

### 5.4 Contacts — Mobile

```
┌─────────────────────────────────────┐
│  TopNavBar + search bar below       │
│  🔍 Search contacts...              │
│                                     │
│  FAVORITES ────────────────────     │  ← horizontal scroll
│  [MV 🇨🇴] [JP 🇦🇷] [WZ 🇨🇳] ...  │
│                                     │
│  ALL CONTACTS ─────────────────     │
│  ┌──────────────────────────────┐   │
│  │ MV Marina Valdez    🇨🇴  ★   │   │
│  │    Bancolombia ****4512      │   │
│  │ JP Juan Pérez       🇦🇷      │   │
│  │    Banco Nación ****8821     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 6. Status → Badge Mapping

| Transaction Status | Badge Variant | Label ES |
|---|---|---|
| `completed` | success | Completada |
| `payout_sent` | transit | En tránsito |
| `payout_in_transit` | transit | En tránsito |
| `processing` | transit | Procesando |
| `in_transit` | transit | En tránsito |
| `payin_confirmed` | pending | Verificando pago |
| `payin_pending` | pending | Pago pendiente |
| `payout_pending` | warning | Pago manual |
| `pending_funding` | warning | Fondos pendientes |
| `failed` | error | Fallida |
| `refunded` | warning | Reembolsada |
| `initiated` | pending | Iniciada |

---

## 7. Anti-patterns (FORBIDDEN)

1. ❌ Dark/navy background for the main app shell — use #F4F6FA
2. ❌ Dark text on dark background anywhere except balance card
3. ❌ Purple as primary color — navy + teal only
4. ❌ Inter, Roboto, Arial fonts — Manrope only
5. ❌ Border-radius < 8px on cards
6. ❌ Cards without shadow — always add --shadow-card
7. ❌ Exposing USDC/Stellar/pivot to user
8. ❌ Amount inputs with visible borders — transparent style
9. ❌ Status text without .badge component
10. ❌ Grid of 4+ action buttons — maximum 3 (Send, Load, Withdraw)
11. ❌ "Mi Wallet BOB", "Mis Reclamos", "Soporte" as dashboard sections
12. ❌ Light gray text on white cards — minimum contrast ratio 4.5:1

---

## 8. Responsive Rules

```
Mobile (< 1024px):
  - TopNavBar (sticky) + BottomNavBar (fixed)
  - Single column
  - Full-width cards with 16px horizontal padding
  - Sticky action buttons (bottom of screen)
  - content padding-bottom: 88px (BottomNavBar height)

Desktop (≥ 1024px):
  - SideNavBar (240px fixed) + TopNavBar
  - Main content: margin-left: 240px
  - Multi-column layouts
  - Max content width: 1100px
  - No BottomNavBar
```

---

## 9. Animations

```css
/* Page enter */
.page-enter { animation: fadeSlideUp 0.2s ease forwards; }
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Quote flash on update */
.quote-flash { animation: flashGreen 0.5s ease; }
@keyframes flashGreen {
  0%   { background: rgba(29,158,117,0.2); }
  100% { background: var(--color-teal-100); }
}

/* Timer pulse < 10s */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

/* Standard */
--transition: 0.15s ease;
```

---

## 10. Change Protocol

1. Update this file with rationale
2. Increment version number
3. Test at 390px AND 1440px
4. Verify anti-patterns list
5. Commit: "design: [description] per Alyto-Alter v[X.Y]"

**Do not change visual design without updating this spec first.**