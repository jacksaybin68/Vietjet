/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['KoHo', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Be Vietnam Pro', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Be Vietnam Pro', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        koho: ['KoHo', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette lifted from vietjetair.com production bundle
        // (main.f5b4a549.chunk.css + main.6df371cf.chunk.js).
        vjred: '#EC2029',
        vjyellow: '#FFDD00',
        vjorange: '#F4511E',
        vjpurple: '#8075D6',
        vjblue: '#2563D4',
        vjdark: '#333333',
        surface: '#F7F7F7',
        primary: {
          DEFAULT: '#EC2029',
          dark: '#D91A21',
          light: '#F5717A',
          deep: '#6F0000',
        },
        accent: {
          DEFAULT: '#FFDD00',
          dark: '#F9A51A',
          light: '#FBB612',
        },
        navy: {
          DEFAULT: '#242424',
          dark: '#151515',
          light: '#3d3d3d',
        },
        vj: {
          text: '#333333',
          gray: '#6C6C6C',
          muted: '#939393',
          red: '#EC2029',
          'red-dark': '#D91A21',
          'red-deep': '#6F0000',
          yellow: '#FFDD00',
          'yellow-2': '#FBB612',
          orange: '#F4511E',
          purple: '#8075D6',
          blue: '#2563D4',
          navy: '#242424',
          dark: '#242424',
          border: '#ececec',
          'surface-alt': '#fafafa',
          // Gradient endpoints used by the header menu bar and CTA buttons.
          'red-grad-from': '#D91A21',
          'red-grad-to': '#6F0000',
          'gold-from': '#F9A51A',
          'gold-mid': '#FBB612',
          'gold-to': '#FFDD00',
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
        // Gradient tokens mirroring vietjetair.com: the menu bar / date-picker
        // toolbar use the red sweep, CTA buttons use the gold sweep.
        'gradient-vj': 'linear-gradient(180deg, #D91A21 34.8%, #6F0000 182.34%)',
        'gradient-red-vj': 'linear-gradient(180deg, #D91A21 34.8%, #6F0000 182.34%)',
        'gradient-vj-red': 'linear-gradient(180deg, #D91A21 34.8%, #6F0000 182.34%)',
        'gradient-vj-menubar': 'linear-gradient(180deg, #D91A21 34.8%, #AB0303 182.34%)',
        'gradient-vj-gold':
          'linear-gradient(60.29deg, #F9A51A -4.93%, #FBB612 18.27%, #FFDD00 71.59%)',
        'gradient-vj-yellow': 'linear-gradient(60.29deg, #F9A51A -4.93%, #FFDD00 71.59%)',
        'gradient-hero':
          'linear-gradient(to bottom, rgba(36,36,36,0.2) 0%, rgba(36,36,36,0.72) 100%)',
        'gradient-red': 'linear-gradient(135deg, #F32732 0%, #EC2029 50%, #6F0000 100%)',
        'gradient-navy': 'linear-gradient(135deg, #3D3D3D 0%, #151515 100%)',
        'gradient-yellow': 'linear-gradient(60.29deg, #F9A51A -4.93%, #FFDD00 71.59%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        marquee: 'marquee 20s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
};
