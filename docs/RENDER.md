# Triển khai Vietjet Air lên Render

Tài liệu này mô tả cách deploy ứng dụng Next.js trong `vietjetsim-main/` lên Render
thông qua Blueprint [`render.yaml`](../render.yaml) ở thư mục gốc repo.

> **Đọc trước khi apply.** File `render.yaml` cố ý *không* khai báo database Render
> và cố ý để `DATABASE_URL` là `sync: false`. Hai quyết định đó không phải sơ suất —
> lý do nằm ở mục [Vì sao không có `databases:`](#vì-sao-không-có-databases).

---

## 1. Triển khai bằng một thao tác

Render đọc Blueprint trực tiếp từ repo GitHub. Mở deeplink sau (repo đã đúng
remote `origin`):

```
https://dashboard.render.com/blueprint/new?repo=https://github.com/jacksaybin68/Vietjet
```

Render sẽ:

1. Đọc `render.yaml` ở thư mục gốc repo.
2. Tạo web service `vietjet-air` (Docker runtime, region Singapore, plan starter).
3. Yêu cầu nhập các biến `sync: false` — **chỉ `DATABASE_URL` là bắt buộc**, các
   biến còn lại (SMTP, LLM key, VietQR secret) có thể để trống nếu không dùng.
4. Tự sinh `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CAPTCHA_SECRET` (`generateValue: true`).
5. Bắt đầu build.

Sau đó gán domain và bật HTTPS trong **Dashboard → Settings → Public Domain**.

### Kiểm tra Blueprint trước khi apply

```bash
render blueprints validate render.yaml
```

Lệnh này cần phiên đăng nhập Render và workspace đang hoạt động. Nếu không có
credential, validate offline bằng JSON Schema chính thức:

```bash
curl -s https://render.com/schema/render.yaml.json -o /tmp/render-schema.json
python3 -c "import json,jsonschema;jsonschema.validate(json.load(open('render.yaml')),json.load(open('/tmp/render-schema.json')))"
```

---

## 2. Những quyết định trong `render.yaml` và lý do

### `rootDir: vietjetsim-main`

App không nằm ở thư mục gốc repo mà nằm trong `vietjetsim-main/`. `rootDir` làm
cho Render cài dependency, chạy build command và resolve `dockerfilePath` /
`dockerContext` theo thư mục con đó:

- `dockerfilePath: ./Dockerfile` → `vietjetsim-main/Dockerfile`
- `dockerContext: .` → `vietjetsim-main/`

Nếu bỏ `rootDir`, Docker build sẽ không tìm thấy `package.json` và fail ở bước `npm ci`.

### Không khai báo `PORT` và `HOSTNAME`

Render tự set `PORT` (mặc định 10000) cho web service. `server.js` của Next
standalone đọc `parseInt(process.env.PORT, 10) || 3000` và
`process.env.HOSTNAME || '0.0.0.0'`.

`Dockerfile` đang pin `ENV PORT=4028` cho `docker run` local, nhưng giá trị của
Render được inject **lúc runtime** nên ghi đè giá trị trong image — container
vẫn nghe đúng port mà Render chỉ định.

`HOSTNAME` thì ngược lại: Render **không** define biến này, và `Dockerfile` pin
`HOSTNAME="0.0.0.0"` nên server bind mọi interface. Không khai báo `HOSTNAME` trong
Blueprint là chủ ý — nếu khai báo thành giá trị khác (ví dụ tên service), container
sẽ không nhận traffic.

### `healthCheckPath: /trang-chu`

`/` không dùng được làm health check: `next.config.mjs` redirect `/` → `/trang-chu`
bằng **307**, mà Render coi redirect là response không healthy.

`/trang-chu` nằm trong `PUBLIC_ROUTES` (`src/lib/route-access.ts`) nên trả về 200
mà không cần session.

### `autoDeployTrigger: checksPass`

Chỉ deploy khi CI xanh. App build lâu (Next 16 + Turbopack tracing), nên push mỗi
commit thẳng lên production là rủi ro không cần thiết.

### `maxShutdownDelaySeconds: 60`

App có SSE endpoint (`/api/sse/*`) và các connection dài hạn. Mặc định Render chỉ
cho 30 giây để request đang chạy kết thúc — đủ cho các request thường, nhưng
có thể cắt ngang luồng SSE. 60 giây là mức an toàn.

---

## 3. Database: vì sao không có `databases:` block

App **không** dùng Postgres wire protocol. Nó dùng `@neondatabase/serverless`
(`v1.0.2`) qua `neon()` trong `src/lib/neon.ts`.

Driver này nói chuyện qua **HTTP `POST /sql`**, và endpoint được suy ra từ host
trong connection string:

```
postgresql://user:pass@ep-cool-king-xyz.us-east-2.aws.neon.tech/dbname
                 → https://api.us-east-2.aws.neon.tech/sql
```

Render Postgres (`dpg-xxx.oregon.render.com`) nói chuyện qua **TCP wire protocol**.
Nếu đưa connection string của nó vào `DATABASE_URL`, driver sẽ biến thành
`https://api.oregon.render.com/sql` — sai giao thức, và mọi query sẽ fail.

Vì vậy `fromDatabase` **không dùng được** cho app này. Có ba lựa chọn:

| Lựa chọn | Đánh giá |
|---|---|
| **Giữ Neon, `DATABASE_URL` là secret** ✅ | Đây là lựa chọn trong `render.yaml`. Neon là database production sẵn có; app đã được viết cho nó; không cần thay đổi code hay chạy migration sang nơi khác. |
| Render Postgres + đổi driver sang `pg` | Cần sửa `src/lib/neon.ts` (chạm vào toàn bộ `sql` template tag), và `src/lib/db.ts` có fallback path riêng. Đây là việc refactor thật, không phải config. |
| Render Postgres + bridge HTTP→TCP | Có sẵn `scripts/neon-http-bridge.cjs` (dùng cho dev local). Nhưng đưa một proxy vào production là điểm fail mới, và repo hiện tại không có infra để monitor nó. |

`render.yaml` chọn phương án 1. Khi đó:

- `DATABASE_URL` là connection string Neon (dạng `postgresql://...neon.tech/...`).
- Giá trị này được paste một lần lúc tạo service (`sync: false` = Render hỏi, không
  tự sinh).
- **Migration không chạy tự động.** `migrations/*.sql` được áp dụng bằng `psql`
  với chế độ autocommit (xem `scripts/test-migrations.cjs`), tức là mỗi file là một
  transaction riêng. Chạy migration từ xa:

  ```bash
  cd vietjetsim-main
  for f in migrations/*.sql; do
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || break
  done
  ```

  Chạy trên máy có `psql` — **không** chạy từ trong container, vì `DATABASE_URL`
  trong container là Neon connection string và container không có `psql`.

---

## 4. Build cần `DATABASE_URL`

`src/lib/neon.ts` có check ở module scope:

```ts
if (hasRealDb) { … }
else if (process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL is required in production');
}
```

Trong lúc `next build`, Next 16 set `NODE_ENV=production` và import route module để
collect page data. Thiếu `DATABASE_URL` thì build chết với:

```
Error: Failed to collect configuration for /api/checkin
  [cause]: Error: DATABASE_URL is required in production
```

Vì vậy `Dockerfile` (stage `builder`) khai báo một placeholder **không bao giờ
tới được** database:

```dockerfile
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
```

Placeholder này chỉ cần *tồn tại*, không cần *reachable* — `neon()` chỉ tạo client,
không kết nối. Đã kiểm chứng:

- `next build` với placeholder → exit 0.
- Placeholder **không** bị inline vào bundle. Next chỉ inline biến `NEXT_PUBLIC_*`
  (`node_modules/next/dist/lib/static-env.js`), nên `DATABASE_URL` vẫn được đọc
  lúc runtime từ environment thật.

Nếu bạn build Docker **ngoài** Render (ví dụ `docker build` trên CI), image vẫn
build được mà không cần secret nào.

---

## 5. Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string Neon. Render hỏi lúc tạo service. |
| `JWT_SECRET` | ✅ (tự sinh) | `generateValue: true` sinh giá trị base64 256-bit. |
| `JWT_REFRESH_SECRET` | ✅ (tự sinh) | Như trên. |
| `CAPTCHA_SECRET` | ⬜ (tự sinh) | `src/lib/captcha.ts` fallback về `JWT_SECRET` nếu không set. Set riêng nếu đổi scheme HMAC. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | URL public **của deployment này**. Dùng cho `sitemap.ts`, `robots.ts`, `metadataBase` và link trong email. Nếu trỏ nhầm sang `https://vietjet.shop`, sitemap và link reset mật khẩu sẽ trỏ sai host. Cần sửa lại sau khi gắn custom domain. |
| `SMTP_*`, `MAIL_FROM` | ⬜ | Không set thì app log reset URL thay vì gửi mail. Xem `src/lib/mail.ts`. |
| `CODING_PI_PROVIDER` | ⬜ | `nvidia` hoặc `grok`. Mặc định `nvidia` trong blueprint. |
| `NVIDIA_API_KEY`, `XAI_API_KEY` | ⬜ | Bật `/editor`. Không có key thì `/editor` báo chưa cấu hình. |
| `VIETQR_WEBHOOK_SECRET` | ⬜ | Bắt buộc **nếu** nhận callback thanh toán thật — `src/lib/vietqr-webhook.ts` trả 503 khi thiếu secret ở production. Phải trùng giá trị với môi trường hiện tại. |

Lưu ý: `JWT_SECRET` / `JWT_REFRESH_SECRET` **không được** để trống.
`src/proxy.ts` throw lúc module load nếu `JWT_SECRET` thiếu ở production, và
`src/instrumentation.ts` fail fast lúc khởi động server.

---

## 6. Domain và HTTPS

1. Dashboard → service `vietjet-air` → **Settings → Public Domain** → gán
   `vietjet-air.onrender.com`.
2. Render cấp chứng chỉ Let's Encrypt và tự redirect HTTP → HTTPS.
3. Sau khi có domain, cập nhật `NEXT_PUBLIC_SITE_URL` trong **Environment** và
   deploy lại (biến này được đọc lúc build, nên cần **redeploy**, không phải
   restart).
4. Nếu gắn custom domain, cập nhật `NEXT_PUBLIC_SITE_URL` thành domain đó.

### Về `MAIL_SITE_URL`

`src/lib/mail.ts` ưu tiên `MAIL_SITE_URL` → `NEXT_PUBLIC_SITE_URL` → fallback.
Đặt `MAIL_SITE_URL` nếu muốn link trong email trỏ về domain chính (production
`https://vietjet.shop`) trong khi `NEXT_PUBLIC_SITE_URL` trỏ về domain preview.

---

## 7. Kiểm tra sau khi deploy

```bash
curl -i https://vietjet-air.onrender.com/trang-chu      # kỳ vọng 200
curl -i https://vietjet-air.onrender.com/                # kỳ vọng 307 → /trang-chu
curl -s https://vietjet-air.onrender.com/sitemap.xml | head
```

Trong **Render → Logs**, dòng đầu tiên của log startup phải không có
`CRITICAL: JWT_SECRET ... are not set` và không có `DATABASE_URL is required in production`.

---

## 8. Build Docker thủ công (để đối chiếu)

```bash
cd vietjetsim-main
docker build -t vietjet-air:local .
docker run --rm -p 4028:4028 \
  -e DATABASE_URL='postgresql://…neon.tech/…' \
  -e JWT_SECRET='…' -e JWT_REFRESH_SECRET='…' \
  vietjet-air:local
```

---

## 9. `.dockerignore` và dữ liệu nhạy cảm

`vietjetsim-main/database-backup/` chứa dump production:

- `neon_dump_latest.sql` (142 KB)
- `neon_dump_pre_003_020.sql` (2.1 MB)

Trong đó có dữ liệu khách hàng thật: họ tên, số điện thoại, địa chỉ, hash mật khẩu
bcrypt.

Rủi ro: Next.js standalone output tracing quét filesystem (`src/lib/openclaw/waf-solver.ts`
gọi `fs.existsSync` với path không scope tĩnh), nên **toàn bộ** workspace bị copy
vào `.next/standalone/` — kể cả các file không được import. `Dockerfile` lại copy
`.next/standalone` vào image runner. Nếu không chặn, dump này nằm trong image
production.

Đã chặn trong `vietjetsim-main/.dockerignore`:

```dockerignore
database-backup
*.sql
*.dump
pgdata
!migrations/*.sql
```

Migration vẫn được giữ lại vì `scripts/test-migrations.cjs` và job deploy cần chúng.

> Nếu một image đã được build trước khi có `.dockerignore`, image đó **vẫn chứa
> PII**. Cần build lại từ đầu (`docker build --no-cache`) và xoá image cũ.

---

## 10. Liên kết

- [`../render.yaml`](../render.yaml) — Blueprint
- [`../vietjetsim-main/Dockerfile`](../vietjetsim-main/Dockerfile) — multi-stage build
- [`../vietjetsim-main/src/lib/neon.ts`](../vietjetsim-main/src/lib/neon.ts) — driver Neon
- [`../vietjetsim-main/src/lib/route-access.ts`](../vietjetsim-main/src/lib/route-access.ts) — route public
- [`../vietjetsim-main/src/lib/vietqr-webhook.ts`](../vietjetsim-main/src/lib/vietqr-webhook.ts) — webhook thanh toán
- [`../vietjetsim-main/AGENTS.md`](../vietjetsim-main/AGENTS.md) — lệnh dev/build/test chuẩn
