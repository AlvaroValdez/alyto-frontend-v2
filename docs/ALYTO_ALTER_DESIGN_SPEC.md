# Alyto-Alter Design System — v1.0

> **Source of truth for all visual decisions in Alyto Wallet V2.0 frontend.**
> Any conflict between implementation prompts and this spec → **THE SPEC WINS**.

---

## §1 — Design Tokens

### §1.1 Color Tokens

#### Background
| CSS Variable | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#0F1628` | Page / screen background |
| `--color-bg-secondary` | `#1A2340` | Cards, panels, list items |
| `--color-bg-elevated` | `#1F2B4D` | Elevated cards, hover states |
| `--color-bg-overlay` | `rgba(15,22,40,0.85)` | Modal backdrops |

#### Text
| CSS Variable | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#FFFFFF` | Headings, labels, main content |
| `--color-text-secondary` | `#8A96B8` | Subtitles, descriptions |
| `--color-text-muted` | `#4E5A7A` | Timestamps, metadata, placeholders |

#### Action / Accent
| CSS Variable | Value | Usage |
|---|---|---|
| `--color-accent-teal` | `#14B8A6` | Primary CTAs, active states, links |
| `--color-accent-teal-hover` | `#0D9488` | Hover on teal elements |
| `--color-accent-teal-dim` | `rgba(20,184,166,0.12)` | Teal tinted backgrounds |
| `--color-accent-teal-border` | `rgba(20,184,166,0.25)` | Teal borders |

#### Status
| CSS Variable | Value | Usage |
|---|---|---|
| `--color-success` | `#22C55E` | Positive amounts, completed |
| `--color-success-bg` | `rgba(34,197,94,0.12)` | Success badge background |
| `--color-warning` | `#F59E0B` | Pending, warnings |
| `--color-warning-bg` | `rgba(245,158,11,0.12)` | Warning badge background |
| `--color-error` | `#EF4444` | Errors, failures |
| `--color-error-bg` | `rgba(239,68,68,0.12)` | Error badge background |
| `--color-teal-status` | `#14B8A6` | In-transit, processing badge |
| `--color-teal-status-bg` | `rgba(20,184,166,0.12)` | Teal badge background |
| `--color-pending` | `#8A96B8` | Payin-pending badge text |
| `--color-pending-bg` | `rgba(138,150,184,0.12)` | Pending badge background |

#### Border
| CSS Variable | Value | Usage |
|---|---|---|
| `--color-border` | `#263050` | Default dividers, card borders |
| `--color-border-light` | `rgba(38,48,80,0.6)` | Subtle borders |

### §1.2 Gradient Tokens
| CSS Variable | Value |
|---|---|
| `--gradient-balance` | `linear-gradient(135deg, #1D3461 0%, #0F1628 60%, #1A2030 100%)` |
| `--gradient-card` | `linear-gradient(135deg, #1A2340 0%, #1F2B4D 100%)` |
| `--gradient-teal-glow` | `radial-gradient(ellipse at top, rgba(20,184,166,0.10) 0%, transparent 60%)` |

### §1.3 Typography Scale
| CSS Variable | Value | Px equiv |
|---|---|---|
| `--font-xs` | `0.625rem` | 10px |
| `--font-sm` | `0.75rem` | 12px |
| `--font-base` | `0.875rem` | 14px |
| `--font-md` | `0.9375rem` | 15px |
| `--font-lg` | `1rem` | 16px |
| `--font-xl` | `1.125rem` | 18px |
| `--font-2xl` | `1.375rem` | 22px |
| `--font-3xl` | `1.75rem` | 28px |
| `--font-4xl` | `2.5rem` | 40px |

**Font family:** `'Manrope', sans-serif` — weights: 400, 500, 600, 700, 800

### §1.4 Spacing Scale (multiples of 4px)
| Variable | Value |
|---|---|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `12px` |
| `--space-lg` | `16px` |
| `--space-xl` | `20px` |
| `--space-2xl` | `24px` |
| `--space-3xl` | `32px` |
| `--space-4xl` | `48px` |

### §1.5 Border Radius
| Variable | Value |
|---|---|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `20px` |
| `--radius-2xl` | `24px` |
| `--radius-full` | `9999px` |

### §1.6 Shadows
| Variable | Value |
|---|---|
| `--shadow-card` | `0 4px 24px rgba(0,0,0,0.30)` |
| `--shadow-hero` | `0 8px 40px rgba(0,0,0,0.50)` |
| `--shadow-teal` | `0 4px 20px rgba(20,184,166,0.25)` |
| `--shadow-modal` | `0 24px 64px rgba(0,0,0,0.60)` |

### §1.7 Animation / Transition Tokens
| Variable | Value |
|---|---|
| `--transition-fast` | `all 0.15s ease` |
| `--transition-normal` | `all 0.25s ease` |
| `--transition-slow` | `all 0.40s ease` |

#### Keyframe: `flashTeal`
```css
@keyframes flashTeal {
  0%   { background-color: var(--color-bg-secondary); }
  30%  { background-color: var(--color-accent-teal-dim); }
  100% { background-color: var(--color-bg-secondary); }
}
```

#### Keyframe: `pulseRed` (countdown timer < 10s)
```css
@keyframes pulseRed {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
```

---

## §2 — Component Specifications

### §2.1 Button
**File:** `src/components/ui/Button.jsx`

**Props:** `variant` ('primary' | 'secondary' | 'ghost'), `size` ('sm'|'md'|'lg'), `disabled`, `loading`, `fullWidth`

| Variant | Background | Text | Border | Shadow |
|---|---|---|---|---|
| `primary` | `--color-accent-teal` | `#0F1628` | none | `--shadow-teal` |
| `secondary` | transparent | `--color-text-primary` | `--color-border` | none |
| `ghost` | transparent | `--color-text-secondary` | none | none |

- Loading state: inline spinner (Loader2 icon, animate-spin) replaces label
- Disabled: `opacity: 0.4`, `cursor: not-allowed`
- Full-width: `width: 100%`
- Hover: primary → `--color-accent-teal-hover`; secondary → border `--color-accent-teal`; ghost → text `--color-text-primary`

### §2.2 Card
**File:** `src/components/ui/Card.jsx`

**Props:** `variant` ('default' | 'balance' | 'elevated'), `className`, `children`

| Variant | Background | Border | Extra |
|---|---|---|---|
| `default` | `--color-bg-secondary` | `--color-border` | none |
| `balance` | `--gradient-balance` | none | Decorative circles (::before, ::after), `--shadow-hero` |
| `elevated` | `--color-bg-elevated` | `--color-border` | `--shadow-card` |

Balance card decorative circles:
```css
.card-balance::before { /* glow at top */ }
.card-balance::after  { /* circle top-right */ }
```

### §2.3 Badge
**File:** `src/components/ui/Badge.jsx`

**Props:** `variant` ('success' | 'pending' | 'warning' | 'error' | 'teal'), `children`

| Variant | Background | Text | Icon |
|---|---|---|---|
| `success` | `--color-success-bg` | `--color-success` | ✓ |
| `pending` | `--color-pending-bg` | `--color-pending` | ⏳ |
| `warning` | `--color-warning-bg` | `--color-warning` | ⚠ |
| `error` | `--color-error-bg` | `--color-error` | ✕ |
| `teal` | `--color-teal-status-bg` | `--color-teal-status` | ↗ |

### §2.4 Input
**File:** `src/components/ui/Input.jsx`

**Props:** `type`, `placeholder`, `prefix`, `suffix`, `label`, `error`, `value`, `onChange`

- Background: `--color-bg-secondary`
- Border: `--color-border`
- Focus border: `--color-accent-teal`
- Focus ring: `0 0 0 2px var(--color-accent-teal-dim)`
- Label: uppercase, `0.75rem`, `--color-text-secondary`, `letter-spacing: 0.06em`
- Error: border `--color-error`, ring `rgba(239,68,68,0.12)`

### §2.5 QuoteCard
**File:** `src/components/ui/QuoteCard.jsx`

**Props:** `destinationAmount`, `destinationCurrency`, `effectiveRate`, `totalDeducted`, `originCurrency`, `deliveryTime`, `expiresIn` (seconds), `loading`, `onFlash`

- Container: `card default`
- Shows "Calculando…" skeleton while `loading`
- Live countdown timer from `expiresIn` seconds
  - Normal: `--color-text-muted`
  - < 30s: `--color-warning`
  - < 10s: `--color-error` + `pulseRed` animation
- Flash animation (`flashTeal`) triggered when quote updates
- Rate line: `1 {originCurrency} = {effectiveRate} {destinationCurrency}`
- Amount: `--color-success`, bold

### §2.6 StatusBadge
**File:** `src/components/ui/StatusBadge.jsx`

**Props:** `status` (transaction status string)

| Status | Variant | Label |
|---|---|---|
| `completed` | `success` | Completada |
| `payout_sent` | `teal` | En tránsito |
| `processing` | `teal` | Procesando |
| `in_transit` | `teal` | En tránsito |
| `payin_confirmed` | `pending` | Verificando |
| `payin_pending` | `pending` | Pago pendiente |
| `failed` | `error` | Fallida |
| `refunded` | `warning` | Reembolsada |

---

## §3 — Navigation Components

### §3.1 BottomNavBar (mobile, < 1024px)
**File:** `src/components/layout/BottomNavBar.jsx`

- Position: `fixed bottom-0`, full width, `max-width: 430px`, centered
- Background: `--color-bg-primary` with `backdrop-filter: blur(20px)`
- Border top: `1px solid --color-border`
- Border radius top: `24px`
- Padding: `12px 0 calc(20px + env(safe-area-inset-bottom))`
- **5 tabs:** Home (🏠), Assets (💳), Transfers (↗), Contacts (👥), Profile (👤)
- Active: `--color-bg-elevated` pill + `--color-text-primary`
- Inactive: `--color-text-muted`
- Use `NavLink` for active detection

### §3.2 SideNavBar (desktop, ≥ 1024px)
**File:** `src/components/layout/SideNavBar.jsx`

- Width: `260px`, fixed left, full height
- Background: `--color-bg-secondary`
- Border right: `1px solid --color-border`
- Logo at top (24px padding)
- Nav items: Dashboard, Cuentas, Transferencias, Contactos, Perfil
- Active: `--color-bg-elevated` + `--color-text-primary` + left border teal `3px solid --color-accent-teal`
- Inactive: `--color-text-muted`
- User info at bottom (avatar 36px + name + entity badge)

### §3.3 TopNavBar (desktop, ≥ 1024px)
**File:** `src/components/layout/TopNavBar.jsx`

- Height: `64px`, sticky top
- Background: `--color-bg-secondary`, border bottom: `--color-border`
- Left: Page title (dynamic, passed as prop)
- Right: Bell icon (with unread badge) + Avatar (36px)

---

## §4 — Screen Layouts

### §4.1 Dashboard — Mobile
1. Balance card (`card-balance`): "Total Balance" label → amount → USD equiv → decorative circles
2. Action row (3 buttons): Enviar / Cargar / Retirar — `btn-ghost` with centered icon
3. "Recientes" section (`label-uppercase`) → transaction list items

### §4.2 Dashboard — Desktop
- Two columns: 60% (balance + actions + table) | 40% (quick-send + alerts)
- Transaction table: Fecha | Beneficiario | Corredor | Monto | Estado

### §4.5 Contacts
**Mobile:**
- Search bar (input with 🔍 prefix)
- "Favoritos" horizontal scroll (avatar + name + flag cards)
- "Todos" full list (avatar + name + bank + country | last amount + star)

**Desktop:**
- "Quick Access" grid (4 cols)
- Full table: Nombre | Banco | País | Última tx | Acciones

---

## §5 — Global Rules

1. **Mobile-first** — mobile styles first, then desktop via `@media (min-width: 1024px)`
2. **Touch targets** — minimum 44×44px
3. **Contrast** — body text ≥ 4.5:1 contrast on bg-primary
4. **No logic changes** — only visual classes / styles / icons
5. **Preserve** all event handlers, state, routes, component structure
6. **Font** — `'Manrope', sans-serif` everywhere
7. **Scrollbars** — hidden on all scrollable containers (`.scrollbar-hide`)

---

*Alyto-Alter Design System v1.0 — AV Finance / Alyto Wallet*
