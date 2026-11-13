# Số đo SkyID — Vietjet Air (13/11/2026)

Đo trực tiếp trên DOM sống của SkyID (Keycloak) do `vietjetair.com` nhúng:
- Wrapper: `https://skyjoy-authen.vietjetair.com/?client_id=c83cfb2b-443f-4982-90de-2a895928c5f9&action=signin&lang=VI`
- Form: `https://skyjoy-id.vietjetair.com/resources/zp16p/login/vietjet-air-iframe-v2/`
- CSS: `main.9f4eddd090463916a64dbff643fad43e.css`, `global.css`

Nguồn: `getComputedStyle` trên DOM sống + đọc trực tiếp bundle CSS gốc.

---

## 1. Token màu (đo được)

| Token | Giá trị | Nguồn |
|---|---|---|
| `--vj-skyid-gold` | `linear-gradient(135deg, #E99F24 0%, #FD0 100%)` | `.gid-content .btn-primary` |
| `--vj-skyid-gold-hover` | `#EDAF17` | `.gid-content .btn-primary:hover` |
| `--vj-skyid-gold-outline` | `#e99f24` | `.gid-content .btn-primary:focus` |
| `--vj-skyid-disabled-bg` | `#F5F5F5` | `.gid-content .btn-primary:disabled` |
| `--vj-skyid-disabled-ink` | `#C4C4C4` | `.gid-content .btn-primary:disabled` |
| `--vj-skyid-ink` | `#333` | `.gid-content-title`, `.form-label` |
| `--vj-skyid-ink-strong` | `#212529` | `.gid-content-phone span` |
| `--vj-skyid-muted` | `#7B7B7B` | `.gid-logo-footer-description` |
| `--vj-skyid-border` | `#E8EBEF` | `input.form-control` |
| `--vj-skyid-border-focus` | `#FFDB01` | `input.form-control:focus` |
| `--vj-skyid-border-error` | `#E60A32` | `input.form-control-error` |
| `--vj-skyid-link` | `rgb(47,107,255)` | `.gid-link` |
| `--vj-skyid-placeholder` | `#C4C4C4` | `input::placeholder` |
| `--vj-skyid-panel` | `rgba(248,248,248,.8)` | `.gid`, `.gid-header` |
| `--vj-skyid-overlay` | `rgba(0,0,0,.4)` | `.gid__wrapper-popup-bg` |

Font: `KoHo` (Google Fonts, `0,200…0,700` + italic). Nút CTA dùng `JambonoVN Medium`
(`@font-face`, file `font/JambonoVNMedium.ttf`) cho `#kc-login, #submit-button`.

---

## 2. Bố cục SkyID (form 1 cột)

| Phần tử | Số đo |
|---|---|
| `.gid__wrapper` | `100vw × 100vh`, `display:flex` |
| `.gid__wrapper-bg` | `position:fixed`, `width:576px`, `background-position:25% center`, `background-size:cover`, `pointer-events:none` — panel ảnh trái |
| `.gid__wrapper-bg .imgs .top` | `position:absolute; top:0; right:0; width:70%` |
| `.gid__wrapper-bg .imgs .bot` | `position:absolute; bottom:0; right:0; width:100%` |
| `.gid-popup` | `flex-direction:column; justify-content:space-between; align-items:center` |
| `.gid-content` | `padding:24px 34px 0`, `border-radius:0 0 16px 16px`, `text-align:center`, `box-sizing:content-box` |
| `.gid-content-title` | `font-weight:700`, `font-size:18px`, `line-height:26px`, `color:#333`, căn giữa |
| `.gid-logo` | `min-height:100px` (desktop), `70px` ≤1200px, `75px` mobile; `width:100%` |
| `.gid-logo-image-red` | `position:absolute; top:20px; left:20px` |
| `.gid-logo-image-white` | `position:fixed; bottom:20px; left:20px` |
| `.gid-logo-image-mb-right` | `position:absolute; top:0; right:0` |
| `.gid-logo-footer` | `text-align:center`, `margin-bottom:24px` |
| `.gid-logo-footer-description` | `14px/22px`, `font-weight:500`, `color:#7B7B7B`, `padding-bottom:8px` |
| `.gid-logo-footer-logo-item img` | `height:16px` (SkyJoy 80×24, Vietjet Air 140×24, GalaxyPay 90×24) |

Breakpoints:
- `max-height:800px` → `.gid__wrapper-bg { width:532px }`
- `max-width:1200px` → `.gid-logo { min-height:70px }`
- `max-width:1100px` → `.gid__wrapper-bg { width:455px }`
- mobile → `.gid-logo-image-red { width:40% }`, `.gid-logo-image-mb-right { width:50% }`

---

## 3. Form / input / button

| Phần tử | Số đo |
|---|---|
| `input.form-control` | `height:32px`, `border-radius:4px`, `font-size:16px`, `line-height:24px`, `border:1px solid #E8EBEF`, `box-shadow:0 4px 20px rgba(0,0,0,.15)`, `background:#fff`, `padding:5px 10px` |
| `input.form-control:focus` | `border-color:#FFDB01`, `box-shadow:none` |
| `input.form-control-error` | `border-color:#E60A32` |
| `input::placeholder` | `color:#C4C4C4` |
| `.form-label` (floating) | `position:absolute; left:0; top:10px; font-size:16px; font-weight:500; color:#333; line-height:12px; padding-left:10px` |
| `.iti__selected-flag` | `width:90px` |
| `.btn-primary` (nội dung) | `background:linear-gradient(135deg,#e99f24 0,#fd0 100%)`, `color:#333`, `font-size:16px`, `font-weight:400`, `border-color:transparent`, `min-width:160px`, `min-height:38px`, `max-width:232px`, `border-radius:8px!important` |
| `.btn-primary:hover` | `background-color:#EDAF17` |
| `.btn-primary:focus` | `border:2px solid #fff!important; outline:#e99f24 solid 2px; box-shadow:none` |
| `.btn-primary:disabled` | `background:#F5F5F5`, `color:#C4C4C4` |
| `.btn-submit` | `margin-top:8px` (popup), `16px` (wrapper-popup) |
| `input.pin-otp` | `height:35px`, `max-width:35px`, `text-align:center`, `padding:0`, `border-radius:11px`, nền trắng + gạch chân `linear-gradient(#000,#000) center bottom 5px/30% 2px` |
| `.gid-content-phone` | `14px/22px`, `color:#333`; `span` → `font-weight:700`, `color:#212529` |
| `.gid-resend-otp` | `14px/22px` |
| `.gid-alert` | `margin:8px 0`; `.alert-content { padding-left:26px; text-align:start }` |
| `.personal-data-sharing-consent-box` | `18×18px`, `border:2px solid #C4C4C4`, `border-radius:0`, checked → `border-radius:4px` + `ic_checked.svg` |

---

## 4. Nhúng trong `vietjetair.com` (`/vi/signin`)

| Phần tử | Số đo |
|---|---|
| Container ngoài | `622×664px`, `border-radius:10px`, `overflow:hidden` |
| Băng đỏ trên cùng | cao `48px`, `padding:0 17px`, nền `linear-gradient(rgb(217,26,33) 34.8%, rgb(171,3,3) 182.34%)`, `box-shadow:rgba(0,0,0,.21) 0 2px 6px` |
| Overlay ảnh | `linear-gradient(rgba(0,0,0,.5) 0%, rgba(0,0,0,.094) 100%)` |
| Khung iframe SkyID | `500×208px`, x=61, y=100 |
| Bottom nav | cao `62px`, `border-radius:15px 15px 0 0`, nền `linear-gradient(rgba(0,0,0,.8) 4.03%, rgba(0,0,0,.153) 216.13%)`, label `10px/700` trắng |

---

## 5. Asset chính thức (đã tải về `/tmp`)

| File | Kích thước gốc | URL |
|---|---|---|
| `sky-loy.svg` | `80×24` | `.../vietjet-air-iframe-v2/images/sky-loy.svg` |
| `vietjet-air.svg` | `140×24` | `.../vietjet-air-iframe-v2/images/vietjet-air.svg` |
| `galaxy-pay.svg` | `90×24` | `.../vietjet-air-iframe-v2/images/galaxy-pay.svg` |

`ic_checked.svg` — checkbox đã tick.
`.gid__wrapper-bg` không có ảnh tĩnh trong HTML; được set runtime qua JS
(`background-image` từ CDN) → cần chụp/tabulate từ DOM runtime khi render full-page.
