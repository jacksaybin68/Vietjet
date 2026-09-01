/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['KoHo', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        display: ['Be Vietnam Pro', 'KoHo', 'system-ui', 'sans-serif'],
        heading: ['Be Vietnam Pro', 'KoHo', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dark: 'var(--accent-dark)',
          light: 'var(--accent-secondary)',
        },
        navy: {
          DEFAULT: 'var(--vj-navy)',
          dark: '#0f1e3a',
          light: '#253660',
        },
        vj: {
          text: 'var(--vj-text)',
          gray: 'var(--vj-text-gray)',
          muted: 'var(--vj-text-muted)',
          red: 'var(--vj-red)',
          'red-dark': 'var(--vj-red-dark)',
          yellow: 'var(--vj-yellow)',
          'yellow-2': 'var(--vj-yellow-2)',
          orange: 'var(--vj-orange)',
          navy: 'var(--vj-navy)',
        },
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        arch: '12rem 12rem 0.5rem 0.5rem',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      boxShadow: {
        'vj-sm': '0 2px 8px rgba(0,0,0,0.07)',
        'vj-md': '0 4px 16px rgba(0,0,0,0.08)',
        'vj-lg': '0 8px 28px rgba(0,0,0,0.10)',
        card: '0 4px 24px rgba(0,0,0,0.08)',
        'glow-red': '0 0 20px rgba(236, 32, 41, 0.35)',
        'vj-btn': '0 2px 8px rgba(236,32,41,0.22), 0 1px 3px rgba(236,32,41,0.14)',
        'vj-btn-hover': '0 6px 20px rgba(236,32,41,0.32), 0 2px 8px rgba(236,32,41,0.18)',
      },
      backgroundImage: {
        'gradient-vj': 'linear-gradient(135deg, var(--primary) 0%, var(--vj-navy) 100%)',
        'gradient-red-vj':
          'linear-gradient(180deg, var(--primary-light) 34.8%, var(--primary-dark) 182.34%)',
        'gradient-vj-red':
          'linear-gradient(180deg, var(--primary-light) 34.8%, var(--primary-dark) 182.34%)',
        'gradient-vj-yellow':
          'linear-gradient(180deg, var(--accent-dark), var(--accent-secondary))',
        'gradient-hero': 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
        'gradient-red': 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 50%, var(--primary-dark) 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
