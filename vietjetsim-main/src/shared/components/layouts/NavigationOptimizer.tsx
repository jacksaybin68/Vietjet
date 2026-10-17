'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Chỉ những route tĩnh mới prefetch được. `/dat-ve` là route động (`/dat-ve/[id]`)
// nên không có trang nào để tải trước — prefetch nó trả 404 RSC trên MỌI trang.
const PREFETCH_ROUTES = ['/trang-chu', '/tim-ve', '/tai-khoan'];

export default function NavigationOptimizer() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch key routes on idle
    const prefetchKeyRoutes = () => {
      PREFETCH_ROUTES.forEach((route) => {
        router.prefetch(route);
      });
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prefetchKeyRoutes);
    } else {
      setTimeout(prefetchKeyRoutes, 2000);
    }
  }, [router]);

  return null;
}
