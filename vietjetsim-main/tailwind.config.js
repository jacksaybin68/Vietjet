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
        primary: { DEFAULT: '#EC2029', dark: '#C41017', light: '#FF4D53' },
        accent: { DEFAULT: '#FFD400', dark: '#E6BF00', light: '#FFE033' },
        navy: { DEFAULT: '#1A2948', dark: '#0F1E3A', light: '#253660' },
        vj: {
          text: '#333333',
          gray: '#6D6E71',
          muted: '#939598',
          red: '#EC2029',
          'red-dark': '#6F0000',
          yellow: '#FFD400',
          'yellow-2': '#FBB612',
          orange: '#F9A51A',
          navy: '#1A2948',
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
        'gradient-vj': 'linear-gradient(135deg, #EC2029 0%, #1A2948 100%)',
        'gradient-red-vj':
          'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        'gradient-hero': 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
        'gradient-red': 'linear-gradient(135deg, #EC2029 0%, #C41017 50%, #8B0D12 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
