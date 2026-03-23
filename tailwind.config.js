/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        // ── Paleta corporativa Alyto ──────────────────────────────
        primary:  '#233E58',   // Azul oscuro institucional
        accent:   '#F5D410',   // Amarillo Alyto (CTAs, highlights)
        dark:     '#1A1A1A',   // Fondo oscuro base
        light:    '#F2F2F2',   // Superficie clara

        // ── Sistema cromático completo (skill alyto-ux) ──────────
        brand: {
          navy:           '#1D3461',
          silver:         '#C4CBD8',
          'silver-hover': '#A8B0C0',
        },
        bg: {
          base:     '#0F1628',
          surface:  '#1A2340',
          elevated: '#1F2B4D',
        },
        border: {
          default: '#1A2340',
          subtle:  '#263050',
        },
        'text-secondary': '#8A96B8',
        'text-muted':     '#4E5A7A',
        'text-accent':    '#C4CBD8',
        'status-success': '#22C55E',
        'status-error':   '#EF4444',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card':   '0 4px 24px rgba(0,0,0,0.3)',
        'hero':   '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(196,203,216,0.08)',
        'accent': '0 4px 20px rgba(245,212,16,0.25)',
        'silver': '0 4px 20px rgba(196,203,216,0.3)',
      },
      backgroundImage: {
        'gradient-hero':    'linear-gradient(135deg, #1D3461 0%, #0F1628 60%, #1A2030 100%)',
        'gradient-card':    'linear-gradient(135deg, #1A2340 0%, #1D3461 100%)',
        'gradient-primary': 'linear-gradient(135deg, #233E58 0%, #1D3461 100%)',
      },
    },
  },
  plugins: [],
}
