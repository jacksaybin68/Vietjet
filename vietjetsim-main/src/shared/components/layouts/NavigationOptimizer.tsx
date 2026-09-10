'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PREFETCH_ROUTES = ['/trang-chu', '/tim-ve', '/dat-ve', '/tai-khoan'];

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
