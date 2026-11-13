/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontSize: {
        // Thang chuẩn Phase 1: 12, 14, 16, 20, 24, 32, 40px.
        // text-4xl của Tailwind = 36px nên thêm 2xl2/5xl2 để thay text-[40px].
        '2xl2': ['2.5rem', { lineHeight: '3rem' }],
        '5xl2': ['2.5rem', { lineHeight: '2.75rem' }],
        // Cỡ nhỏ cho chip/badge/drawer, không có bậc tương ứng trong thang
        // mặc định; giữ đúng pixel để rời khỏi text-[Npx] mà không xê dịch layout.
        '3xs': ['0.5625rem', { lineHeight: '1rem' }], // 9px
        '2xs': ['0.625rem', { lineHeight: '1rem' }], // 10px
        xs2: ['0.6875rem', { lineHeight: '1rem' }], // 11px
        sm2: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        base2: ['0.9375rem', { lineHeight: '1.375rem' }], // 15px
        '3xl2': ['1.75rem', { lineHeight: '2.125rem' }], // 28px
        '4xs': ['0.5rem', { lineHeight: '0.875rem' }], // 8px
        lg2: ['1.0625rem', { lineHeight: '1.5rem' }], // 17px
        lg3: ['1.1875rem', { lineHeight: '1.625rem' }], // 19px
        xl2: ['1.3125rem', { lineHeight: '1.75rem' }], // 21px
        xl3: ['1.4375rem', { lineHeight: '1.875rem' }], // 23px
        // Bậc 20px — site thật dùng ở tiêu đề giá vé rẻ nhất và các heading
        // cấp 2 trong khu vực tìm vé. Tailwind mặc định không có 20px với
        // line-height 24px (`text-xl` là 20px/28px).
        '2xl3': ['1.25rem', { lineHeight: '1.5rem' }], // 20px
        // 22px / 25px / 26px / 30px — đo được trong JS bundle của
        // vietjetair.com (main.6165d6fe.chunk.js).
        xl4: ['1.375rem', { lineHeight: '1.75rem' }], // 22px
        '2xl4': ['1.5625rem', { lineHeight: '1.875rem' }], // 25px
        xl5: ['1.625rem', { lineHeight: '2rem' }], // 26px
        '3xl3': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        // 56px / 76px — tiêu đề cấp 2 của các khối nội dung trên trang chủ,
        // đo được trên vietjetair.com (DOM sống, 13/11/2026). Tailwind mặc
        // định không có bậc này (`text-5xl` là 48px/1).
        headline: ['3.5rem', { lineHeight: '4.75rem' }], // 56px / 76px
        // 7px — nhỏ hơn 4xs (8px), dùng cho nhãn trạng thái trong sơ đồ ghế
        // và các chip rất nhỏ trong kết quả tìm vé.
        '5xs': ['0.4375rem', { lineHeight: '0.625rem' }], // 7px
        // Các bậc lẻ 0.5px còn lại trong khu vực người dùng (badge nhỏ,
        // chữ phụ trong drawer/menu). Giữ đúng pixel để không xê dịch layout.
        '2xs2': ['0.65625rem', { lineHeight: '1rem' }], // 10.5px
        sm3: ['0.78125rem', { lineHeight: '1.125rem' }], // 12.5px
        sm4: ['0.84375rem', { lineHeight: '1.25rem' }], // 13.5px
      },
      // Phase 1 mục 4 (2026-10-19): Spacing scale chuẩn 4px grid.
      // Dùng để dần migrate khỏi spacing tùy ý (p-[Npx], m-[Npx]).
      // Không override Tailwind defaults — chỉ thêm alias có ý nghĩa.
      spacing: {
        1: '0.25rem', // 4px
        2: '0.5rem', // 8px
        3: '0.75rem', // 12px
        4: '1rem', // 16px
        6: '1.5rem', // 24px
        8: '2rem', // 32px
        12: '3rem', // 48px
        16: '4rem', // 64px
        24: '6rem', // 96px
        // Semantic aliases for common VJ layout patterns
        'section-y': '4rem', // 64px — section vertical padding
        'section-y-sm': '2rem', // 32px — section vertical padding (mobile)
        'header-h': '4rem', // 64px — header height
        'card-p': '1.5rem', // 24px — card padding
        'card-gap': '1rem', // 16px — card gap
        // Bậc lẻ từng được dùng ở component public nhưng Tailwind chỉ có
        // bậc chẵn (0.5rem, 0.75rem…) -> `py-0.2`, `sm:p-4.5` không sinh CSS.
        0.2: '0.125rem', // 2px
        4.5: '1.125rem', // 18px
        // `h-13` / `w-13` không có sẵn trong Tailwind (bậc chẵn).
        13: '3.25rem', // 52px
        // Container nội dung chuẩn của vietjetair.com: 1200px, margin 120px mỗi
        // bên trên viewport 1440px (đo được từ DOM sống).
        'container-vj': '75rem', // 1200px
        // Container rộng hơn dùng cho hero: 1320px (nội dung 1095px, margin
        // 172.5px mỗi bên trên viewport 1440px).
        'container-vj-wide': '82.5rem', // 1320px
      },
      fontFamily: {
        // Site thật dùng HAI họ — xem docs/qa/VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md §2:
        //   KoHo (300–700) cho toàn bộ văn bản,
        //   JambonoMedium cho nút / CTA / nhãn in đậm.
        sans: ['KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        koho: ['KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jambono: ['JambonoMedium', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jambonoBlack: ['JambonoBlack', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jambonoLight: ['JambonoLight', 'KoHo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // `border-b-3` được dùng ở form đăng ký nhưng Tailwind chỉ có
      // borderWidth 0/1/2/4/8 -> class không sinh CSS.
      borderWidth: {
        3: '3px',
      },
      // `duration-250` và `scale-98` cũng không có sẵn trong Tailwind 3.4.
      transitionDuration: {
        250: '250ms',
      },
      scale: {
        98: '0.98',
      },
      // `grayscale-25` và `perspective-1000` không có sẵn trong Tailwind.
      grayscale: {
        0: 'grayscale(0)',
        25: 'grayscale(0.25)',
        50: 'grayscale(0.5)',
        75: 'grayscale(0.75)',
        100: 'grayscale(1)',
      },
      perspective: {
        1000: '1000px',
      },
      // `font-heading-800` / `font-heading-sm` được dùng như bậc chữ
      // (font-weight) ở các trang lỗi và trang public. Tailwind mặc định
      // không có các bậc này nên class không sinh ra CSS.
      fontWeight: {
        'heading-300': '300',
        'heading-400': '400',
        'heading-500': '500',
        'heading-600': '600',
        'heading-700': '700',
        'heading-800': '800',
        'heading-900': '900',
        'heading-sm': '500',
        'heading-xs': '400',
        'heading-lg': '700',
        // `text-semibold` được dùng ở một vài component.
        semibold: '600',
      },
      colors: {
        brand: {
          wine: '#780000',
          wineDark: '#5e0000',
          cta: '#FFDD00',
          ctaHover: '#FBB612',
        },
        // Brand palette lifted from vietjetair.com production bundle
        // (main.f5b4a549.chunk.css + main.6df371cf.chunk.js).
        vjred: '#ED1C24',
        'vjred-dark': '#DA251D',
        vjyellow: '#FFDD00',
        vjgold: '#FFD000',
        vjwine: '#5E0B0B',
        vjnavy: '#141d2f',
        'vjnavy-dark': '#0b111e',
        vjorange: '#F4511E',
        vjpurple: '#8075D6',
        vjblue: '#2563D4',
        vjdark: '#333333',
        vjamber: '#FBB612',
        vjbgs: '#E9F2FB',
        vjbrown: '#B8860B',
        vjegreen: '#7CB342',
        vjpanelblue: '#B3E5FC',
        surface: '#F7F7F7',
        primary: {
          DEFAULT: '#EC2029',
          dark: '#D91A21',
          light: '#F5717A',
          deep: '#6F0000',
          // `bg-primary-100` / `hover:bg-primary-50` được dùng ở badge và
          // nút hover; Tailwind không tự sinh bậc sáng cho màu tùy chỉnh.
          50: '#FDF0F1',
          100: '#FADADD',
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
          // ─── Token luồng đặt vé (đo 13/11/2026 từ DOM sống) ───
          // Nền ô hạng vé #F8F8F8, nền thanh mục panel #F1F1F1, chữ
          // "Hết chỗ" #939598, mã tiền tệ #6D6E71, viền header trang con
          // #E31E24, gạch chân ô nhập MUI #D9D9D9.
          'surface-fare': '#F8F8F8',
          'bar-gray': '#F1F1F1',
          'sold-out': '#939598',
          'currency-gray': '#6D6E71',
          'header-border': '#E31E24',
          'field-line': '#D9D9D9',
          // Sắc độ đo từ DOM sống của vietjetair.com (13/11/2026) — xem
          // docs/qa/VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md §2.
          // Chữ tiêu đề #1F272D, chữ phụ #6B7580, placeholder #9BA3AC.
          ink: '#1F272D',
          'field-placeholder': '#9BA3AC',
          // Xanh trời footer #0894A3.
          teal: '#0894A3',
          // Nền card ưu đãi #F3EFEC, nền pill #F3F1F1, nền điểm đến #DCE0F2.
          'card-beige': '#F3EFEC',
          pill: '#F3F1F1',
          'sky-card': '#DCE0F2',
          red: '#EC2029',
          'red-dark': '#D91A21',
          'red-deep': '#6F0000',
          yellow: '#FFDD00',
          'yellow-2': '#FBB612',
          orange: '#F4511E',
          purple: '#8075D6',
          blue: '#2563D4',
          // `vj-navy` phai khop voi bien CSS `--vj-navy: #1a2948` (xem
          // src/styles/tailwind.css) — truoc day token nay tro toi #242424
          // nen `text-vj-navy` hien sai mau so voi cac doan dung bien CSS.
          navy: '#1A2948',
          dark: '#242424',
          border: '#ececec',
          'surface-alt': '#fafafa',
          // Gradient endpoints used by the header menu bar and CTA buttons.
          'red-grad-from': '#D91A21',
          'red-grad-to': '#6F0000',
          'gold-from': '#F9A51A',
          'gold-mid': '#FBB612',
          'gold-to': '#FFDD00',
          // HeroBookingWidget (trang-chu) — sắc thái riêng của hộp tìm kiếm
          // theo ảnh tham chiếu: thân form đỏ hồng, tab vàng/đỏ đô.
          'red-panel': '#E74B55',
          'gold-hover': '#FFE04D',
          'tab-active': '#BA2D36',
          'tab-idle': '#961F27',
          'tab-idle-hover': '#A8252E',
          // Header hạng vé Business trên FlightCard (ECO dùng `success`).
          'gold-bronze': '#977B39',
          // ─── Token gom từ `bg-[#rrggbb]` (ratchet scripts/css-debt.cjs) ───
          // Mỗi sắc độ từng là một hex rải rác trong class Tailwind; gom về
          // đây để có một nguồn duy nhất và để đo nợ CSS đếm được.
          'navy-light': '#2A3F6F',
          'navy-mid': '#1E325A',
          'navy-deep': '#14203A',
          'navy-deepest': '#0F1E3A',
          'bank-blue': '#005BAA',
          'bank-blue-dark': '#004B8D',
          'pay-green': '#38B000',
          'pay-green-light': '#44BD04',
          'pay-green-dark': '#2B9300',
          'pay-green-hover': '#329E00',
          'pay-green-bright': '#70E000',
          'step-green': '#54B848',
          'text-soft': '#8C8C8C',
          'text-strong': '#4A4A4A',
          placeholder: '#B0B0B0',
          amber: '#FFA500',
          'amber-dark': '#D97706',
          'gold-deep': '#FFD100',
          'gold-ink-6': '#E6BF00',
          'surface-warm': '#FFF9E6',
          'surface-cream': '#FFFDF3',
          'surface-rose': '#FFF3F3',
          'surface-cool': '#F8F9FB',
          'blue-tint-2': '#DFF0FE',
          'blue-tint-3': '#EDF6FD',
          'blue-tint-4': '#D6EBF9',
          'blue-tint-5': '#B4DDF5',
          'blue-tint-6': '#E8F1FC',
          'rose-tint-1': '#F1E6EE',
          'rose-tint-2': '#FBEBEE',
          // Sắc độ bổ sung của nhóm trên (dùng ở trang lỗi, editor, viền mảnh).
          'border-light': '#EEEEEE',
          line: '#E0E0E0',
          'surface-dark': '#2A2D2E',
          'surface-darker': '#444444',
          'text-dim': '#666666',
          'text-faint': '#999999',
          'text-soft-strong': '#555555',
          'amber-deep': '#F59E0B',
          'amber-hover': '#E69500',
          // ─── Hệ vàng nhiều sắc độ (đo từ vietjetair.com) ───
          // Site thật KHÔNG dùng một màu `#FFDD00` đơn lẻ: chữ trên nền
          // vàng, viền khung giá và các trạng thái dùng một thang vàng riêng,
          // đậm hơn để đạt tương phản. 12 sắc dưới đây là toàn bộ tần suất
          // đo được trong main.6165d6fe.chunk.js.
          'gold-ink': '#A17F21', // 24 lần — chữ tiêu đề trên nền vàng
          'gold-ink-2': '#C99B14', // 21 lần
          'gold-ink-3': '#E9B128', // 18 lần
          'gold-ink-4': '#B78817', // 12 lần
          'gold-ink-5': '#875017', // 12 lần
          'gold-pale-1': '#FDF34F', // 18 lần
          'gold-pale-2': '#F9EA8A', // 9 lần
          'gold-pale-3': '#F8E98A', // 9 lần
          'gold-pale-4': '#ECD56A', // 9 lần
          'gold-pale-5': '#EBD673', // 9 lần
          'gold-pale-6': '#E1C34F', // 9 lần
          'gold-pale-7': '#D8B439', // 9 lần
          // Vàng active của dải dịch vụ (nav active trên site thật).
          'nav-active': '#F7C61A',
          // Vàng điểm cuối của gradient tab dịch vụ.
          'tab-gold-to': '#E9A020',
          // ─── Xanh (đo từ vietjetair.com) ───
          'blue-1': '#216BA5',
          'blue-2': '#1D5D90',
          'blue-3': '#2A87D0',
          'green-1': '#32BE3F',
          'green-2': '#3DCC4A',
          // Nền announcement bar trên site thật.
          'announce-bg': '#FDFDFD',
          // ─── Token đo từ vietjetair.com (trang con: my/search-booking, checkin) ───
          // Header trang con: nền trắng, viền dưới 2px đỏ #E31E24.
          'header-sub': '#FFFFFF',
          'header-sub-border': '#E31E24',
          // Nút pill trắng của header ("Tải ứng dụng").
          'pill-gray': '#F7F7F7',
          'pill-gray-border': '#DDDDDD',
          // Nút pill vàng ("Đăng nhập") — gradient #FFEB63 → #F5D200.
          'pill-gold-from': '#FFEB63',
          'pill-gold-to': '#F5D200',
          'pill-gold-border': '#F0CC00',
          // Chữ nav trang con #1F1F1F, chữ chính #333333.
          'nav-ink': '#1F1F1F',
          // Màu chữ của nút "Tìm kiếm" khi bị vô hiệu (MUI disabled).
          'btn-disabled-ink': '#75767A',
          // ─── Hạng vé (đo từ vietjetair.com) ───
          // Nhãn hạng vé nền đặc: Business dùng nâu-vàng, Deluxe cam, Eco xanh.
          'fare-business': '#8E7022',
          'fare-deluxe': '#FF8800',
          'fare-eco': '#388E3C',
          // Đỏ nút/tab hạng vé (khác `#EC2029` của brand — dùng cho nền đặc).
          'fare-red': '#D71920',
          // Vàng khung giá vé rẻ nhất.
          'fare-gold': '#FFC700',
        },
        // Màu xanh "Bay thẳng / thành công" dùng chung cho hạng vé ECO và
        // trạng thái hoàn tất trong luồng đặt vé/thanh toán.
        success: '#009E49',
        // Màu thương hiệu của mạng xã hội (icon chia sẻ Footer) — cố định
        // theo từng nền tảng, không phải token brand của Vietjet.
        social: {
          facebook: '#1877F2',
          'facebook-hover': '#166fe5',
          zalo: '#0068FF',
          line: '#06C755',
          youtube: '#FF0000',
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
        // ─── Bo góc chuẩn vietjetair.com ───
        // Site thật khai báo `border-radius:10px!important` trong
        // main.f5b4a549.chunk.css: 10px là bo góc chủ đạo cho field, nút và
        // panel — không phải 4px như Tailwind mặc định. Dùng token này cho
        // mọi bề mặt mới thay vì `rounded-lg` (8px) hay `rounded-xl` (12px).
        vj: '10px',
        // Bo góc riêng của booking panel và tab dịch vụ (đo từ DOM sống).
        'vj-panel': '5px',
        'vj-tab': '5px 5px 0 0',
        'vj-panel-bottom': '0 0 5px 5px',
        // Biến thể theo cạnh của token `vj` — Tailwind không tự sinh
        // `rounded-t-vj` từ `rounded-vj`.
        't-vj': '10px 10px 0 0',
        'r-vj': '0 10px 10px 0',
        'b-vj': '0 0 10px 10px',
        'l-vj': '10px 0 0 10px',
        'tl-vj': '10px 0 0 0',
        'tr-vj': '0 10px 0 0',
        'bl-vj': '0 0 0 10px',
        'br-vj': '0 0 10px 0',
        // `rounded-xs` được tham chiếu ở một vài component.
        xs: '0.125rem',
        // Bo góc thanh điều hướng dưới ở mobile: 15px 15px 0 0 (site thật).
        // Ghi dưới dạng giá trị đơn để `rounded-t-vj-bottomnav` sinh được —
        // Tailwind không nội suy được utility theo hướng với token 4 giá trị.
        'vj-bottomnav': '15px',
        // Header trang con (my/search-booking, checkin): trắng, bo góc dưới.
        'vj-header': '0 0 16px 16px',
      },
      boxShadow: {
        'vj-sm': '0 2px 8px rgba(0,0,0,0.07)',
        'vj-md': '0 4px 16px rgba(0,0,0,0.08)',
        'vj-lg': '0 8px 28px rgba(0,0,0,0.10)',
        card: '0 4px 24px rgba(0,0,0,0.08)',
        'glow-red': '0 0 20px rgba(236, 32, 41, 0.35)',
        'vj-btn': '0 2px 8px rgba(236,32,41,0.22), 0 1px 3px rgba(236,32,41,0.14)',
        'vj-btn-hover': '0 6px 20px rgba(236,32,41,0.32), 0 2px 8px rgba(236,32,41,0.18)',
        // `shadow-xs` / `shadow-2xs` được dùng ở nhiều component nhưng
        // Tailwind 3.4 chỉ có `shadow-sm` trở lên -> class không sinh CSS.
        xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
        '2xs': '0 1px 1px 0 rgba(0,0,0,0.04)',
      },
      // `drop-shadow-2xs` / `backdrop-blur-xs` cũng không tồn tại trong
      // Tailwind 3.4 nhưng được tham chiếu ở component public.
      dropShadow: {
        xs: '0 1px 1px rgba(0,0,0,0.06)',
        '2xs': '0 1px 1px rgba(0,0,0,0.05)',
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        DEFAULT: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 3px 3px rgba(0,0,0,0.12)',
        lg: '0 4px 6px rgba(0,0,0,0.15)',
        xl: '0 8px 10px rgba(0,0,0,0.20)',
        '2xl': '0 25px 50px rgba(0,0,0,0.25)',
      },
      backdropBlur: {
        xs: '1px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      backgroundImage: {
        // Gradient tokens mirroring vietjetair.com: the menu bar / date-picker
        // toolbar use the red sweep, CTA buttons use the gold sweep.
        // (gradient-vj-* là alias cũ, giữ tạm để không vỡ class đang dùng.)
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
        // ─── Gradient đo trực tiếp từ vietjetair.com (DOM sống, 13/11/2026) ───
        // Lớp tối phủ lên ảnh hero: header desktop VÀ mobile đều dùng đúng
        // lớp này, nền trong suốt — KHÔNG phải thanh đỏ.
        'gradient-vj-scrim': 'linear-gradient(rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.094) 100%)',
        // Thân booking panel (trang chủ).
        'gradient-vj-panel':
          'linear-gradient(30.3deg, rgba(217,26,33,0.73) 33.94%, #6F0000 163.23%)',
        // Tab dịch vụ active.
        'gradient-vj-tab':
          'linear-gradient(20.12deg, rgba(217,26,33,0.8) 19.6%, rgba(111,0,0,0.8) 93.86%)',
        // Tab dịch vụ màu vàng.
        'gradient-vj-gold-tab': 'linear-gradient(135deg, #FFDD00 39.58%, #E9A020 100%)',
        // CTA vàng chuẩn của site thật (nút "Tìm chuyến bay").
        'gradient-vj-gold-cta':
          'linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)',
        // Thanh điều hướng dưới ở mobile.
        'gradient-vj-bottomnav':
          'linear-gradient(rgba(0,0,0,0.8) 4.03%, rgba(0,0,0,0.153) 216.13%)',
        // Nút pill vàng của header trang con ("Đăng nhập").
        'gradient-vj-pill-gold': 'linear-gradient(rgb(255, 235, 99) 0%, rgb(245, 210, 0) 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        marquee: 'marquee 20s linear infinite',
        // Token hoat hinh dung chung cho modal / countdown.
        // `animate-scale-in` da duoc dung o `features/payments/` (vung ranh
        // gioi cung — file khong duoc sua) nen thieu token se lam class
        // bi Tailwind bo qua, khong co animation.
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    // `tailwindcss-animate` provides `animate-in`, `fade-in`, `zoom-in-95`,
    // `slide-in-from-right` … used by the drawers and admin modals. The
    // package was already a dependency but the plugin was never registered,
    // so every one of those classes was silently dropped.
    require('tailwindcss-animate'),
    // Tailwind 3.4 has no `perspective` core plugin (it only landed in v4),
    // so `perspective-1000` on the virtual credit card produced no CSS.
    // Registered here so the class generates `perspective: 1000px`.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.perspective-1000': { perspective: '1000px' },
      });
    }),
  ],
};
