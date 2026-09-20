/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--app-bg)',
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
          inset: 'var(--surface-inset)',
          tintedBlue: 'var(--surface-tinted-blue)',
          'tinted-blue': 'var(--surface-tinted-blue)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        fg: {
          DEFAULT: 'var(--fg)',
          muted: 'var(--fg-muted)',
          faint: 'var(--fg-faint)',
        },
        sidebar: {
          bg: 'var(--sidebar-bg)',
          hover: 'var(--sidebar-hover)',
          active: 'var(--sidebar-active)',
          border: 'var(--sidebar-border)',
          fg: 'var(--sidebar-fg)',
          fgMuted: 'var(--sidebar-fg-muted)',
        },
        status: {
          available: '#16a34a',
          enroute: '#d97706',
          busy: '#dc2626',
          offline: '#64748b',
        },
        accent: {
          red: 'rgb(var(--accent-red-rgb, 220 38 38) / <alpha-value>)',
          redSubtle: 'var(--accent-red-subtle)',
          'red-subtle': 'var(--accent-red-subtle)',
          green: 'rgb(var(--accent-green-rgb, 22 163 74) / <alpha-value>)',
          greenSubtle: 'var(--accent-green-subtle)',
          'green-subtle': 'var(--accent-green-subtle)',
          amber: 'rgb(var(--accent-amber-rgb, 217 119 6) / <alpha-value>)',
          amberSubtle: 'var(--accent-amber-subtle)',
          'amber-subtle': 'var(--accent-amber-subtle)',
          blue: 'rgb(var(--accent-blue-rgb, 37 99 235) / <alpha-value>)',
          blueSubtle: 'var(--accent-blue-subtle)',
          'blue-subtle': 'var(--accent-blue-subtle)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        elevated: 'var(--shadow-elevated)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-green': 'var(--shadow-glow-green)',
      },
    },
  },
  plugins: [],
}
