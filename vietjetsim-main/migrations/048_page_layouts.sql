-- Bố cục trang cho trình soạn thảo trực quan (/editor)
--
-- Trình soạn thảo KHÔNG ghi đè HTML của trang. Nó lưu *bố cục có kiểm soát*:
-- thứ tự các section, trạng thái hiển thị, và một danh sách style đã được
-- allow-list (padding, màu nền, max-width). Trang chủ render các component
-- React gốc theo đúng bố cục này, nên:
--   * các phép đo giao diện đối chiếu với vietjetair.com không bị phá;
--   * không có HTML do người dùng nhập được lưu và render (không có XSS).
--
-- Cột `html` được giữ lại nhưng ràng buộc CHECK luôn NULL: một sơ đồ cũ
-- từng định nghĩa nó, và việc có cột thuộc tính NULL giúp migration sau này
-- đổi ý định dễ dàng mà không phải viết lại schema.

CREATE TABLE IF NOT EXISTS page_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path VARCHAR(200) UNIQUE NOT NULL,
  layout JSONB NOT NULL DEFAULT '{"version":1,"sections":[]}'::jsonb,
  html TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT page_layouts_html_is_null CHECK (html IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_page_layouts_page_path ON page_layouts (page_path);
