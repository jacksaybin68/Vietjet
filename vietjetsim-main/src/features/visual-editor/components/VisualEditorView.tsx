'use client';

import { useEffect, useState } from 'react';
import VisualEditorPanel from './VisualEditorPanel';
import { fetchPageLayout } from '../services/visualEditorService';
import { defaultLayoutFor } from '../utils/layout';
import type { PageLayout } from '../types';

/**
 * Vùng trình soạn thảo trực quan của `/editor`.
 *
 * Tự nạp bố cục từ API quản trị rồi bàn giao cho `VisualEditorPanel`.
 * Nếu API lỗi thì dùng bố cục mặc định — trình soạn thảo vẫn mở được và
 * người vận hành vẫn sửa/lưu được, thay vì thấy một màn hình trắng.
 */
export default function VisualEditorView({ pagePath }: { pagePath: string }) {
  const [layout, setLayout] = useState<PageLayout>(() => defaultLayoutFor(pagePath));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPageLayout(pagePath)
      .then((response) => {
        if (cancelled) return;
        if (response?.layout) {
          setLayout(response.layout);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Không tải được bố cục đã lưu. Đang dùng bố cục mặc định.'
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pagePath]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-[#9ca3af]">
        Đang tải bố cục trang…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {loadError && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded bg-[#450a0a] px-3 py-1.5 text-xs text-[#fca5a5]">
          {loadError}
        </div>
      )}
      <VisualEditorPanel pagePath={pagePath} initialLayout={layout} />
    </div>
  );
}
