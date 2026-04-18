'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PREFETCH_ROUTES = ['/homepage', '/flight-booking', '/booking', '/user-dashboard'];

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
